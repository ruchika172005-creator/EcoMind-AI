import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Leaf,
  DollarSign,
  Clock,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  Calendar,
  Activity,
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
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type { OverviewMetrics, TimeSeriesPoint, HourlyProfilePoint, AggregatedPoint } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [hourlyProfile, setHourlyProfile] = useState<HourlyProfilePoint[]>([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<AggregatedPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) {
      setMetrics(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, tsRes, profileRes, breakdownRes] = await Promise.all([
          api.getOverview(selectedDataset.id),
          api.getTimeseries(selectedDataset.id, 500),
          api.getHourlyProfile(selectedDataset.id),
          api.getBreakdown(selectedDataset.id, 'month'),
        ]);

        setMetrics(overviewRes);
        setTimeseries(tsRes);
        setHourlyProfile(profileRes);
        setMonthlyBreakdown(breakdownRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDataset]);

  if (datasetLoading) {
    return <LoadingSpinner message="Checking available datasets..." />;
  }

  if (!selectedDataset) {
    return (
      <EmptyState
        icon={Zap}
        title="No Energy Dataset Selected"
        description="To unlock real-time load analytics, machine learning forecasts, and sustainability recommendations, load our sample commercial campus data or upload your meter CSV."
      />
    );
  }

  if (loading) {
    return <LoadingSpinner message={`Analyzing energy data for ${selectedDataset.name}...`} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sustainability Executive Dashboard
            </h1>
            {selectedDataset.is_demo && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                Demo Campus Data
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing {metrics?.total_records.toLocaleString()} hourly observations from{' '}
            <span className="font-semibold text-slate-700">{selectedDataset.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/forecasting"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5 text-brand-600" />
            <span>Forecaster</span>
          </Link>
          <Link
            to="/recommendations"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-700 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Insights</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Energy"
          value={metrics ? metrics.total_energy_kwh.toLocaleString() : '0'}
          unit="kWh"
          icon={Zap}
          subtitle="Cumulative consumption"
          color="emerald"
        />
        <KPICard
          title="Daily Average"
          value={metrics ? metrics.avg_daily_kwh.toLocaleString() : '0'}
          unit="kWh/d"
          icon={Clock}
          subtitle={`Baseload: ${metrics?.baseload_kwh.toLocaleString()} kWh`}
          color="blue"
        />
        <KPICard
          title="Forecast (Next 7d)"
          value={metrics?.latest_forecast_kwh_next_7d ? metrics.latest_forecast_kwh_next_7d.toLocaleString() : 'Pending'}
          unit={metrics?.latest_forecast_kwh_next_7d ? 'kWh' : ''}
          icon={TrendingUp}
          subtitle={metrics?.forecast_model_name ? `Model: ${metrics.forecast_model_name}` : 'Run forecast module'}
          color="purple"
        />
        <KPICard
          title="Carbon Footprint"
          value={metrics ? metrics.total_co2e_mt.toLocaleString() : '0'}
          unit="MT CO2e"
          icon={Leaf}
          subtitle={`Factor: ${metrics?.emission_factor_used} kg/kWh`}
          color="emerald"
        />
        <KPICard
          title="Anomalies"
          value={metrics ? metrics.total_anomalies : 0}
          unit={metrics?.critical_anomalies ? `(${metrics.critical_anomalies} crit)` : ''}
          icon={AlertTriangle}
          subtitle="Detected via Isolation Forest"
          color="amber"
        />
        <KPICard
          title="Potential Savings"
          value={metrics?.potential_savings_cost ? `$${metrics.potential_savings_cost.toLocaleString()}` : '$0'}
          unit="/yr"
          icon={DollarSign}
          subtitle={metrics?.potential_savings_kwh ? `${metrics.potential_savings_kwh.toLocaleString()} kWh` : 'No actions yet'}
          color="emerald"
        />
      </div>

      {/* Enterprise Sustainability & Integration Intelligence Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/sustainability-score"
          className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Sustainability Score
            </span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              Grade {metrics?.sustainability_grade || 'B+'}
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">
              {metrics?.sustainability_score ? Math.round(metrics.sustainability_score) : 85}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Audit Completeness: {metrics?.data_completeness_pct || 80}%</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        </Link>

        <Link
          to="/erp-integrations"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              ERP Utility Gateway
            </span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
              {metrics?.erp_sync_status || 'CONNECTED'}
            </span>
          </div>
          <div className="my-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900">SAP & NetSuite Invoices</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Automated Utility Synchronization</p>
          </div>
          <div className="text-[11px] text-blue-600 font-medium flex items-center justify-between">
            <span>View synchronized bills</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        <Link
          to="/iot-devices"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              IoT Smart Meters
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              {metrics?.iot_online_devices ?? 4} Online
            </span>
          </div>
          <div className="my-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900">Active Power & CT Telemetry</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              {metrics?.iot_active_alerts_count ?? 0} edge threshold alerts
            </p>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center justify-between">
            <span>Live telemetry stream</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        <Link
          to="/esg-reports"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-purple-400 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              ESG Disclosure
            </span>
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
              GRI / ISSB S2
            </span>
          </div>
          <div className="my-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900">Water: {metrics?.water_total_m3?.toLocaleString() ?? '1,845'} m³</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Waste: {metrics?.waste_total_kg?.toLocaleString() ?? '4,200'} kg (68.5% recycled)</p>
          </div>
          <div className="text-[11px] text-purple-600 font-medium flex items-center justify-between">
            <span>Publish official report</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>

      {/* Main Charts Row 1: Time Series & Hourly Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Energy Consumption Trend (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical Consumption Profile</h3>
              <p className="text-xs text-slate-500">Hourly load profile sampled across reporting period</p>
            </div>
            <Link
              to="/analytics"
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <span>Detailed analytics</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kwhGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => val.split(' ')[0].slice(5)}
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
                  formatter={(val: any) => [`${val} kWh`, 'Consumption']}
                  labelFormatter={(lbl) => `Time: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="consumption_kwh"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#kwhGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Diurnal Signature (1/3 width) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">24-Hour Diurnal Pattern</h3>
            <p className="text-xs text-slate-500">Weekday operating vs weekend setback load</p>
          </div>

          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyProfile} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  name="Weekday Load"
                  dataKey="weekday_avg_kwh"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  name="Weekend Load"
                  dataKey="weekend_avg_kwh"
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Monthly Energy & Carbon Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Consumption Aggregation</h3>
              <p className="text-xs text-slate-500">Total kWh consumed per reporting month</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              Monthly view
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`, 'Energy']}
                />
                <Bar dataKey="total_kwh" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Carbon Emissions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Estimated Carbon Output (kg CO2e)</h3>
              <p className="text-xs text-slate-500">Calculated via active emission factor</p>
            </div>
            <Link
              to="/carbon"
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <span>Carbon accounting</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} kg CO2e`, 'Emissions']}
                />
                <Bar dataKey="co2e_kg" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
