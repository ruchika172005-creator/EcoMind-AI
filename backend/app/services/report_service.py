import os
import io
import csv
import json
import datetime
from typing import Optional, Dict, Any, List
import pandas as pd
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.models.dataset import Dataset
from app.models.energy_record import EnergyRecord
from app.models.forecast import ForecastRun, ForecastResult
from app.models.anomaly import AnomalyRun, AnomalyResult
from app.models.carbon import CarbonCalculation
from app.models.recommendation import Recommendation

class ReportService:
    @staticmethod
    def export_csv(db: Session, dataset_id: int, module: str) -> StreamingResponse:
        """Generates streaming CSV file for a given module."""
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found.")
            
        output = io.StringIO()
        writer = csv.writer(output)
        
        filename = f"{dataset.name.replace(' ', '_')}_{module}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
        
        if module == "energy_records":
            writer.writerow(["Timestamp", "Energy_Consumption_kWh", "Building_ID", "Temperature_C", "Occupancy_Pct", "Is_Weekend"])
            records = db.query(EnergyRecord).filter(
                EnergyRecord.dataset_id == dataset_id
            ).order_by(EnergyRecord.timestamp.asc()).all()
            for r in records:
                writer.writerow([
                    r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    r.consumption_kwh,
                    r.building_id or "",
                    r.temperature_c if r.temperature_c is not None else "",
                    r.occupancy_pct if r.occupancy_pct is not None else "",
                    r.is_weekend
                ])
                
        elif module == "forecast":
            writer.writerow(["Timestamp", "Predicted_kWh", "Lower_Bound_kWh", "Upper_Bound_kWh", "Actual_kWh"])
            latest_run = db.query(ForecastRun).filter(
                ForecastRun.dataset_id == dataset_id
            ).order_by(ForecastRun.id.desc()).first()
            if latest_run:
                preds = db.query(ForecastResult).filter(
                    ForecastResult.run_id == latest_run.id
                ).order_by(ForecastResult.timestamp.asc()).all()
                for p in preds:
                    writer.writerow([
                        p.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        p.predicted_kwh,
                        p.lower_bound_kwh,
                        p.upper_bound_kwh,
                        p.actual_kwh if p.actual_kwh is not None else ""
                    ])
                    
        elif module == "anomalies":
            writer.writerow(["Timestamp", "Consumption_kWh", "Expected_Baseline_kWh", "Anomaly_Score", "Severity", "Explanation"])
            latest_run = db.query(AnomalyRun).filter(
                AnomalyRun.dataset_id == dataset_id
            ).order_by(AnomalyRun.id.desc()).first()
            if latest_run:
                anomalies = db.query(AnomalyResult).filter(
                    AnomalyResult.run_id == latest_run.id
                ).order_by(AnomalyResult.timestamp.asc()).all()
                for a in anomalies:
                    writer.writerow([
                        a.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        a.consumption_kwh,
                        a.expected_kwh,
                        a.anomaly_score,
                        a.severity,
                        a.explanation or ""
                    ])
                    
        elif module == "carbon":
            writer.writerow(["Month", "Energy_kWh", "Emissions_kg_CO2e", "Emissions_MT_CO2e", "Grid_Emission_Factor_kg_per_kWh"])
            calc = db.query(CarbonCalculation).filter(
                CarbonCalculation.dataset_id == dataset_id
            ).order_by(CarbonCalculation.id.desc()).first()
            if calc and calc.breakdown_by_month:
                months = json.loads(calc.breakdown_by_month)
                for m in months:
                    writer.writerow([
                        m["month"],
                        m["energy_kwh"],
                        m["emissions_kg_co2e"],
                        m["emissions_mt_co2e"],
                        calc.emission_factor
                    ])
                    
        elif module == "recommendations":
            writer.writerow(["ID", "Title", "Category", "Priority", "Expected_Savings_kWh", "Expected_Savings_USD", "Expected_Savings_CO2e_kg", "Suggested_Action", "Evidence", "Status"])
            recs = db.query(Recommendation).filter(
                Recommendation.dataset_id == dataset_id
            ).order_by(Recommendation.id.asc()).all()
            for r in recs:
                writer.writerow([
                    r.id,
                    r.title,
                    r.category,
                    r.priority,
                    r.expected_savings_kwh,
                    r.expected_savings_cost,
                    r.expected_savings_co2e_kg,
                    r.suggested_action,
                    r.evidence,
                    r.status
                ])
        else:
            raise ValueError(f"Unknown export module: {module}")
            
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    @staticmethod
    def get_comprehensive_summary(db: Session, dataset_id: int) -> Dict[str, Any]:
        """Gathers data across all modules for the reporting view."""
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found.")
            
        forecast_run = db.query(ForecastRun).filter(
            ForecastRun.dataset_id == dataset_id
        ).order_by(ForecastRun.id.desc()).first()
        
        anomaly_run = db.query(AnomalyRun).filter(
            AnomalyRun.dataset_id == dataset_id
        ).order_by(AnomalyRun.id.desc()).first()
        
        carbon_calc = db.query(CarbonCalculation).filter(
            CarbonCalculation.dataset_id == dataset_id
        ).order_by(CarbonCalculation.id.desc()).first()
        
        recs = db.query(Recommendation).filter(
            Recommendation.dataset_id == dataset_id
        ).all()
        
        return {
            "dataset": {
                "id": dataset.id,
                "name": dataset.name,
                "row_count": dataset.row_count,
                "start_time": dataset.start_time.isoformat() if dataset.start_time else None,
                "end_time": dataset.end_time.isoformat() if dataset.end_time else None,
                "total_consumption_kwh": dataset.total_consumption_kwh,
                "avg_consumption_kwh": dataset.avg_consumption_kwh,
                "min_consumption_kwh": dataset.min_consumption_kwh,
                "max_consumption_kwh": dataset.max_consumption_kwh,
                "is_demo": dataset.is_demo
            },
            "forecast": {
                "model_name": forecast_run.model_name if forecast_run else None,
                "horizon_hours": forecast_run.horizon_hours if forecast_run else None,
                "mae": forecast_run.mae if forecast_run else None,
                "rmse": forecast_run.rmse if forecast_run else None,
                "wape": forecast_run.wape if forecast_run else None,
                "r2": forecast_run.r2 if forecast_run else None,
            } if forecast_run else None,
            "anomaly": {
                "algorithm": anomaly_run.algorithm if anomaly_run else None,
                "contamination": anomaly_run.contamination if anomaly_run else None,
                "anomalies_detected": anomaly_run.anomalies_detected if anomaly_run else 0,
            } if anomaly_run else None,
            "carbon": {
                "emission_factor": carbon_calc.emission_factor if carbon_calc else None,
                "factor_source": carbon_calc.factor_source if carbon_calc else None,
                "total_emissions_mt_co2e": carbon_calc.total_emissions_mt_co2e if carbon_calc else None,
                "tree_seedlings_grown_10yr": carbon_calc.tree_seedlings_grown_10yr if carbon_calc else None,
            } if carbon_calc else None,
            "recommendations": {
                "count": len(recs),
                "total_savings_kwh": sum(r.expected_savings_kwh or 0 for r in recs),
                "total_savings_cost": sum(r.expected_savings_cost or 0 for r in recs),
                "total_savings_co2e_kg": sum(r.expected_savings_co2e_kg or 0 for r in recs),
                "items": [
                    {
                        "id": r.id,
                        "title": r.title,
                        "priority": r.priority,
                        "category": r.category,
                        "expected_savings_cost": r.expected_savings_cost,
                        "suggested_action": r.suggested_action
                    }
                    for r in recs
                ]
            }
        }
