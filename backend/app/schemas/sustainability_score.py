from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ScoreWeightConfig(BaseModel):
    weight_environmental: float = Field(default=0.35, ge=0.0, le=1.0)
    weight_energy: float = Field(default=0.25, ge=0.0, le=1.0)
    weight_carbon: float = Field(default=0.20, ge=0.0, le=1.0)
    weight_water: float = Field(default=0.10, ge=0.0, le=1.0)
    weight_waste: float = Field(default=0.10, ge=0.0, le=1.0)
    target_energy_intensity: float = 25.0
    target_carbon_intensity: float = 9.5
    target_water_intensity: float = 1.2
    target_waste_diversion: float = 65.0
    target_anomaly_rate: float = 0.03

class MetricBreakdownItem(BaseModel):
    metric_name: str
    dimension: str # "Environmental", "Energy", "Carbon", "Water", "Waste"
    observed_value: float
    target_benchmark: float
    unit: str
    direction: str # "lower_is_better" or "higher_is_better"
    normalized_score: float # 0 - 100
    weight_in_category: float
    weighted_contribution: float
    data_status: str # "Measured", "Estimated", "Not Available"
    explanation: str

class ScoreRecommendationItem(BaseModel):
    dimension: str
    priority: str # "Critical", "High", "Medium", "Low"
    issue: str
    action: str
    potential_score_impact: float

class SustainabilityScoreRunResponse(BaseModel):
    id: int
    dataset_id: Optional[int] = None
    facility_id: Optional[str] = "HQ-BLDG-01"
    overall_score: float
    environmental_score: float
    energy_efficiency_score: float
    carbon_performance_score: float
    water_efficiency_score: Optional[float] = None
    waste_management_score: Optional[float] = None
    data_completeness_pct: float
    grade: str
    breakdown: List[MetricBreakdownItem] = []
    recommendations: List[ScoreRecommendationItem] = []
    methodology_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreConfigRequest(BaseModel):
    name: Optional[str] = "Corporate ESG & Sustainability Standard"
    weight_environmental: float = Field(ge=0.0, le=1.0)
    weight_energy: float = Field(ge=0.0, le=1.0)
    weight_carbon: float = Field(ge=0.0, le=1.0)
    weight_water: float = Field(ge=0.0, le=1.0)
    weight_waste: float = Field(ge=0.0, le=1.0)
    target_energy_intensity: float = Field(default=25.0, gt=0.0)
    target_carbon_intensity: float = Field(default=9.5, gt=0.0)
    target_water_intensity: float = Field(default=1.2, gt=0.0)
    target_waste_diversion: float = Field(default=65.0, ge=0.0, le=100.0)
    target_anomaly_rate: float = Field(default=0.03, ge=0.0, le=1.0)

class ScoreConfigResponse(BaseModel):
    id: int
    name: str
    weight_environmental: float
    weight_energy: float
    weight_carbon: float
    weight_water: float
    weight_waste: float
    target_energy_intensity: float
    target_carbon_intensity: float
    target_water_intensity: float
    target_waste_diversion: float
    target_anomaly_rate: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreRunTriggerRequest(BaseModel):
    dataset_id: Optional[int] = None
    facility_id: Optional[str] = "HQ-BLDG-01"
    config_id: Optional[int] = None
