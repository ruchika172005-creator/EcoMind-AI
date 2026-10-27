from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.sustainability_score import SustainabilityScoreConfig, SustainabilityScoreRun
from app.schemas.sustainability_score import (
    SustainabilityScoreRunResponse,
    ScoreConfigRequest,
    ScoreConfigResponse,
    ScoreRunTriggerRequest
)
from app.services.scoring_service import SustainabilityScoringService

router = APIRouter()

@router.get("", response_model=SustainabilityScoreRunResponse)
def get_latest_sustainability_score(
    dataset_id: Optional[int] = Query(None),
    facility_id: str = Query("HQ-BLDG-01"),
    db: Session = Depends(get_db)
):
    try:
        # Check if a recent run exists
        latest_run = db.query(SustainabilityScoreRun).order_by(
            SustainabilityScoreRun.id.desc()
        ).first()

        if latest_run and (dataset_id is None or latest_run.dataset_id == dataset_id):
            return SustainabilityScoringService.get_historical_runs(db, limit=1)[0]

        # Calculate freshly
        return SustainabilityScoringService.calculate_score(
            db, dataset_id=dataset_id, facility_id=facility_id
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")

@router.post("/run", response_model=SustainabilityScoreRunResponse)
def run_sustainability_scoring(
    req: ScoreRunTriggerRequest,
    db: Session = Depends(get_db)
):
    try:
        return SustainabilityScoringService.calculate_score(
            db, dataset_id=req.dataset_id, facility_id=req.facility_id, config_id=req.config_id
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring calculation failed: {str(e)}")

@router.get("/history", response_model=List[SustainabilityScoreRunResponse])
def get_scoring_history(
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    return SustainabilityScoringService.get_historical_runs(db, limit=limit)

@router.get("/config", response_model=ScoreConfigResponse)
def get_active_scoring_config(db: Session = Depends(get_db)):
    cfg = db.query(SustainabilityScoreConfig).filter_by(is_active=True).first()
    if not cfg:
        cfg = db.query(SustainabilityScoreConfig).first()
    if not cfg:
        cfg = SustainabilityScoreConfig()
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return ScoreConfigResponse.from_orm(cfg)

@router.put("/config", response_model=ScoreConfigResponse)
def update_scoring_config(req: ScoreConfigRequest, db: Session = Depends(get_db)):
    # Validate weights
    if not SustainabilityScoringService.validate_weights(
        req.weight_environmental,
        req.weight_energy,
        req.weight_carbon,
        req.weight_water,
        req.weight_waste
    ):
        raise HTTPException(
            status_code=400,
            detail="Configured weights are invalid. All weights must be non-negative and sum to exactly 1.0 (100%)."
        )

    cfg = db.query(SustainabilityScoreConfig).filter_by(is_active=True).first()
    if not cfg:
        cfg = SustainabilityScoreConfig()
        db.add(cfg)

    cfg.name = req.name or cfg.name
    cfg.weight_environmental = req.weight_environmental
    cfg.weight_energy = req.weight_energy
    cfg.weight_carbon = req.weight_carbon
    cfg.weight_water = req.weight_water
    cfg.weight_waste = req.weight_waste
    cfg.target_energy_intensity = req.target_energy_intensity
    cfg.target_carbon_intensity = req.target_carbon_intensity
    cfg.target_water_intensity = req.target_water_intensity
    cfg.target_waste_diversion = req.target_waste_diversion
    cfg.target_anomaly_rate = req.target_anomaly_rate

    db.commit()
    db.refresh(cfg)
    return ScoreConfigResponse.from_orm(cfg)
