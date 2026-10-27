from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.anomaly import AnomalyRun, AnomalyResult
from app.schemas.anomaly import AnomalyRunRequest, AnomalyRunResponse, AnomalyPointResponse
from app.ml.anomaly_detector import EnergyAnomalyDetector

router = APIRouter()

@router.post("/run", response_model=AnomalyRunResponse)
def run_anomaly_detection(req: AnomalyRunRequest, db: Session = Depends(get_db)):
    try:
        response = EnergyAnomalyDetector.detect_anomalies(
            db=db,
            dataset_id=req.dataset_id,
            contamination=req.contamination
        )
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")

@router.get("/runs/{dataset_id}", response_model=Optional[AnomalyRunResponse])
def get_latest_anomalies(dataset_id: int, db: Session = Depends(get_db)):
    run = db.query(AnomalyRun).filter(
        AnomalyRun.dataset_id == dataset_id
    ).order_by(AnomalyRun.id.desc()).first()
    
    if not run:
        return None
        
    results = db.query(AnomalyResult).filter(
        AnomalyResult.run_id == run.id,
        AnomalyResult.is_anomaly == True
    ).order_by(AnomalyResult.timestamp.asc()).all()
    
    return AnomalyRunResponse(
        id=run.id,
        dataset_id=run.dataset_id,
        algorithm=run.algorithm,
        contamination=run.contamination,
        total_records_analyzed=run.total_records_analyzed,
        anomalies_detected=run.anomalies_detected,
        created_at=run.created_at,
        anomalies=[
            AnomalyPointResponse(
                id=r.id,
                timestamp=r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                consumption_kwh=r.consumption_kwh,
                expected_kwh=r.expected_kwh,
                deviation_pct=round(((r.consumption_kwh - (r.expected_kwh or 1.0)) / max(1.0, r.expected_kwh or 1.0)) * 100.0, 1),
                anomaly_score=r.anomaly_score,
                is_anomaly=True,
                severity=r.severity,
                explanation=r.explanation
            )
            for r in results
        ]
    )
