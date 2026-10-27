from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator

class IoTDeviceResponse(BaseModel):
    id: int
    device_id: str
    name: str
    facility_id: str
    device_type: str
    measurement_type: str
    unit: str
    protocol: str
    connection_status: str
    last_seen_at: Optional[datetime] = None
    latest_value: Optional[float] = None
    is_simulated: bool
    configuration_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class IoTDeviceCreateRequest(BaseModel):
    device_id: str
    name: str
    facility_id: str = "HQ-BLDG-01"
    device_type: str = "ELECTRIC_SMART_METER"
    measurement_type: str = "ACTIVE_POWER_KW"
    unit: str = "kW"
    protocol: str = "HTTP"
    is_simulated: bool = False
    configuration_json: Optional[str] = None

class IoTIngestReadingItem(BaseModel):
    device_id: str
    facility_id: Optional[str] = "HQ-BLDG-01"
    timestamp_utc: datetime
    measurement_type: str # "ACTIVE_POWER_KW", "CUMULATIVE_ENERGY_KWH", "WATER_VOLUME_M3", "TEMPERATURE_C"
    value: float
    unit: str # "kW", "kWh", "m³", "°C"
    external_reading_id: Optional[str] = None
    provenance: Optional[str] = "Measured"

    @validator('unit')
    def validate_unit(cls, v, values):
        m_type = values.get('measurement_type')
        if m_type == 'ACTIVE_POWER_KW' and v.lower() != 'kw':
            raise ValueError("Measurement type ACTIVE_POWER_KW requires unit 'kW'. Do not confuse instantaneous power (kW) with cumulative energy (kWh).")
        if m_type == 'CUMULATIVE_ENERGY_KWH' and v.lower() != 'kwh':
            raise ValueError("Measurement type CUMULATIVE_ENERGY_KWH requires unit 'kWh'.")
        return v

    @validator('value')
    def validate_value(cls, v, values):
        m_type = values.get('measurement_type')
        # Negative power or energy is rejected unless solar net-metering specified
        if m_type in ['ACTIVE_POWER_KW', 'CUMULATIVE_ENERGY_KWH', 'WATER_VOLUME_M3'] and v < 0:
            raise ValueError(f"Value cannot be negative for physical meter measurement: {v}")
        return v

class IoTIngestRequest(BaseModel):
    readings: List[IoTIngestReadingItem]

class IoTIngestResponse(BaseModel):
    status: str
    accepted_count: int
    rejected_count: int
    duplicates_count: int
    alerts_triggered_count: int
    details: List[str] = []

class IoTMeterReadingResponse(BaseModel):
    id: int
    device_id: str
    facility_id: str
    timestamp_utc: datetime
    measurement_type: str
    value: float
    unit: str
    quality_status: str
    source: str
    provenance: str
    received_at: datetime

    class Config:
        from_attributes = True

class IoTAlertResponse(BaseModel):
    id: int
    device_id: str
    facility_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    unit: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class IoTSimulatorControlRequest(BaseModel):
    action: str # "step", "burst", "inject_spike"
    device_ids: Optional[List[str]] = None
    readings_per_device: int = 1
    inject_anomaly: bool = False
