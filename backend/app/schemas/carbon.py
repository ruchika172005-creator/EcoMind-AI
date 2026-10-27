from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class CarbonCalculateRequest(BaseModel):
    dataset_id: int
    emission_factor: Optional[float] = None
    factor_source: Optional[str] = None

class MonthlyCarbonItem(BaseModel):
    month: str # "YYYY-MM"
    energy_kwh: float
    emissions_kg_co2e: float
    emissions_mt_co2e: float

class CarbonCalculationResponse(BaseModel):
    id: int
    dataset_id: int
    emission_factor: float
    factor_source: str
    total_energy_kwh: float
    total_emissions_kg_co2e: float
    total_emissions_mt_co2e: float
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    
    # Equivalencies
    gasoline_gallons_equiv: float
    tree_seedlings_grown_10yr: float
    passenger_vehicle_miles: float
    homes_electricity_year: float
    
    breakdown_by_month: List[MonthlyCarbonItem] = []
    created_at: datetime

    class Config:
        from_attributes = True

class EmissionFactorOption(BaseModel):
    id: str
    name: str
    region: str
    factor_kg_co2e_per_kwh: float
    source: str
    year: int
