import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  Thermometer,
  Users,
  Zap,
  TrendingDown,
  TrendingUp,
  Activity,
  ArrowUpDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import type { OverviewMetrics, TimeSeriesPoint, HourlyProfilePoint, AggregatedPoint } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const EnergyAnalyticsPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [hourlyProfile, setHourlyProfile] = useState<HourlyProfilePoint[]>([]);
  const [breakdown, setBreakdown] = useState<AggregatedPoint[]>([]);
  const [periodType, setPeriodType] = useState<'month' | 'day'>('month');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, tsRes, profileRes, breakdownRes] = await Promise.all([
          api.getOverview(selectedDataset.id),
          api.getTimeseries(selectedDataset.id, 800),
          api.getHourlyProfile(selectedDataset.id),
          api.getBreakdown(selectedDataset.id, periodType),
        ]);

        setMetrics(overviewRes);
        setTimeseries(tsRes);
        setHourlyProfile(profileRes);
        setBreakdown(breakdownRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDataset, periodType]);

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Dataset Selected"
        description="Select a dataset to view detailed load curves, temperature correlations, and diurnal energy signatures."
      />
    );
  }

  if (loading) return <LoadingSpinner message="Calculating energy analytics..." />;

  const peakToAverageRatio =
    metrics && metrics.avg_daily_kwh > 0
      ? (metrics.peak_demand_kwh / (metrics.avg_daily_kwh / 24)).toFixed(2)
      : '1.0';

  const baseloadRatio =
    metrics && metrics.avg_daily_kwh > 0
      ? ((metrics.baseload_kwh / (metrics.avg_daily_kwh / 24)) * 100).toFixed(0)
      : '0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Energy Load Analytics & Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deep exploratory analysis of load factors, weather sensitivity, and operating schedules for{' '}
            <span className="font-semibold text-slate-700">{selectedDataset.name}</span>
          </p>
        </div>

        {/* Period Selector Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 text-xs">
          <button
            onClick={() => setPeriodType('month')}
            className={`rounded-md px-3 py-1 font-semibold transition-colors ${
              periodType === 'month'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriodType('day')}
            className={`rounded-md px-3 py-1 font-semibold transition-colors ${
              periodType === 'day'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily (Recent 30)
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Peak Demand Surge"
          value={metrics ? metrics.peak_demand_kwh.toLocaleString() : '0'}
          unit="kWh"
          icon={TrendingUp}
          subtitle={`Peak/Average Ratio: ${peakToAverageRatio}x`}
          color="amber"
        />
        <KPICard
          title="Baseload Floor (5th Pct)"
          value={metrics ? metrics.baseload_kwh.toLocaleString() : '0'}
          unit="kWh"
          icon={Activity}
          subtitle={`${baseloadRatio}% of average hourly load`}
          color="blue"
        />
        <KPICard
          title="Average Hourly Demand"
          value={metrics && metrics.avg_daily_kwh ? (metrics.avg_daily_kwh / 24).toFixed(1) : '0'}
          unit="kWh"
          icon={Clock}
          subtitle={`Daily Total: ${metrics?.avg_daily_kwh.toLocaleString()} kWh`}
          color="emerald"
        />
        <KPICard
          title="Total Metered Energy"
          value={metrics ? metrics.total_energy_kwh.toLocaleString() : '0'}
          unit="kWh"
          icon={Zap}
          subtitle={`${metrics?.total_records.toLocaleString()} valid observations`}
          color="purple"
        />
      </div>

      {/* Primary Chart: Energy vs Temperature Dual Axis */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Energy Consumption & Temperature Telemetry
            </h3>
            <p className="text-xs text-slate-500">
              Correlating electrical load with ambient outdoor temperature across the full time series
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Energy (kWh)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Temp (°C)
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(val) => val.split(' ')[0].slice(5)}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                unit=" kWh"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                unit=" °C"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  border: 'none',
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="consumption_kwh"
                name="Energy (kWh)"
                fill="#10B981"
                fillOpacity={0.15}
                stroke="#10B981"
                strokeWidth={1.8}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temperature_c"
                name="Temp (°C)"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: 24-Hour Diurnal Signature & Period Aggregation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diurnal Hourly Profile */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Diurnal Load Profile: Weekday vs Weekend
            </h3>
            <p className="text-xs text-slate-500">
              Compares working day demand peaks against weekend baseload setback
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyProfile} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}:00`}
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
                  formatter={(val: any) => [`${val} kWh`]}
                  labelFormatter={(h) => `Hour ${h}:00`}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  name="Weekday Average"
                  dataKey="weekday_avg_kwh"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  name="Weekend Average"
                  dataKey="weekend_avg_kwh"
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  name="Combined 24h Average"
                  dataKey="overall_avg_kwh"
                  stroke="#0284C7"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Period Aggregation (Monthly / Daily) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {periodType === 'month' ? 'Monthly Consumption Breakdown' : 'Daily Consumption (Last 30 Days)'}
              </h3>
              <p className="text-xs text-slate-500">
                Total energy consumption and peak demand per period
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="period"
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
                  formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar name="Total Consumption" dataKey="total_kwh" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar name="Peak Reading" dataKey="peak_kwh" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
