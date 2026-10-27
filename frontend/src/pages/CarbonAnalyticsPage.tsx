import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Car,
  Fuel,
  TreePine,
  Home,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Calculator,
  RefreshCw,
  Globe,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type {
  CarbonCalculationResponse,
  EmissionFactorOption,
  MonthlyCarbonItem,
} from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const CarbonAnalyticsPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const [carbonSummary, setCarbonSummary] = useState<CarbonCalculationResponse | null>(null);
  const [factors, setFactors] = useState<EmissionFactorOption[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<number>(0.386);
  const [factorSource, setFactorSource] = useState<string>('US EPA eGRID (National Average)');
  const [customFactor, setCustomFactor] = useState<string>('0.386');

  const [calculating, setCalculating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load standard emission factor catalog
    api
      .getEmissionFactors()
      .then(setFactors)
      .catch((err) => console.error('Error fetching factors:', err));
  }, []);

  useEffect(() => {
    if (!selectedDataset) {
      setCarbonSummary(null);
      return;
    }

    const fetchCarbon = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getCarbonSummary(selectedDataset.id);
        if (res) {
          setCarbonSummary(res);
          setSelectedFactor(res.emission_factor);
          setFactorSource(res.factor_source);
          setCustomFactor(String(res.emission_factor));
        }
      } catch (err: any) {
        console.error('Error fetching carbon summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCarbon();
  }, [selectedDataset]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;

    setCalculating(true);
    setError(null);
    try {
      const factorNum = parseFloat(customFactor);
      if (isNaN(factorNum) || factorNum <= 0) {
        throw new Error('Please enter a valid positive emission factor.');
      }

      const res = await api.calculateCarbon({
        dataset_id: selectedDataset.id,
        emission_factor: factorNum,
        factor_source: factorSource,
      });

      setCarbonSummary(res);
      setSelectedFactor(res.emission_factor);
    } catch (err: any) {
      setError(err.message || 'Carbon calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const handleSelectPreset = (opt: EmissionFactorOption) => {
    setSelectedFactor(opt.factor);
    setCustomFactor(String(opt.factor));
    setFactorSource(`${opt.name} (${opt.region}, ${opt.year})`);
  };

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={Leaf}
        title="No Dataset Selected"
        description="Select a dataset to quantify Scope 2 indirect carbon emissions using regional grid emission factors and EPA GHG equivalencies."
      />
    );
  }

  const monthlyData = carbonSummary?.breakdown_by_month || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Carbon Impact & GHG Accounting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scope 2 greenhouse gas emissions estimation using traceable grid emission factors for{' '}
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

      {/* Emission Factor Configuration Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Grid Emission Factor Configuration
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Formula: Emissions (kg CO2e) = kWh × Factor (kg CO2e/kWh)
          </span>
        </div>

        {/* Preset Chips */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase">
            Select Recognized Standard or Regional Preset
          </label>
          <div className="flex flex-wrap gap-2">
            {factors.map((f, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                  customFactor === String(f.factor)
                    ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{f.name}</span>
                <span className="ml-1 text-[10px] text-slate-400">({f.factor} kg/kWh)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input & Run Form */}
        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active Emission Factor (kg CO2e / kWh)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={customFactor}
              onChange={(e) => setCustomFactor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Factor Source & Geography
            </label>
            <input
              type="text"
              value={factorSource}
              onChange={(e) => setFactorSource(e.target.value)}
              placeholder="e.g. US EPA eGRID 2024"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={calculating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>{calculating ? 'Recalculating Footprint...' : 'Update & Recalculate'}</span>
            </button>
          </div>
        </form>
      </div>

      {loading && !calculating && <LoadingSpinner message="Calculating carbon inventory..." />}

      {carbonSummary && (
        <>
          {/* Executive GHG Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Emissions (Metric Tons)"
              value={carbonSummary.total_emissions_mt_co2e.toLocaleString()}
              unit="MT CO2e"
              icon={Leaf}
              subtitle={`${carbonSummary.total_emissions_kg_co2e.toLocaleString()} kg CO2e`}
              color="emerald"
            />
            <KPICard
              title="Tree Seedlings Equivalency"
              value={carbonSummary.tree_seedlings_grown_10yr.toLocaleString()}
              unit="Seedlings"
              icon={TreePine}
              subtitle="Grown for 10 years to sequester this carbon"
              color="emerald"
            />
            <KPICard
              title="Gasoline Consumed"
              value={carbonSummary.gasoline_gallons_equiv.toLocaleString()}
              unit="Gallons"
              icon={Fuel}
              subtitle="Equivalent combustion emissions"
              color="amber"
            />
            <KPICard
              title="Passenger Vehicle Miles"
              value={carbonSummary.passenger_vehicle_miles.toLocaleString()}
              unit="Miles"
              icon={Car}
              subtitle="Miles driven by an average gasoline vehicle"
              color="blue"
            />
          </div>

          {/* Monthly Emissions Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Monthly Carbon Emissions Breakdown (kg CO2e)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated based on {carbonSummary.emission_factor} kg CO2e/kWh ({carbonSummary.factor_source})
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar name="Emissions (kg CO2e)" dataKey="emissions_kg_co2e" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Methodology & Reporting Guidance */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Info className="h-4 w-4 text-brand-600" />
              <span>GHG Protocol Scope 2 Methodology Notes:</span>
            </div>
            <p>
              EcoMind AI utilizes location-based grid emission factors to calculate indirect Scope 2 carbon footprint from metered electricity consumption.
              Equivalencies are calculated using the <strong>U.S. EPA Greenhouse Gas Equivalencies Calculator</strong> standard formulas.
            </p>
            <p className="text-slate-500 text-[11px]">
              Note: Estimates reflect indirect emissions from electricity generation. For market-based reporting with Renewable Energy Certificates (RECs) or Power Purchase Agreements (PPAs), please input supplier-specific residual factors in Settings.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
