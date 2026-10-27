export interface IoTDevice {
  id: number;
  device_id: string;
  name: string;
  facility_id: string;
  device_type: 'ELECTRIC_SMART_METER' | 'ELECTRIC_SUBMETER' | 'WATER_FLOW_METER' | 'GAS_METER' | 'TEMPERATURE_SENSOR';
  measurement_type: 'ACTIVE_POWER_KW' | 'CUMULATIVE_ENERGY_KWH' | 'WATER_VOLUME_M3' | 'TEMPERATURE_C';
  unit: string;
  protocol: 'HTTP' | 'MQTT' | 'MODBUS_GATEWAY';
  connection_status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  last_seen_at?: string | null;
  latest_value?: number | null;
  is_simulated: boolean;
  configuration_json?: string | null;
  created_at: string;
}

export interface IoTMeterReading {
  id: number;
  device_id: string;
  facility_id: string;
  timestamp_utc: string;
  measurement_type: string;
  value: number;
  unit: string;
  quality_status: 'VALID' | 'SUSPECT' | 'INTERPOLATED' | 'OUT_OF_RANGE';
  source: string;
  provenance: string;
  received_at: string;
}

export interface IoTAlert {
  id: number;
  device_id: string;
  facility_id: string;
  alert_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  threshold_value?: number | null;
  actual_value?: number | null;
  unit?: string | null;
  is_resolved: boolean;
  resolved_at?: string | null;
  created_at: string;
}

export interface IoTHealth {
  status: string;
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices: number;
  unresolved_alerts: number;
  mqtt_enabled: boolean;
  mqtt_connected: boolean;
}
