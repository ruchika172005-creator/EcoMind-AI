import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sliders,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  BarChart2,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type { ForecastRunResponse, TimeSeriesPoint } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const ForecastingPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const [forecastRun, setForecastRun] = useState<ForecastRunResponse | null>(null);
  const [modelType, setModelType] = useState<string>('random_forest');
  const [horizonHours, setHorizonHours] = useState<number>(168); // 7 days
  const [trainSplit, setTrainSplit] = useState<number>(0.8);

  const [training, setTraining] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) {
      setForecastRun(null);
      return;
    }

    const fetchLatest = async () => {
      setLoading(true);
      setError(null);
      try {
        const latest = await api.getLatestForecast(selectedDataset.id);
        setForecastRun(latest);
      } catch (err: any) {
        console.error('Error fetching latest forecast:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, [selectedDataset]);

  const handleRunForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;

    setTraining(true);
    setError(null);
    try {
      const res = await api.runForecast({
        dataset_id: selectedDataset.id,
        model_type: modelType,
        horizon_hours: horizonHours,
        train_split_ratio: trainSplit,
      });
      setForecastRun(res);
    } catch (err: any) {
      setError(err.message || 'Forecasting model execution failed.');
    } finally {
      setTraining(false);
    }
  };

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Dataset Selected"
        description="Select a dataset to train supervised machine learning forecasters and project future consumption with confidence intervals."
      />
    );
  }

  // Format chart data
  const chartData = forecastRun?.predictions.map((p) => ({
    timestamp: p.timestamp.slice(5, 16), // "MM-DD HH:mm"
    predicted: p.predicted_kwh,
    lower: p.lower_bound_kwh,
    upper: p.upper_bound_kwh,
    actual: p.actual_kwh,
    range: [p.lower_bound_kwh, p.upper_bound_kwh],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Machine Learning Energy Forecasting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Time-aware multi-step forecasting with baseline benchmarking and prediction intervals for{' '}
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

      {/* Model Controls Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleRunForecast} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Forecasting Model Architecture
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="random_forest">Random Forest Regressor (Scikit-Learn)</option>
              <option value="xgboost">XGBoost Gradient Boosted Trees</option>
              <option value="seasonal_naive">Seasonal Naive Baseline (Lag-168)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Forecast Horizon
            </label>
            <select
              value={horizonHours}
              onChange={(e) => setHorizonHours(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value={24}>24 Hours (Next 1 Day)</option>
              <option value={72}>72 Hours (Next 3 Days)</option>
              <option value={168}>168 Hours (Next 7 Days)</option>
              <option value={336}>336 Hours (Next 14 Days)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Train / Validation Split: {(trainSplit * 100).toFixed(0)}% / {((1 - trainSplit) * 100).toFixed(0)}%
              </label>
            </div>
            <input
              type="range"
              min={0.6}
              max={0.9}
              step={0.05}
              value={trainSplit}
              onChange={(e) => setTrainSplit(parseFloat(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={training}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{training ? 'Training Model & Forecasting...' : 'Train & Generate Forecast'}</span>
            </button>
          </div>
        </form>
      </div>

      {loading && !training && <LoadingSpinner message="Retrieving latest model run..." />}

      {forecastRun && (
        <>
          {/* Validation Metrics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Mean Absolute Error (MAE)"
              value={`${forecastRun.mae.toFixed(2)}`}
              unit="kWh"
              icon={TrendingUp}
              subtitle="Average magnitude of forecast error"
              color="emerald"
            />
            <KPICard
              title="Root Mean Squared Error (RMSE)"
              value={`${forecastRun.rmse.toFixed(2)}`}
              unit="kWh"
              icon={Cpu}
              subtitle="Penalizes large variance deviations"
              color="blue"
            />
            <KPICard
              title="Weighted Error (WAPE)"
              value={`${forecastRun.wape.toFixed(1)}%`}
              unit=""
              icon={BarChart2}
              subtitle="Robust to near-zero load points"
              color="purple"
            />
            <KPICard
              title="Model Fit (R² Score)"
              value={`${forecastRun.r2.toFixed(3)}`}
              unit=""
              icon={Award}
              subtitle={`Architecture: ${forecastRun.model_name}`}
              color="emerald"
            />
          </div>

          {/* Model Comparison Table */}
          {forecastRun.model_comparison && forecastRun.model_comparison.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-brand-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Model Benchmark Comparison (Validation Split)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Chronological split evaluated without future lookahead
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Model Candidate</th>
                      <th className="py-2.5 px-3">MAE (kWh)</th>
                      <th className="py-2.5 px-3">RMSE (kWh)</th>
                      <th className="py-2.5 px-3">WAPE</th>
                      <th className="py-2.5 px-3">R² Score</th>
                      <th className="py-2.5 px-3 text-right">Selection Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forecastRun.model_comparison.map((item, idx) => (
                      <tr
                        key={idx}
                        className={item.is_selected ? 'bg-brand-50/50 font-semibold' : ''}
                      >
                        <td className="py-2.5 px-3 text-slate-900">{item.model_name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.mae.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.rmse.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.wape.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.r2.toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {item.is_selected ? (
                            <Badge label="Active Selected" variant="success" />
                          ) : (
                            <Badge label="Benchmark" variant="neutral" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Primary Forecast Chart with Uncertainty Interval */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Forecasted Load Profile ({forecastRun.horizon_hours} Hours Horizon)
                </h3>
                <p className="text-xs text-slate-500">
                  Predicted energy consumption with 10% lower and upper uncertainty bounds
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-500" /> Model Prediction
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-200" /> Confidence Band
                </span>
                {forecastRun.predictions.some((p) => p.actual_kwh != null) && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-800" /> Actual Ground Truth
                  </span>
                )}
              </div>
            </div>

            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    name="Upper Bound"
                    dataKey="upper"
                    stroke="none"
                    fill="#10B981"
                    fillOpacity={0.12}
                  />
                  <Line
                    type="monotone"
                    name="Predicted kWh"
                    dataKey="predicted"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                  />
                  {forecastRun.predictions.some((p) => p.actual_kwh != null) && (
                    <Line
                      type="monotone"
                      name="Ground Truth kWh"
                      dataKey="actual"
                      stroke="#1E293B"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!forecastRun && !loading && (
        <EmptyState
          icon={TrendingUp}
          title="No Forecast Generated Yet"
          description="Click 'Train & Generate Forecast' above to train a machine learning model on historical observations and generate a multi-step future consumption schedule."
          actionText="Run 7-Day Forecast"
          onAction={() => handleRunForecast({ preventDefault: () => {} } as any)}
          showDemoButton={false}
        />
      )}
    </div>
  );
};
