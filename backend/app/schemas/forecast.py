from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ForecastRunRequest(BaseModel):
    dataset_id: int
    model_type: str = "xgboost" # "xgboost", "random_forest", "baseline_seasonal"
    horizon_hours: int = Field(default=168, ge=24, le=720) # 24h to 30 days
    train_split_ratio: float = Field(default=0.8, ge=0.5, le=0.95)

class ForecastPredictionPoint(BaseModel):
    timestamp: str
    predicted_kwh: float
    lower_bound_kwh: float
    upper_bound_kwh: float
    actual_kwh: Optional[float] = None

class ModelComparisonItem(BaseModel):
    model_name: str
    mae: float
    rmse: float
    wape: float
    r2: float
    is_selected: bool

class ForecastRunResponse(BaseModel):
    id: int
    dataset_id: int
    model_name: str
    horizon_hours: int
    train_split_ratio: float
    mae: float
    rmse: float
    wape: float
    r2: float
    created_at: datetime
    model_comparison: List[ModelComparisonItem] = []
    predictions: List[ForecastPredictionPoint] = []

    class Config:
        from_attributes = True
