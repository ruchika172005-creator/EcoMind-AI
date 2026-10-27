import random
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.iot import IoTDevice
from app.schemas.iot import IoTIngestRequest, IoTIngestReadingItem, IoTIngestResponse
from app.integrations.iot.iot_service import IoTIntegrationService

class IoTSimulator:
    """
    Multi-device Smart Meter & Sensor Simulator.
    Simulates realistic diurnal active power (kW), water consumption (m³),
    ambient temperature (°C), and anomalous peak demand surges.
    """
    @classmethod
    def generate_step(
        cls,
        db: Session,
        device_ids: Optional[List[str]] = None,
        inject_anomaly: bool = False,
        readings_per_device: int = 1
    ) -> IoTIngestResponse:
        query = db.query(IoTDevice)
        if device_ids:
            query = query.filter(IoTDevice.device_id.in_(device_ids))
        else:
            query = query.filter(IoTDevice.is_simulated == True)

        devices = query.all()
        if not devices:
            devices = db.query(IoTDevice).all()

        now = datetime.datetime.utcnow()
        hour = now.hour
        is_business_hour = (8 <= hour <= 18)

        reading_items: List[IoTIngestReadingItem] = []

        for d in devices:
            for step_idx in range(readings_per_device):
                ts = now - datetime.timedelta(minutes=(readings_per_device - step_idx - 1) * 15)

                if d.measurement_type == "ACTIVE_POWER_KW":
                    # Baseload: ~120-160 kW night, ~320-440 kW working hours
                    base = 360.0 if is_business_hour else 140.0
                    val = base + random.gauss(0, 18.0)
                    if inject_anomaly:
                        val += 220.0 # Force peak surge to trigger threshold alert (> 450 kW)
                    val = round(max(20.0, val), 1)

                elif d.measurement_type == "WATER_VOLUME_M3":
                    base = 12.0 if is_business_hour else 2.5
                    val = round(max(0.2, base + random.gauss(0, 1.2)), 2)

                elif d.measurement_type == "TEMPERATURE_C":
                    val = round(21.5 + 4.0 * random.uniform(-1, 1), 1)

                elif d.measurement_type == "CUMULATIVE_ENERGY_KWH":
                    current_cum = d.latest_value or 105000.0
                    increment = random.uniform(25.0, 75.0)
                    val = round(current_cum + increment, 1)

                else:
                    val = round(random.uniform(50.0, 150.0), 1)

                reading_items.append(IoTIngestReadingItem(
                    device_id=d.device_id,
                    facility_id=d.facility_id or "HQ-BLDG-01",
                    timestamp_utc=ts,
                    measurement_type=d.measurement_type,
                    value=val,
                    unit=d.unit,
                    provenance="Simulated",
                    external_reading_id=f"SIM-{d.device_id}-{int(ts.timestamp())}"
                ))

        ingest_req = IoTIngestRequest(readings=reading_items)
        return IoTIntegrationService.ingest_readings(db, ingest_req, source="SIMULATOR")
