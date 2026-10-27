from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class OverviewMetricsResponse(BaseModel):
    dataset_id: int
    dataset_name: str
    total_energy_kwh: float
    avg_daily_kwh: float
    peak_demand_kwh: float
    baseload_kwh: float
    total_records: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    # Active forecast run summary (if available)
    latest_forecast_kwh_next_7d: Optional[float] = None
    forecast_model_name: Optional[str] = None
    
    # Anomaly summary (if available)
    total_anomalies: int = 0
    critical_anomalies: int = 0
    
    # Carbon metrics
    emission_factor_used: float
    total_co2e_kg: float
    total_co2e_mt: float
    
    # Estimated savings opportunities
    potential_savings_kwh: float = 0.0
    potential_savings_cost: float = 0.0
    potential_savings_co2e_kg: float = 0.0

    # Enterprise Sustainability Additions
    sustainability_score: Optional[float] = None
    sustainability_grade: Optional[str] = None
    data_completeness_pct: Optional[float] = None
    erp_sync_status: Optional[str] = None
    erp_last_sync_time: Optional[datetime] = None
    iot_total_devices: int = 0
    iot_online_devices: int = 0
    iot_offline_devices: int = 0
    iot_active_alerts_count: int = 0
    water_total_m3: Optional[float] = None
    waste_total_kg: Optional[float] = None

class TimeSeriesPoint(BaseModel):
    timestamp: str
    consumption_kwh: float
    temperature_c: Optional[float] = None
    occupancy_pct: Optional[float] = None

class HourlyProfilePoint(BaseModel):
    hour: int # 0-23
    weekday_avg_kwh: float
    weekend_avg_kwh: float
    overall_avg_kwh: float

class AggregatedPoint(BaseModel):
    period: str # e.g. "2024-01" or "2024-W05" or "2024-01-15"
    total_kwh: float
    avg_kwh: float
    peak_kwh: float
    co2e_kg: float
