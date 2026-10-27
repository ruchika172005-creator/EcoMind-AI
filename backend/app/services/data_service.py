import os
import uuid
import json
import datetime
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.dataset import Dataset
from app.models.energy_record import EnergyRecord
from app.schemas.dataset import CSVPreviewResponse, DataQualityReport, DataQualityIssue

class DataService:
    @staticmethod
    def inspect_csv(file_bytes: bytes, filename: str) -> CSVPreviewResponse:
        """Saves file temporarily and returns preview and column suggestions."""
        temp_id = str(uuid.uuid4())
        temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{temp_id}_{filename}")
        
        with open(temp_path, "wb") as f:
            f.write(file_bytes)
            
        try:
            df = pd.read_csv(temp_path, nrows=500)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise ValueError(f"Could not parse CSV file: {str(e)}")
            
        columns = [str(c).strip() for c in df.columns]
        
        # Suggest column mappings
        suggested_ts = None
        suggested_energy = None
        suggested_bldg = None
        suggested_temp = None
        suggested_occ = None
        
        for c in columns:
            c_lower = c.lower()
            if not suggested_ts and any(k in c_lower for k in ["time", "date", "timestamp", "datetime"]):
                suggested_ts = c
            elif not suggested_energy and any(k in c_lower for k in ["kwh", "energy", "consumption", "power", "meter_reading", "usage"]):
                suggested_energy = c
            elif not suggested_bldg and any(k in c_lower for k in ["bldg", "building", "facility", "site", "meter"]):
                suggested_bldg = c
            elif not suggested_temp and any(k in c_lower for k in ["temp", "temperature", "weather", "deg"]):
                suggested_temp = c
            elif not suggested_occ and any(k in c_lower for k in ["occupancy", "occupant", "people"]):
                suggested_occ = c
                
        # Perform initial data quality check
        issues: List[DataQualityIssue] = []
        missing_ts = 0
        missing_val = 0
        neg_val = 0
        dup_ts = 0
        
        if suggested_ts and suggested_ts in df.columns:
            missing_ts = int(df[suggested_ts].isna().sum())
            dup_ts = int(df[suggested_ts].duplicated().sum())
            if missing_ts > 0:
                issues.append(DataQualityIssue(
                    issue_type="Missing Timestamps",
                    description=f"{missing_ts} rows have missing timestamp values in sample preview.",
                    count=missing_ts,
                    severity="warning"
                ))
            if dup_ts > 0:
                issues.append(DataQualityIssue(
                    issue_type="Duplicate Timestamps",
                    description=f"{dup_ts} rows have duplicate timestamp entries.",
                    count=dup_ts,
                    severity="warning"
                ))
                
        if suggested_energy and suggested_energy in df.columns:
            # check numeric conversion
            numeric_col = pd.to_numeric(df[suggested_energy], errors='coerce')
            missing_val = int(numeric_col.isna().sum())
            neg_val = int((numeric_col < 0).sum())
            if missing_val > 0:
                issues.append(DataQualityIssue(
                    issue_type="Missing/Non-numeric Consumption",
                    description=f"{missing_val} rows have null or invalid numeric consumption values.",
                    count=missing_val,
                    severity="warning"
                ))
            if neg_val > 0:
                issues.append(DataQualityIssue(
                    issue_type="Negative Consumption",
                    description=f"{neg_val} rows have negative kWh values which will be clipped.",
                    count=neg_val,
                    severity="warning"
                ))

        # Detect estimated frequency
        detected_freq = "hourly"
        if suggested_ts and len(df) >= 3:
            try:
                parsed_dates = pd.to_datetime(df[suggested_ts].dropna().head(10), errors='coerce')
                diffs = parsed_dates.diff().dropna().dt.total_seconds()
                median_seconds = diffs.median()
                if 50 <= median_seconds <= 70:
                    detected_freq = "minutely"
                elif 800 <= median_seconds <= 1000:
                    detected_freq = "15-minute"
                elif 3400 <= median_seconds <= 3800:
                    detected_freq = "hourly"
                elif 80000 <= median_seconds <= 90000:
                    detected_freq = "daily"
            except Exception:
                detected_freq = "hourly"

        sample_rows = df.head(10).replace({np.nan: None}).to_dict(orient="records")
        
        quality_report = DataQualityReport(
            total_rows=len(df),
            missing_timestamp_count=missing_ts,
            missing_value_count=missing_val,
            negative_values_count=neg_val,
            duplicate_timestamps_count=dup_ts,
            detected_frequency=detected_freq,
            issues=issues
        )
        
        return CSVPreviewResponse(
            filename=filename,
            temp_file_id=temp_id,
            total_rows_preview=len(df),
            columns=columns,
            sample_rows=sample_rows,
            suggested_timestamp_col=suggested_ts,
            suggested_energy_col=suggested_energy,
            suggested_building_col=suggested_bldg,
            suggested_temperature_col=suggested_temp,
            suggested_occupancy_col=suggested_occ,
            quality_report=quality_report
        )

    @staticmethod
    def process_and_save_dataset(
        db: Session,
        temp_file_id: str,
        name: str,
        ts_col: str,
        energy_col: str,
        building_col: Optional[str] = None,
        temp_col: Optional[str] = None,
        occ_col: Optional[str] = None,
        missing_strategy: str = "interpolate",
        is_demo: bool = False
    ) -> Dataset:
        """Processes the full CSV, applies imputation and validation, and inserts records into DB."""
        temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
        matching_files = [f for f in os.listdir(temp_dir) if f.startswith(f"{temp_file_id}_")]
        if not matching_files:
            raise FileNotFoundError("Temporary uploaded file not found or expired. Please upload again.")
            
        temp_path = os.path.join(temp_dir, matching_files[0])
        original_filename = matching_files[0].split(f"{temp_file_id}_", 1)[1]
        
        # Read full file
        df = pd.read_csv(temp_path)
        
        if ts_col not in df.columns or energy_col not in df.columns:
            raise ValueError(f"Specified columns {ts_col} or {energy_col} do not exist in dataset.")
            
        # Parse timestamps
        df["parsed_timestamp"] = pd.to_datetime(df[ts_col], errors='coerce')
        # Drop rows with invalid timestamps
        df = df.dropna(subset=["parsed_timestamp"])
        
        # Sort chronologically
        df = df.sort_values(by="parsed_timestamp")
        
        # Deduplicate timestamps keeping first
        df = df.drop_duplicates(subset=["parsed_timestamp"], keep="first")
        
        # Clean energy consumption
        df["clean_kwh"] = pd.to_numeric(df[energy_col], errors='coerce')
        
        # Handle missing consumption values
        if missing_strategy == "drop":
            df = df.dropna(subset=["clean_kwh"])
        elif missing_strategy == "forward_fill":
            df["clean_kwh"] = df["clean_kwh"].ffill().bfill().fillna(0.0)
        else: # interpolate
            df["clean_kwh"] = df["clean_kwh"].interpolate(method="linear").ffill().bfill().fillna(0.0)
            
        # Clip negative readings to 0
        df["clean_kwh"] = df["clean_kwh"].clip(lower=0.0)
        
        if len(df) == 0:
            raise ValueError("No valid records remain after processing and cleaning.")
            
        # Persistent storage file
        dest_filename = f"{uuid.uuid4().hex[:8]}_{original_filename}"
        dest_path = os.path.join(settings.UPLOAD_DIR, dest_filename)
        df.to_csv(dest_path, index=False)
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except Exception:
            pass

        # Compute summary metrics
        total_kwh = float(df["clean_kwh"].sum())
        avg_kwh = float(df["clean_kwh"].mean())
        min_kwh = float(df["clean_kwh"].min())
        max_kwh = float(df["clean_kwh"].max())
        start_time = df["parsed_timestamp"].min().to_pydatetime()
        end_time = df["parsed_timestamp"].max().to_pydatetime()
        
        # Column mapping metadata
        mapping_dict = {
            "timestamp": ts_col,
            "energy_consumption_kwh": energy_col,
            "building_id": building_col,
            "temperature_c": temp_col,
            "occupancy_pct": occ_col,
        }
        
        dataset = Dataset(
            name=name,
            filename=original_filename,
            file_path=dest_path,
            row_count=len(df),
            start_time=start_time,
            end_time=end_time,
            total_consumption_kwh=round(total_kwh, 2),
            avg_consumption_kwh=round(avg_kwh, 2),
            min_consumption_kwh=round(min_kwh, 2),
            max_consumption_kwh=round(max_kwh, 2),
            is_demo=is_demo,
            column_mapping=json.dumps(mapping_dict),
            data_frequency="hourly"
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        # Bulk insert records in batches
        records_to_insert = []
        for _, row in df.iterrows():
            ts: datetime.datetime = row["parsed_timestamp"].to_pydatetime()
            bldg = str(row[building_col]) if building_col and building_col in df.columns and pd.notna(row[building_col]) else None
            temp_val = float(row[temp_col]) if temp_col and temp_col in df.columns and pd.notna(row[temp_col]) else None
            occ_val = float(row[occ_col]) if occ_col and occ_col in df.columns and pd.notna(row[occ_col]) else None
            
            records_to_insert.append(EnergyRecord(
                dataset_id=dataset.id,
                timestamp=ts,
                consumption_kwh=float(row["clean_kwh"]),
                building_id=bldg,
                temperature_c=temp_val,
                occupancy_pct=occ_val,
                hour_of_day=ts.hour,
                day_of_week=ts.weekday(),
                month=ts.month,
                is_weekend=(ts.weekday() >= 5)
            ))
            
            if len(records_to_insert) >= 2000:
                db.bulk_save_objects(records_to_insert)
                db.commit()
                records_to_insert = []
                
        if records_to_insert:
            db.bulk_save_objects(records_to_insert)
            db.commit()
            
        return dataset

    @staticmethod
    def load_demo_dataset(db: Session) -> Dataset:
        """Loads the pre-packaged sample dataset into the database as demo data."""
        sample_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "sample", "commercial_campus_energy_hourly.csv"))
        if not os.path.exists(sample_path):
            raise FileNotFoundError(f"Sample data file not found at {sample_path}")
            
        with open(sample_path, "rb") as f:
            content = f.read()
            
        preview = DataService.inspect_csv(content, "commercial_campus_energy_hourly.csv")
        dataset = DataService.process_and_save_dataset(
            db=db,
            temp_file_id=preview.temp_file_id,
            name="Commercial Campus Energy (Demo)",
            ts_col="timestamp",
            energy_col="energy_consumption_kwh",
            building_col="building_id",
            temp_col="temperature_c",
            occ_col="occupancy_pct",
            missing_strategy="interpolate",
            is_demo=True
        )
        return dataset

    @staticmethod
    def delete_dataset(db: Session, dataset_id: int) -> bool:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return False
            
        # Remove file from disk
        if dataset.file_path and os.path.exists(dataset.file_path):
            try:
                os.remove(dataset.file_path)
            except Exception:
                pass
                
        db.delete(dataset)
        db.commit()
        return True
