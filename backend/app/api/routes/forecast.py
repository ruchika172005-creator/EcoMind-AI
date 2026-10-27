import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.forecast import ForecastRun, ForecastResult
from app.schemas.forecast import ForecastRunRequest, ForecastRunResponse, ForecastPredictionPoint, ModelComparisonItem
from app.ml.forecaster import EnergyForecaster

router = APIRouter()

@router.post("/run", response_model=ForecastRunResponse)
def run_forecast(req: ForecastRunRequest, db: Session = Depends(get_db)):
    try:
        response = EnergyForecaster.train_and_forecast(
            db=db,
            dataset_id=req.dataset_id,
            model_type=req.model_type,
            horizon_hours=req.horizon_hours,
            train_split_ratio=req.train_split_ratio
        )
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")

@router.get("/runs/{dataset_id}", response_model=Optional[ForecastRunResponse])
def get_latest_forecast(dataset_id: int, db: Session = Depends(get_db)):
    run = db.query(ForecastRun).filter(
        ForecastRun.dataset_id == dataset_id
    ).order_by(ForecastRun.id.desc()).first()
    
    if not run:
        return None
        
    predictions = db.query(ForecastResult).filter(
        ForecastResult.run_id == run.id
    ).order_by(ForecastResult.timestamp.asc()).all()
    
    comp_list = []
    if run.model_comparison:
        try:
            raw_comps = json.loads(run.model_comparison)
            comp_list = [ModelComparisonItem(**item) for item in raw_comps]
        except Exception:
            pass

    return ForecastRunResponse(
        id=run.id,
        dataset_id=run.dataset_id,
        model_name=run.model_name,
        horizon_hours=run.horizon_hours,
        train_split_ratio=run.train_split_ratio,
        mae=run.mae or 0.0,
        rmse=run.rmse or 0.0,
        wape=run.wape or 0.0,
        r2=run.r2 or 0.0,
        created_at=run.created_at,
        model_comparison=comp_list,
        predictions=[
            ForecastPredictionPoint(
                timestamp=p.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                predicted_kwh=p.predicted_kwh,
                lower_bound_kwh=p.lower_bound_kwh or p.predicted_kwh * 0.9,
                upper_bound_kwh=p.upper_bound_kwh or p.predicted_kwh * 1.1,
                actual_kwh=p.actual_kwh
            )
            for p in predictions
        ]
    )
