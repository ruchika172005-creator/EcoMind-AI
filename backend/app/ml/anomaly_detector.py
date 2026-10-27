import datetime
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sklearn.ensemble import IsolationForest

from app.models.energy_record import EnergyRecord
from app.models.anomaly import AnomalyRun, AnomalyResult
from app.schemas.anomaly import AnomalyRunResponse, AnomalyPointResponse

class EnergyAnomalyDetector:
    @classmethod
    def detect_anomalies(
        cls,
        db: Session,
        dataset_id: int,
        contamination: float = 0.03
    ) -> AnomalyRunResponse:
        records = db.query(EnergyRecord).filter(
            EnergyRecord.dataset_id == dataset_id
        ).order_by(EnergyRecord.timestamp.asc()).all()
        
        if len(records) < 50:
            raise ValueError(f"Insufficient data for anomaly detection. At least 50 observations required, found {len(records)}.")
            
        data = [{
            "id": r.id,
            "timestamp": r.timestamp,
            "consumption_kwh": r.consumption_kwh,
            "hour": r.timestamp.hour,
            "dayofweek": r.timestamp.weekday(),
            "is_weekend": int(r.timestamp.weekday() >= 5)
        } for r in records]
        
        df = pd.DataFrame(data)
        
        # 1. Feature Engineering for Outlier Modeling:
        # Calculate expected baseline per (hour of day, is_weekend) combination
        baseline_map = df.groupby(["hour", "is_weekend"])["consumption_kwh"].median().to_dict()
        baseline_std_map = df.groupby(["hour", "is_weekend"])["consumption_kwh"].std().fillna(5.0).to_dict()
        
        df["expected_kwh"] = df.apply(
            lambda row: baseline_map.get((row["hour"], row["is_weekend"]), row["consumption_kwh"]),
            axis=1
        )
        df["baseline_std"] = df.apply(
            lambda row: baseline_std_map.get((row["hour"], row["is_weekend"]), 5.0),
            axis=1
        )
        
        # Deviation metrics
        df["diff_from_baseline"] = df["consumption_kwh"] - df["expected_kwh"]
        df["deviation_pct"] = (df["diff_from_baseline"] / df["expected_kwh"].replace(0, 1)) * 100.0
        
        # Rolling deviation (local contextual anomaly)
        rolling_med = df["consumption_kwh"].rolling(window=24, min_periods=1, center=True).median()
        df["rolling_diff"] = df["consumption_kwh"] - rolling_med
        
        # Features for Isolation Forest
        X_features = df[["consumption_kwh", "diff_from_baseline", "deviation_pct", "rolling_diff"]].fillna(0).values
        
        # Fit Isolation Forest
        iso_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
            max_samples="auto"
        )
        
        preds = iso_forest.fit_predict(X_features) # 1 for inlier, -1 for outlier
        decision_scores = iso_forest.decision_function(X_features) # lower score = more anomalous
        
        df["is_anomaly"] = (preds == -1)
        df["anomaly_score"] = decision_scores
        
        # Determine Severity and Explanations
        severity_list = []
        explanation_list = []
        
        for _, row in df.iterrows():
            if not row["is_anomaly"]:
                severity_list.append("Normal")
                explanation_list.append(None)
                continue
                
            dev_pct = row["deviation_pct"]
            actual = row["consumption_kwh"]
            expected = row["expected_kwh"]
            score = row["anomaly_score"]
            is_wknd = bool(row["is_weekend"])
            h = int(row["hour"])
            
            # Severity rules
            if abs(dev_pct) > 100.0 or score < -0.25:
                severity = "Critical"
            elif abs(dev_pct) > 50.0 or score < -0.15:
                severity = "High"
            elif abs(dev_pct) > 25.0:
                severity = "Medium"
            else:
                severity = "Low"
                
            severity_list.append(severity)
            
            # Statistical explanation
            day_type = "weekend" if is_wknd else "weekday"
            direction = "higher" if dev_pct > 0 else "lower"
            
            if dev_pct > 0:
                explanation = (
                    f"Consumption of {actual:.1f} kWh was {abs(dev_pct):.0f}% {direction} than "
                    f"the typical {day_type} {h:02d}:00 baseline ({expected:.1f} kWh). "
                    f"Unusual energy spike detected."
                )
            else:
                explanation = (
                    f"Consumption of {actual:.1f} kWh was {abs(dev_pct):.0f}% {direction} than "
                    f"the typical {day_type} {h:02d}:00 baseline ({expected:.1f} kWh). "
                    f"Unusual load drop detected."
                )
            explanation_list.append(explanation)
            
        df["severity"] = severity_list
        df["explanation"] = explanation_list
        
        # Filter anomaly rows for reporting
        anomaly_df = df[df["is_anomaly"]].copy()
        
        # Persist AnomalyRun
        run_record = AnomalyRun(
            dataset_id=dataset_id,
            algorithm="Isolation Forest",
            contamination=contamination,
            total_records_analyzed=len(df),
            anomalies_detected=len(anomaly_df),
            threshold_score=float(np.percentile(decision_scores, contamination * 100))
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)
        
        # Persist AnomalyResults
        results_to_insert = [
            AnomalyResult(
                run_id=run_record.id,
                timestamp=row["timestamp"],
                consumption_kwh=round(float(row["consumption_kwh"]), 2),
                expected_kwh=round(float(row["expected_kwh"]), 2),
                anomaly_score=round(float(row["anomaly_score"]), 4),
                is_anomaly=True,
                severity=row["severity"],
                explanation=row["explanation"]
            )
            for _, row in anomaly_df.iterrows()
        ]
        
        db.bulk_save_objects(results_to_insert)
        db.commit()
        
        # Prepare response
        anomaly_points = [
            AnomalyPointResponse(
                id=idx + 1,
                timestamp=row["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                consumption_kwh=round(float(row["consumption_kwh"]), 2),
                expected_kwh=round(float(row["expected_kwh"]), 2),
                deviation_pct=round(float(row["deviation_pct"]), 1),
                anomaly_score=round(float(row["anomaly_score"]), 4),
                is_anomaly=True,
                severity=row["severity"],
                explanation=row["explanation"]
            )
            for idx, (_, row) in enumerate(anomaly_df.iterrows())
        ]
        
        return AnomalyRunResponse(
            id=run_record.id,
            dataset_id=dataset_id,
            algorithm=run_record.algorithm,
            contamination=contamination,
            total_records_analyzed=len(df),
            anomalies_detected=len(anomaly_df),
            created_at=run_record.created_at,
            anomalies=anomaly_points
        )
