import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, Index
from app.db.session import Base

class IoTDevice(Base):
    __tablename__ = "iot_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False, index=True) # e.g. "MTR-BLDG1-MAIN"
    name = Column(String(255), nullable=False)
    facility_id = Column(String(100), default="HQ-BLDG-01", index=True)
    
    device_type = Column(String(50), nullable=False) # "ELECTRIC_SMART_METER", "ELECTRIC_SUBMETER", "WATER_FLOW_METER", "GAS_METER", "TEMPERATURE_SENSOR"
    measurement_type = Column(String(50), nullable=False) # "ACTIVE_POWER_KW", "CUMULATIVE_ENERGY_KWH", "WATER_VOLUME_M3", "TEMPERATURE_C"
    unit = Column(String(20), nullable=False) # "kW", "kWh", "m³", "°C"
    protocol = Column(String(50), default="HTTP") # "HTTP", "MQTT", "MODBUS_GATEWAY"
    
    connection_status = Column(String(50), default="ONLINE") # "ONLINE", "OFFLINE", "WARNING"
    last_seen_at = Column(DateTime, nullable=True)
    latest_value = Column(Float, nullable=True)
    is_simulated = Column(Boolean, default=False)
    configuration_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class IoTMeterReading(Base):
    __tablename__ = "iot_meter_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    facility_id = Column(String(100), default="HQ-BLDG-01", index=True)
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    
    measurement_type = Column(String(50), nullable=False) # "ACTIVE_POWER_KW", "CUMULATIVE_ENERGY_KWH", etc.
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    quality_status = Column(String(50), default="VALID") # "VALID", "SUSPECT", "INTERPOLATED", "OUT_OF_RANGE"
    
    source = Column(String(50), default="HTTP_INGEST") # "HTTP_INGEST", "MQTT_BROKER", "SIMULATOR"
    provenance = Column(String(50), default="Measured") # "Measured", "Simulated", "Estimated"
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    external_reading_id = Column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_iot_device_ts", "device_id", "timestamp_utc", unique=True),
    )


class IoTAlert(Base):
    __tablename__ = "iot_alerts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    facility_id = Column(String(100), default="HQ-BLDG-01", index=True)
    
    alert_type = Column(String(50), nullable=False) # "THRESHOLD_BREACH", "DEVICE_OFFLINE", "SPIKE_DETECTED", "DATA_QUALITY_ISSUE"
    severity = Column(String(50), default="HIGH") # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    threshold_value = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    unit = Column(String(20), nullable=True)
    
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
