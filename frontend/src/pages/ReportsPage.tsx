import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Database,
  TrendingUp,
  AlertTriangle,
  Leaf,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const ReportsPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) {
      setSummary(null);
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getReportSummary(selectedDataset.id);
        setSummary(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load report summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedDataset]);

  const handlePrint = () => {
    window.print();
  };

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={FileText}
        title="No Dataset Selected"
        description="Select a dataset to compile an executive sustainability report and download verified CSV analytical exports."
      />
    );
  }

  if (loading) return <LoadingSpinner message="Compiling executive intelligence report..." />;

  const exportModules = [
    {
      id: 'energy_records',
      name: 'Validated Energy Telemetry',
      desc: 'Chronological meter readings, timestamps, temperature, and occupancy.',
      icon: Database,
    },
    {
      id: 'forecast',
      name: 'Multi-Step Forecast Results',
      desc: 'Model predictions with upper and lower bound confidence intervals.',
      icon: TrendingUp,
    },
    {
      id: 'anomalies',
      name: 'Isolation Forest Anomalies',
      desc: 'Flagged anomaly points with deviations, scores, and root-cause explanations.',
      icon: AlertTriangle,
    },
    {
      id: 'carbon',
      name: 'Carbon Accounting Breakdown',
      desc: 'Monthly Scope 2 CO2e emissions inventory and grid factor benchmarks.',
      icon: Leaf,
    },
    {
      id: 'recommendations',
      name: 'Actionable Efficiency Roadmaps',
      desc: 'Synthesized energy conservation measures with estimated annual cost & kWh savings.',
      icon: Lightbulb,
    },
  ];

  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reporting & Data Export Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Export machine learning results, telemetry, and generate printable executive sustainability summaries for{' '}
            <span className="font-semibold text-slate-700">{selectedDataset.name}</span>
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <Printer className="h-4 w-4 text-slate-600" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 print:hidden">
          {error}
        </div>
      )}

      {/* CSV Export Hub Cards */}
      <div className="print:hidden space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
          Direct Analytical CSV Exports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exportModules.map((m) => {
            const Icon = m.icon;
            const downloadUrl = api.getExportUrl(selectedDataset.id, m.id);
            return (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{m.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{m.desc}</p>
                </div>

                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable Executive Report Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                EcoMind AI Sustainability Intelligence Platform
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Executive Energy & Sustainability Audit
              </h2>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <p>Facility: {selectedDataset.name}</p>
            </div>
          </div>
        </div>

        {summary && (
          <div className="space-y-6 text-xs">
            {/* Section 1: Dataset Scope */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-100 pb-1">
                1. Dataset Telemetry Scope
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Consumption</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {summary.dataset.total_consumption_kwh.toLocaleString()} kWh
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Average Hourly Load</span>
                  <p className="font-semibold text-slate-800">
                    {summary.dataset.avg_consumption_kwh.toFixed(1)} kWh
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Peak Demand</span>
                  <p className="font-semibold text-slate-800">
                    {summary.dataset.max_consumption_kwh.toFixed(1)} kWh
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Observations</span>
                  <p className="font-semibold text-slate-800">
                    {summary.dataset.row_count.toLocaleString()} readings
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Machine Learning Forecast */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-100 pb-1">
                2. Supervised Forecasting Evaluation
              </h3>
              {summary.forecast ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Active Model</span>
                    <p className="font-semibold text-slate-900">{summary.forecast.model_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">MAE Error</span>
                    <p className="font-semibold text-slate-800">{summary.forecast.mae?.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">RMSE Error</span>
                    <p className="font-semibold text-slate-800">{summary.forecast.rmse?.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Model Fit (R²)</span>
                    <p className="font-semibold text-slate-800">{summary.forecast.r2?.toFixed(3)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No forecast run executed yet.</p>
              )}
            </div>

            {/* Section 3: Anomaly & Risk Detection */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-100 pb-1">
                3. Anomaly & Load Risk Assessment
              </h3>
              {summary.anomaly ? (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Ensemble Algorithm</span>
                    <p className="font-semibold text-slate-900">{summary.anomaly.algorithm}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Contamination Rate</span>
                    <p className="font-semibold text-slate-800">{(summary.anomaly.contamination * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Detected Anomalies</span>
                    <p className="font-bold text-amber-700">{summary.anomaly.anomalies_detected} events</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No anomaly detection run executed yet.</p>
              )}
            </div>

            {/* Section 4: Carbon Footprint */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-100 pb-1">
                4. Scope 2 Carbon Impact
              </h3>
              {summary.carbon ? (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Emissions</span>
                    <p className="font-bold text-emerald-800 text-sm">
                      {summary.carbon.total_emissions_mt_co2e} MT CO2e
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Emission Factor</span>
                    <p className="font-semibold text-slate-800">
                      {summary.carbon.emission_factor} kg CO2e/kWh
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Tree Seedlings Equiv.</span>
                    <p className="font-semibold text-slate-800">
                      {summary.carbon.tree_seedlings_grown_10yr?.toLocaleString()} seedlings (10 yr)
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No carbon calculation executed yet.</p>
              )}
            </div>

            {/* Section 5: Recommendations Summary */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-100 pb-1">
                5. High-Impact Energy Efficiency Measures
              </h3>
              {summary.recommendations && summary.recommendations.items.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pb-1">
                    <span>
                      {summary.recommendations.count} Measures Identified • Potential Annual Cost Savings: $
                      {summary.recommendations.total_savings_cost.toLocaleString()}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {summary.recommendations.items.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{r.title}</span>
                            <Badge label={r.priority} />
                          </div>
                          <p className="text-slate-600 mt-0.5 text-[11px]">{r.suggested_action}</p>
                        </div>
                        {r.expected_savings_cost && (
                          <div className="text-right shrink-0">
                            <span className="font-bold text-emerald-700">
                              ${r.expected_savings_cost.toLocaleString()}/yr
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No recommendations generated yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
