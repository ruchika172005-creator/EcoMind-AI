from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.iot import IoTDevice, IoTMeterReading, IoTAlert
from app.schemas.iot import (
    IoTDeviceResponse,
    IoTDeviceCreateRequest,
    IoTIngestRequest,
    IoTIngestResponse,
    IoTMeterReadingResponse,
    IoTAlertResponse,
    IoTSimulatorControlRequest
)
from app.integrations.iot.iot_service import IoTIntegrationService
from app.integrations.iot.simulator import IoTSimulator
from app.integrations.iot.mqtt_client import mqtt_service

router = APIRouter()

@router.get("/devices", response_model=List[IoTDeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    return IoTIntegrationService.get_devices(db)

@router.post("/devices", response_model=IoTDeviceResponse)
def register_device(req: IoTDeviceCreateRequest, db: Session = Depends(get_db)):
    try:
        return IoTIntegrationService.register_device(db, req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/ingest", response_model=IoTIngestResponse)
def ingest_readings(
    req: IoTIngestRequest,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    # Authenticate API Key if configured
    if settings.IOT_API_KEY and x_api_key != settings.IOT_API_KEY:
        # In development allow without key if x_api_key is omitted, but reject invalid key
        if x_api_key is not None and x_api_key != settings.IOT_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid IoT Ingestion API Key.")

    return IoTIntegrationService.ingest_readings(db, req, source="HTTP_INGEST")

@router.get("/readings", response_model=List[IoTMeterReadingResponse])
def get_readings(
    device_id: Optional[str] = Query(None),
    facility_id: Optional[str] = Query(None),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db)
):
    return IoTIntegrationService.get_readings(
        db, device_id=device_id, facility_id=facility_id, limit=limit
    )

@router.get("/alerts", response_model=List[IoTAlertResponse])
def get_alerts(
    unresolved_only: bool = Query(default=False),
    limit: int = Query(default=50),
    db: Session = Depends(get_db)
):
    return IoTIntegrationService.get_alerts(
        db, unresolved_only=unresolved_only, limit=limit
    )

@router.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    success = IoTIntegrationService.resolve_alert(db, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return {"status": "success", "alert_id": alert_id, "resolved": True}

@router.post("/simulator/step", response_model=IoTIngestResponse)
def trigger_simulator(
    req: IoTSimulatorControlRequest,
    db: Session = Depends(get_db)
):
    return IoTSimulator.generate_step(
        db,
        device_ids=req.device_ids,
        inject_anomaly=req.inject_anomaly,
        readings_per_device=req.readings_per_device
    )

@router.get("/health")
def iot_subsystem_health(db: Session = Depends(get_db)):
    devices = IoTIntegrationService.get_devices(db)
    online_count = sum(1 for d in devices if d.connection_status == "ONLINE")
    offline_count = sum(1 for d in devices if d.connection_status == "OFFLINE")
    warning_count = sum(1 for d in devices if d.connection_status == "WARNING")
    unresolved_alerts = db.query(IoTAlert).filter(IoTAlert.is_resolved == False).count()

    return {
        "status": "healthy",
        "total_devices": len(devices),
        "online_devices": online_count,
        "offline_devices": offline_count,
        "warning_devices": warning_count,
        "unresolved_alerts": unresolved_alerts,
        "mqtt_enabled": settings.MQTT_ENABLED,
        "mqtt_connected": getattr(mqtt_service, "is_connected", False)
    }
