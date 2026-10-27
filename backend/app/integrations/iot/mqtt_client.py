import json
import logging
import datetime
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("ecomind.mqtt")

try:
    import paho.mqtt.client as mqtt
    HAS_PAHO_MQTT = True
except ImportError:
    HAS_PAHO_MQTT = False

class MQTTMeterSubscriber:
    """
    Paho MQTT v2 client managing subscription to smart-meter telemetry topics.
    Safely reconnects on broker dropouts, validates incoming payloads, and stores readings.
    """
    def __init__(self):
        self.client: Optional[Any] = None
        self.is_connected: bool = False
        self.broker_host = settings.MQTT_BROKER_HOST
        self.broker_port = settings.MQTT_BROKER_PORT
        self.topic_pattern = f"{settings.MQTT_TOPIC_PREFIX}/#"

    def on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.is_connected = True
            logger.info(f"Connected to MQTT Broker at {self.broker_host}:{self.broker_port}")
            client.subscribe(self.topic_pattern)
            logger.info(f"Subscribed to topic pattern: {self.topic_pattern}")
        else:
            self.is_connected = False
            logger.warning(f"Failed to connect to MQTT broker, return code: {rc}")

    def on_disconnect(self, client, userdata, rc, properties=None):
        self.is_connected = False
        logger.warning(f"Disconnected from MQTT broker with code: {rc}. Auto-reconnect active.")

    def on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            
            # Extract meter payload attributes
            device_id = data.get("device_id")
            if not device_id:
                # Derive from topic e.g. ecomind/meters/MTR-01/power
                parts = msg.topic.split("/")
                if len(parts) >= 3:
                    device_id = parts[2]

            if not device_id:
                logger.warning(f"MQTT message missing device_id on topic {msg.topic}")
                return

            val = float(data.get("value", 0.0))
            unit = data.get("unit", "kW")
            m_type = data.get("measurement_type", "ACTIVE_POWER_KW")

            from app.db.session import SessionLocal
            from app.schemas.iot import IoTIngestRequest, IoTIngestReadingItem
            from app.integrations.iot.iot_service import IoTIntegrationService

            db = SessionLocal()
            try:
                reading_item = IoTIngestReadingItem(
                    device_id=device_id,
                    facility_id=data.get("facility_id", "HQ-BLDG-01"),
                    timestamp_utc=datetime.datetime.utcnow(),
                    measurement_type=m_type,
                    value=val,
                    unit=unit,
                    provenance="Measured"
                )
                ingest_req = IoTIngestRequest(readings=[reading_item])
                IoTIntegrationService.ingest_readings(db, ingest_req, source="MQTT_BROKER")
                logger.info(f"Successfully processed MQTT reading for {device_id}: {val} {unit}")
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error parsing MQTT message on topic {msg.topic}: {e}")

    def start(self):
        if not HAS_PAHO_MQTT or not settings.MQTT_ENABLED:
            logger.info("MQTT client is disabled in configuration.")
            return

        try:
            # Paho MQTT 2.x CallbackAPIVersion
            try:
                self.client = mqtt.Client(
                    mqtt.CallbackAPIVersion.VERSION2,
                    client_id=settings.MQTT_CLIENT_ID
                )
            except AttributeError:
                self.client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)

            if settings.MQTT_USERNAME:
                self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
            self.client.on_message = self.on_message

            self.client.connect_async(self.broker_host, self.broker_port, 60)
            self.client.loop_start()
            logger.info("MQTT background loop started.")
        except Exception as e:
            logger.warning(f"Could not start MQTT client: {e}")

    def stop(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False

mqtt_service = MQTTMeterSubscriber()
