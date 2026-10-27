import React, { useState, useEffect } from 'react';
import {
  Radio,
  Cpu,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Plus,
  RefreshCw,
  Bell,
  Check,
  Droplets,
  Thermometer,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { iotApi } from '../api/advancedApi';
import { IoTDevice, IoTMeterReading, IoTAlert, IoTHealth } from '../types/iot';

export const IoTDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [readings, setReadings] = useState<IoTMeterReading[]>([]);
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [health, setHealth] = useState<IoTHealth | null>(null);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newDeviceData, setNewDeviceData] = useState({
    device_id: '',
    name: '',
    facility_id: 'HQ-BLDG-01',
    device_type: 'ELECTRIC_SMART_METER',
    measurement_type: 'ACTIVE_POWER_KW',
    unit: 'kW',
    protocol: 'HTTP',
    is_simulated: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [devs, reads, alrts, hlth] = await Promise.all([
        iotApi.getDevices(),
        iotApi.getReadings(selectedDeviceFilter === 'ALL' ? undefined : selectedDeviceFilter, 100),
        iotApi.getAlerts(false, 30),
        iotApi.getHealth(),
      ]);
      setDevices(devs);
      setReadings(reads);
      setAlerts(alrts);
      setHealth(hlth);
    } catch (err: any) {
      console.error('Failed to load IoT data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeviceFilter]);

  const handleSimulate = async (action: 'step' | 'burst', injectAnomaly = false) => {
    setIsSimulating(true);
    try {
      const res = await iotApi.triggerSimulator(action, injectAnomaly);
      if (injectAnomaly) {
        alert(`Anomaly Peak Surge injected! Instantaneous active load exceeded safety ceiling. Triggered ${res.alerts_triggered_count} critical threshold alerts.`);
      }
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Simulator trigger failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await iotApi.resolveAlert(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a)));
    } catch (err: any) {
      alert('Failed to resolve alert.');
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceData.device_id || !newDeviceData.name) {
      alert('Device ID and name are required.');
      return;
    }
    try {
      await iotApi.registerDevice(newDeviceData);
      setRegisterModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Registration failed.');
    }
  };

  // Prepare chart series (chronological order)
  const chartData = [...readings].reverse().map((r) => ({
    time: new Date(r.timestamp_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: r.value,
    unit: r.unit,
    device: r.device_id,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">IoT & Smart Meter Telemetry</h1>
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 border border-emerald-200 font-medium">
              Edge Telemetry Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time ingestion for digital power meters, submeter CTs, pulse water counters, and ambient sensors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Plus className="h-4 w-4 text-slate-500" />
            Register Device
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Live Poll
          </button>
        </div>
      </div>

      {/* Simulator Control & Telemetry KPI Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Simulator Control Panel */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Smart Meter Simulator
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                Local Sandbox Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Publish synthetic high-frequency active power readings to test telemetry processing, threshold alarms, and anomaly pipelines.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulate('step', false)}
              disabled={isSimulating}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              Generate Step (1x)
            </button>
            <button
              onClick={() => handleSimulate('burst', false)}
              disabled={isSimulating}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              Burst Ingest (5x)
            </button>
            <button
              onClick={() => handleSimulate('step', true)}
              disabled={isSimulating}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Simulates an extreme load spike > 450 kW to trigger threshold alerts"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Inject Peak Surge (&gt; 450 kW)
            </button>
          </div>
        </div>

        {/* Telemetry Status Cards */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Device Fleet</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">{health?.total_devices ?? devices.length}</span>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-emerald-600 font-bold">{health?.online_devices ?? devices.length} Online</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600 font-medium">{health?.offline_devices ?? 0} Offline</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">HTTP API & MQTT v2 Ingestion active</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Edge Alerts</span>
            <Bell className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">
              {alerts.filter((a) => !a.is_resolved).length}
            </span>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              {alerts.filter((a) => !a.is_resolved && a.severity === 'CRITICAL').length} Critical Threshold Breaches
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Automated peak load protection</p>
        </div>
      </div>

      {/* Live Active Power Stream Chart */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Meter Telemetry Stream</h3>
            <p className="text-xs text-slate-500">
              Instantaneous power readings (kW) with distinct measurement units from energy accumulation (kWh)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Device:</span>
            <select
              value={selectedDeviceFilter}
              onChange={(e) => setSelectedDeviceFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border-slate-300 py-1.5 pl-2.5 pr-8 bg-white"
            >
              <option value="ALL">All Registered Devices</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.name} ({d.device_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No telemetry received yet. Click "Generate Step" in the simulator above.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [`${val} ${item.payload.unit}`, item.payload.device]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Threshold Alerts Table */}
      {alerts.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Active Peak Demand & Threshold Alerts</h3>
            </div>
            <span className="text-xs text-slate-400">
              {alerts.filter((a) => !a.is_resolved).length} unresolved alerts
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {alerts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className={`p-3.5 flex items-center justify-between ${
                  a.is_resolved ? 'bg-slate-50/50 opacity-60' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      a.severity === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{a.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{a.device_id}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          a.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{a.description}</p>
                    <span className="text-[10px] text-slate-400">
                      Triggered {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  {a.is_resolved ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveAlert(a.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Registry Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Registered IoT Smart Meters & Sensors</h3>
        <p className="text-xs text-slate-500 mb-4">
          Device inventory with measurement types, protocol bindings, and physical verification states.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Device Identifier</th>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Device Type</th>
                <th className="py-3 px-3">Measurement</th>
                <th className="py-3 px-3">Protocol</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Latest Value</th>
                <th className="py-3 px-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.device_id}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{d.name}</td>
                  <td className="py-3 px-3 text-slate-600">{d.device_type}</td>
                  <td className="py-3 px-3">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                      {d.measurement_type} ({d.unit})
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{d.protocol}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.connection_status === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.connection_status === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {d.connection_status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {d.latest_value != null ? `${d.latest_value} ${d.unit}` : '--'}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {d.last_seen_at ? new Date(d.last_seen_at).toLocaleTimeString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New Device Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Register New IoT Smart Meter</h3>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device ID / Serial Number</label>
                <input
                  type="text"
                  required
                  value={newDeviceData.device_id}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, device_id: e.target.value.toUpperCase() })}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 font-mono shadow-sm"
                  placeholder="e.g. MTR-BLDG2-MAIN"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Friendly Name</label>
                <input
                  type="text"
                  required
                  value={newDeviceData.name}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, name: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                  placeholder="e.g. Building 2 Electric Main Feeder"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Measurement Type</label>
                  <select
                    value={newDeviceData.measurement_type}
                    onChange={(e) => {
                      const mType = e.target.value;
                      const unit = mType === 'ACTIVE_POWER_KW' ? 'kW' : mType === 'CUMULATIVE_ENERGY_KWH' ? 'kWh' : mType === 'WATER_VOLUME_M3' ? 'm³' : '°C';
                      setNewDeviceData({ ...newDeviceData, measurement_type: mType, unit });
                    }}
                    className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                  >
                    <option value="ACTIVE_POWER_KW">Instantaneous Power (kW)</option>
                    <option value="CUMULATIVE_ENERGY_KWH">Cumulative Energy (kWh)</option>
                    <option value="WATER_VOLUME_M3">Water Volume (m³)</option>
                    <option value="TEMPERATURE_C">Temperature (°C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Protocol</label>
                  <select
                    value={newDeviceData.protocol}
                    onChange={(e) => setNewDeviceData({ ...newDeviceData, protocol: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                  >
                    <option value="HTTP">HTTP Rest Ingest</option>
                    <option value="MQTT">MQTT Telemetry Topic</option>
                    <option value="MODBUS_GATEWAY">Modbus TCP Gateway</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
