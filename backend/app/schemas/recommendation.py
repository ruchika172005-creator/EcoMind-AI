from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RecommendationResponse(BaseModel):
    id: int
    dataset_id: int
    title: str
    category: str
    priority: str # "Critical", "High", "Medium", "Low"
    evidence: str
    calculation_details: str
    suggested_action: str
    limitations: Optional[str] = None
    expected_savings_kwh: Optional[float] = None
    expected_savings_cost: Optional[float] = None
    expected_savings_co2e_kg: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationUpdateRequest(BaseModel):
    status: str # "New", "In Review", "Implemented", "Dismissed"

class RecommendationSummaryResponse(BaseModel):
    total_recommendations: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_potential_kwh_savings: float
    total_potential_cost_savings: float
    total_potential_co2e_kg_savings: float
    recommendations: List[RecommendationResponse] = []
