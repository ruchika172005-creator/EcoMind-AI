import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.iot import IoTDevice, IoTMeterReading, IoTAlert
from app.schemas.iot import (
    IoTDeviceResponse,
    IoTDeviceCreateRequest,
    IoTIngestRequest,
    IoTIngestResponse,
    IoTMeterReadingResponse,
    IoTAlertResponse
)

class IoTIntegrationService:
    @staticmethod
    def register_device(db: Session, req: IoTDeviceCreateRequest) -> IoTDeviceResponse:
        existing = db.query(IoTDevice).filter_by(device_id=req.device_id).first()
        if existing:
            raise ValueError(f"Device with ID '{req.device_id}' already registered.")

        device = IoTDevice(
            device_id=req.device_id,
            name=req.name,
            facility_id=req.facility_id,
            device_type=req.device_type,
            measurement_type=req.measurement_type,
            unit=req.unit,
            protocol=req.protocol,
            connection_status="ONLINE",
            is_simulated=req.is_simulated,
            configuration_json=req.configuration_json
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        return IoTDeviceResponse.from_orm(device)

    @classmethod
    def ingest_readings(
        cls,
        db: Session,
        req: IoTIngestRequest,
        source: str = "HTTP_INGEST"
    ) -> IoTIngestResponse:
        accepted = 0
        rejected = 0
        duplicates = 0
        alerts_triggered = 0
        details = []

        now = datetime.datetime.utcnow()

        for item in req.readings:
            # 1. Check device existence
            device = db.query(IoTDevice).filter_by(device_id=item.device_id).first()
            if not device:
                # Auto-register if not existing
                device = IoTDevice(
                    device_id=item.device_id,
                    name=f"Smart Meter {item.device_id}",
                    facility_id=item.facility_id or "HQ-BLDG-01",
                    device_type="ELECTRIC_SMART_METER" if item.unit in ("kW", "kWh") else "WATER_FLOW_METER",
                    measurement_type=item.measurement_type,
                    unit=item.unit,
                    protocol="HTTP" if source == "HTTP_INGEST" else "MQTT",
                    connection_status="ONLINE",
                    is_simulated=(item.provenance == "Simulated")
                )
                db.add(device)
                db.commit()
                db.refresh(device)

            # 2. Check for duplicate reading (same device and timestamp)
            existing_reading = db.query(IoTMeterReading).filter_by(
                device_id=item.device_id,
                timestamp_utc=item.timestamp_utc
            ).first()

            if existing_reading:
                duplicates += 1
                details.append(f"Duplicate reading for device {item.device_id} at {item.timestamp_utc} skipped.")
                continue

            # 3. Quality & Range checks
            quality = "VALID"
            if item.value > 10000.0 or item.value < 0:
                quality = "OUT_OF_RANGE"

            # 4. Save reading
            reading = IoTMeterReading(
                device_id=item.device_id,
                facility_id=item.facility_id or device.facility_id or "HQ-BLDG-01",
                timestamp_utc=item.timestamp_utc,
                measurement_type=item.measurement_type,
                value=item.value,
                unit=item.unit,
                quality_status=quality,
                source=source,
                provenance=item.provenance or ("Simulated" if device.is_simulated else "Measured"),
                received_at=now,
                external_reading_id=item.external_reading_id
            )
            db.add(reading)

            # 5. Update device state
            device.last_seen_at = now
            device.latest_value = item.value
            device.connection_status = "ONLINE"

            # 6. Check Threshold Alerts
            alarm_threshold = 450.0 # Default 450 kW peak demand alarm
            if device.configuration_json:
                try:
                    cfg = json.loads(device.configuration_json)
                    if "alarm_threshold_kw" in cfg and item.unit == "kW":
                        alarm_threshold = float(cfg["alarm_threshold_kw"])
                except Exception:
                    pass

            if item.unit == "kW" and item.value > alarm_threshold:
                alert = IoTAlert(
                    device_id=device.device_id,
                    facility_id=device.facility_id,
                    alert_type="THRESHOLD_BREACH",
                    severity="CRITICAL" if item.value > (alarm_threshold * 1.25) else "HIGH",
                    title=f"Peak Demand Alert on {device.name}",
                    description=f"Instantaneous active load reached {item.value:.1f} kW, exceeding configured safety ceiling of {alarm_threshold:.1f} kW.",
                    threshold_value=alarm_threshold,
                    actual_value=item.value,
                    unit="kW"
                )
                db.add(alert)
                alerts_triggered += 1

            accepted += 1

        db.commit()

        return IoTIngestResponse(
            status="SUCCESS" if accepted > 0 else "NO_RECORDS_INGESTED",
            accepted_count=accepted,
            rejected_count=rejected,
            duplicates_count=duplicates,
            alerts_triggered_count=alerts_triggered,
            details=details
        )

    @staticmethod
    def get_devices(db: Session) -> List[IoTDeviceResponse]:
        # Check for devices that haven't sent a reading in > 48 hours to update status to OFFLINE
        devices = db.query(IoTDevice).order_by(IoTDevice.id.asc()).all()
        now = datetime.datetime.utcnow()
        for d in devices:
            if d.last_seen_at and (now - d.last_seen_at).total_seconds() > 172800:
                if d.connection_status == "ONLINE":
                    d.connection_status = "OFFLINE"
        db.commit()
        return [IoTDeviceResponse.from_orm(d) for d in devices]

    @staticmethod
    def get_readings(
        db: Session,
        device_id: Optional[str] = None,
        facility_id: Optional[str] = None,
        limit: int = 100
    ) -> List[IoTMeterReadingResponse]:
        query = db.query(IoTMeterReading)
        if device_id:
            query = query.filter(IoTMeterReading.device_id == device_id)
        if facility_id and facility_id != "All Facilities":
            query = query.filter(IoTMeterReading.facility_id == facility_id)
            
        readings = query.order_by(IoTMeterReading.timestamp_utc.desc()).limit(limit).all()
        return [IoTMeterReadingResponse.from_orm(r) for r in readings]

    @staticmethod
    def get_alerts(
        db: Session,
        unresolved_only: bool = False,
        limit: int = 50
    ) -> List[IoTAlertResponse]:
        query = db.query(IoTAlert)
        if unresolved_only:
            query = query.filter(IoTAlert.is_resolved == False)
        alerts = query.order_by(IoTAlert.created_at.desc()).limit(limit).all()
        return [IoTAlertResponse.from_orm(a) for a in alerts]

    @staticmethod
    def resolve_alert(db: Session, alert_id: int) -> bool:
        alert = db.query(IoTAlert).filter_by(id=alert_id).first()
        if not alert:
            return False
        alert.is_resolved = True
        alert.resolved_at = datetime.datetime.utcnow()
        db.commit()
        return True
