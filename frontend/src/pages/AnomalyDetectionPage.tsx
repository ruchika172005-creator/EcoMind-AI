import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Filter,
  Eye,
  Info,
  Layers,
  Activity,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type { AnomalyRunResponse, AnomalyPointResponse, TimeSeriesPoint } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const AnomalyDetectionPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const [anomalyRun, setAnomalyRun] = useState<AnomalyRunResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [contamination, setContamination] = useState<number>(0.02); // 2%
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyPointResponse | null>(null);

  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) {
      setAnomalyRun(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [runRes, tsRes] = await Promise.all([
          api.getLatestAnomalies(selectedDataset.id),
          api.getTimeseries(selectedDataset.id, 500),
        ]);
        setAnomalyRun(runRes);
        setTimeseries(tsRes);
      } catch (err: any) {
        console.error('Error fetching anomalies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDataset]);

  const handleRunDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;

    setRunning(true);
    setError(null);
    try {
      const res = await api.runAnomalies({
        dataset_id: selectedDataset.id,
        contamination,
      });
      setAnomalyRun(res);
    } catch (err: any) {
      setError(err.message || 'Anomaly detection execution failed.');
    } finally {
      setRunning(false);
    }
  };

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No Dataset Selected"
        description="Select a dataset to run Scikit-Learn Isolation Forest and uncover unusual power spikes, sensor drops, and out-of-schedule loads."
      />
    );
  }

  const anomalies = anomalyRun?.anomalies || [];
  const criticalCount = anomalies.filter((a) => a.severity === 'Critical').length;
  const highCount = anomalies.filter((a) => a.severity === 'High').length;
  const mediumCount = anomalies.filter((a) => a.severity === 'Medium').length;
  const lowCount = anomalies.filter((a) => a.severity === 'Low').length;

  const filteredAnomalies =
    severityFilter === 'ALL'
      ? anomalies
      : anomalies.filter((a) => a.severity.toUpperCase() === severityFilter);

  // Overlay anomalies onto timeseries for scatter chart
  const anomalyTimestamps = new Set(anomalies.map((a) => a.timestamp));
  const overlayData = timeseries.map((pt) => {
    const isAnom = anomalyTimestamps.has(pt.timestamp);
    return {
      timestamp: pt.timestamp.split(' ')[0].slice(5),
      fullTimestamp: pt.timestamp,
      consumption: pt.consumption_kwh,
      anomalyConsumption: isAnom ? pt.consumption_kwh : null,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Isolation Forest Anomaly Detection
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detecting multivariate unusual energy deviations, equipment faults, and out-of-hours consumption for{' '}
            <span className="font-semibold text-slate-700">{selectedDataset.name}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleRunDetection} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Anomaly Detection Algorithm
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800">
              Isolation Forest (Scikit-Learn Ensemble)
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Contamination Parameter: {(contamination * 100).toFixed(1)}%
              </label>
              <span className="text-[10px] text-slate-400">Target anomaly ratio</span>
            </div>
            <select
              value={contamination}
              onChange={(e) => setContamination(parseFloat(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value={0.01}>1.0% (Strict - High Confidence Spikes)</option>
              <option value={0.02}>2.0% (Balanced Sensitivity)</option>
              <option value={0.03}>3.0% (Comprehensive)</option>
              <option value={0.05}>5.0% (Broad Anomaly Scan)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={running}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{running ? 'Fitting Isolation Forest...' : 'Run Anomaly Detection'}</span>
            </button>
          </div>
        </form>
      </div>

      {loading && !running && <LoadingSpinner message="Loading anomaly results..." />}

      {anomalyRun && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Anomalies"
              value={anomalyRun.anomalies_detected}
              unit={`/ ${anomalyRun.total_records_analyzed.toLocaleString()}`}
              icon={AlertTriangle}
              subtitle={`${((anomalyRun.anomalies_detected / anomalyRun.total_records_analyzed) * 100).toFixed(2)}% of observations`}
              color="amber"
            />
            <KPICard
              title="Critical Severity"
              value={criticalCount}
              unit="events"
              icon={AlertCircle}
              subtitle="Major deviations needing immediate review"
              color="amber"
            />
            <KPICard
              title="High Severity"
              value={highCount}
              unit="events"
              icon={Activity}
              subtitle="Repeated off-hours surges"
              color="blue"
            />
            <KPICard
              title="Contamination Fit"
              value={`${(anomalyRun.contamination * 100).toFixed(1)}%`}
              unit=""
              icon={CheckCircle2}
              subtitle="Isolation Forest contamination factor"
              color="emerald"
            />
          </div>

          {/* Anomaly Scatter Plot on Time Series */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detected Anomalies Overlay on Energy Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Red circular markers highlight statistically anomalous observations flagged by the ensemble
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Normal Consumption
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-red-200" /> Anomaly Event
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={overlayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    unit=" kWh"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                    formatter={(val: any, name: any) => [`${val} kWh`, name]}
                  />
                  <Line
                    type="monotone"
                    name="Normal Load"
                    dataKey="consumption"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Scatter
                    name="Anomaly Event"
                    dataKey="anomalyConsumption"
                    fill="#EF4444"
                    stroke="#B91C1C"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomaly Inspection Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chronological Anomaly Registry ({filteredAnomalies.length} Records)
                </h3>
                <p className="text-xs text-slate-500">
                  Ranked observations with deviation from baseline and diagnostic explanation
                </p>
              </div>

              {/* Severity Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Observed Load</th>
                    <th className="py-3 px-3">Expected Baseline</th>
                    <th className="py-3 px-3">Deviation %</th>
                    <th className="py-3 px-3">Anomaly Score</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Diagnostic Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnomalies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No anomalies match the selected severity filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAnomalies.map((anom) => (
                      <tr
                        key={anom.id}
                        onClick={() => setSelectedAnomaly(anom)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-medium text-slate-900">
                          {anom.timestamp}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {anom.consumption_kwh.toFixed(1)} kWh
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {anom.expected_kwh ? `${anom.expected_kwh.toFixed(1)} kWh` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-red-600">
                          {anom.deviation_pct != null
                            ? `${anom.deviation_pct > 0 ? '+' : ''}${anom.deviation_pct.toFixed(1)}%`
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {anom.anomaly_score.toFixed(3)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge label={anom.severity} />
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {anom.explanation || 'Statistical deviation from expected diurnal pattern'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!anomalyRun && !loading && (
        <EmptyState
          icon={AlertTriangle}
          title="No Anomaly Analysis Available"
          description="Click 'Run Anomaly Detection' to fit the Isolation Forest model on historical observations and flag suspicious load spikes."
          actionText="Run Isolation Forest"
          onAction={() => handleRunDetection({ preventDefault: () => {} } as any)}
          showDemoButton={false}
        />
      )}

      {/* Anomaly Inspection Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Anomaly Diagnostic Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Timestamp</span>
                  <p className="font-semibold text-slate-900">{selectedAnomaly.timestamp}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Severity</span>
                  <div><Badge label={selectedAnomaly.severity} /></div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Observed Load</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedAnomaly.consumption_kwh.toFixed(1)} kWh</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Expected Baseline</span>
                  <p className="font-medium text-slate-700">{selectedAnomaly.expected_kwh?.toFixed(1) || 'N/A'} kWh</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800">Diagnostic Root-Cause Explanation:</span>
                <p className="mt-1 text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                  {selectedAnomaly.explanation}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-200/60 text-blue-800 text-[11px] flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Note:</strong> Statistical anomalies indicate readings that diverge significantly from standard diurnal cycles. They should be corroborated with facility operations logs before declaring equipment fault.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
