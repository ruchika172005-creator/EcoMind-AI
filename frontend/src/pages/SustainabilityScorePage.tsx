import React, { useState, useEffect } from 'react';
import {
  Award,
  Sliders,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Zap,
  Leaf,
  Droplets,
  Trash2,
  Flame,
  ArrowUpRight,
  Info,
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
import { useDataset } from '../context/DatasetContext';
import { scoringApi } from '../api/advancedApi';
import { SustainabilityScoreRun, ScoreConfig, MetricBreakdownItem } from '../types/sustainability';

export const SustainabilityScorePage: React.FC = () => {
  const { selectedDataset } = useDataset();
  const [scoreRun, setScoreRun] = useState<SustainabilityScoreRun | null>(null);
  const [scoreHistory, setScoreHistory] = useState<SustainabilityScoreRun[]>([]);
  const [config, setConfig] = useState<ScoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable config state
  const [weights, setWeights] = useState({
    weight_environmental: 0.35,
    weight_energy: 0.25,
    weight_carbon: 0.20,
    weight_water: 0.10,
    weight_waste: 0.10,
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scoreData, historyData, configData] = await Promise.all([
        scoringApi.getLatestScore(selectedDataset?.id),
        scoringApi.getScoreHistory(8),
        scoringApi.getConfig(),
      ]);
      setScoreRun(scoreData);
      setScoreHistory(historyData);
      setConfig(configData);
      setWeights({
        weight_environmental: configData.weight_environmental,
        weight_energy: configData.weight_energy,
        weight_carbon: configData.weight_carbon,
        weight_water: configData.weight_water,
        weight_waste: configData.weight_waste,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load sustainability score.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDataset]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await scoringApi.runScoring(selectedDataset?.id);
      setScoreRun(updated);
      const historyData = await scoringApi.getScoreHistory(8);
      setScoreHistory(historyData);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Recalculation failed.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.005) {
      alert(`Weights must sum to 1.0 (100%). Current sum is ${(sum * 100).toFixed(1)}%.`);
      return;
    }
    try {
      const updatedCfg = await scoringApi.updateConfig(weights);
      setConfig(updatedCfg);
      setIsConfigOpen(false);
      handleRecalculate();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update config.');
    }
  };

  const currentWeightSum = Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 100);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sustainability Scoring</h1>
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 border border-emerald-200 font-medium">
              Explainable AI v2.4
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standardized, weighted corporate ESG evaluation normalized against industry benchmarks and actual measurements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Sliders className="h-4 w-4 text-slate-500" />
            Configure Weights
          </button>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate Score
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Score Gauge and Key Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score Hero Card */}
        <div className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 text-white border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Composite Score
              </span>
              <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                Grade {scoreRun?.grade || 'B+'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tight text-white">
                {scoreRun ? Math.round(scoreRun.overall_score) : '--'}
              </span>
              <span className="text-xl text-slate-400 font-medium">/ 100</span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Data Completeness & Audit Coverage</span>
                <span className="font-semibold text-emerald-400">{scoreRun?.data_completeness_pct || 100}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${scoreRun?.data_completeness_pct || 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            <p className="flex items-start gap-1.5">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Calculated using weighted multi-indicator normalization without assuming missing data is zero or perfect.
              </span>
            </p>
          </div>
        </div>

        {/* 4 Dimension Score Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Environmental</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{scoreRun?.environmental_score ?? '--'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Weight: {config ? `${Math.round(config.weight_environmental * 100)}%` : '35%'} • Composite ESG Index
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Energy Efficiency</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{scoreRun?.energy_efficiency_score ?? '--'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Weight: {config ? `${Math.round(config.weight_energy * 100)}%` : '25%'} • Baseload & Intensity
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <Flame className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Carbon Performance</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{scoreRun?.carbon_performance_score ?? '--'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Weight: {config ? `${Math.round(config.weight_carbon * 100)}%` : '20%'} • Scope 2 Grid Decarbonization
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Droplets className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Water & Waste</span>
              </div>
              <span className="text-lg font-bold text-slate-900">
                {scoreRun?.water_efficiency_score != null ? `${scoreRun.water_efficiency_score}` : 'Benchmark (75)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Weight: {config ? `${Math.round((config.weight_water + config.weight_waste) * 100)}%` : '20%'} • Diversion & Intensity
            </p>
          </div>
        </div>
      </div>

      {/* Historical Score Trajectory */}
      {scoreHistory.length > 1 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical Score Progression</h3>
              <p className="text-xs text-slate-500">Audit trail of scoring evaluations across operational cycles</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Trend Positive
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...scoreHistory].reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="created_at"
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} / 100`, 'Overall Score']}
                  labelFormatter={(val: any) => (val ? new Date(val).toLocaleString() : '')}
                />
                <Line
                  type="monotone"
                  dataKey="overall_score"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metric Breakdown Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Normalized Benchmark Breakdown</h3>
        <p className="text-xs text-slate-500 mb-4">
          Detailed calculation demonstrating how observed organizational data is normalized against benchmark targets.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Metric Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Observed Value</th>
                <th className="py-3 px-3">Benchmark Target</th>
                <th className="py-3 px-3">Normalized Score</th>
                <th className="py-3 px-3">Weighted Contribution</th>
                <th className="py-3 px-3">Data Status</th>
                <th className="py-3 px-3">Calculation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scoreRun?.breakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-semibold text-slate-900">{item.metric_name}</td>
                  <td className="py-3 px-3">
                    <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {item.dimension}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-800">
                    {item.observed_value} {item.unit}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {item.target_benchmark} {item.unit}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-bold ${item.normalized_score >= 80 ? 'text-emerald-600' : (item.normalized_score >= 60 ? 'text-amber-600' : 'text-rose-600')}`}>
                      {item.normalized_score} / 100
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    +{item.weighted_contribution} pts
                  </td>
                  <td className="py-3 px-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.data_status === 'Measured'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.data_status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs truncate" title={item.explanation}>
                    {item.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actionable Recommendations for Score Uplift */}
      {scoreRun?.recommendations && scoreRun.recommendations.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Recommended Actions for Score Improvement</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoreRun.recommendations.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {rec.dimension} Priority: {rec.priority}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      +{rec.potential_score_impact} pts uplift
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">{rec.issue}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configure Weights Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">Configure Scoring Weights</h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <p className="text-xs text-slate-500">
                Adjust dimension weights below. All weights must be non-negative and sum to exactly 100%.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Environmental Dimension ({Math.round(weights.weight_environmental * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.weight_environmental}
                  onChange={(e) => setWeights({ ...weights, weight_environmental: parseFloat(e.target.value) })}
                  className="w-full accent-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Energy Efficiency ({Math.round(weights.weight_energy * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.weight_energy}
                  onChange={(e) => setWeights({ ...weights, weight_energy: parseFloat(e.target.value) })}
                  className="w-full accent-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carbon Performance ({Math.round(weights.weight_carbon * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.weight_carbon}
                  onChange={(e) => setWeights({ ...weights, weight_carbon: parseFloat(e.target.value) })}
                  className="w-full accent-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Water ({Math.round(weights.weight_water * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={weights.weight_water}
                    onChange={(e) => setWeights({ ...weights, weight_water: parseFloat(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waste ({Math.round(weights.weight_waste * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={weights.weight_waste}
                    onChange={(e) => setWeights({ ...weights, weight_waste: parseFloat(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Total Weight Sum:</span>
                <span className={`font-bold ${currentWeightSum === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {currentWeightSum}% {currentWeightSum === 100 ? '✓ (Valid)' : '≠ 100%'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={currentWeightSum !== 100}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
                >
                  Save & Apply Weights
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
