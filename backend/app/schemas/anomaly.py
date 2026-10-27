from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class AnomalyRunRequest(BaseModel):
    dataset_id: int
    contamination: float = Field(default=0.03, ge=0.005, le=0.15) # 0.5% to 15%

class AnomalyPointResponse(BaseModel):
    id: int
    timestamp: str
    consumption_kwh: float
    expected_kwh: Optional[float] = None
    deviation_pct: Optional[float] = None
    anomaly_score: float
    is_anomaly: bool
    severity: str
    explanation: Optional[str] = None

class AnomalyRunResponse(BaseModel):
    id: int
    dataset_id: int
    algorithm: str
    contamination: float
    total_records_analyzed: int
    anomalies_detected: int
    created_at: datetime
    anomalies: List[AnomalyPointResponse] = []

    class Config:
        from_attributes = True
