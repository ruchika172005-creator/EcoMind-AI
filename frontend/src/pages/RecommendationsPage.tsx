import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  DollarSign,
  Zap,
  Leaf,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type { Recommendation, RecommendationSummaryResponse } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const RecommendationsPage: React.FC = () => {
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const [summary, setSummary] = useState<RecommendationSummaryResponse | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [generating, setGenerating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDataset) {
      setSummary(null);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getRecommendations(selectedDataset.id);
        setSummary(res);
      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedDataset]);

  const handleGenerate = async () => {
    if (!selectedDataset) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateRecommendations(selectedDataset.id);
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (recId: number, newStatus: string) => {
    try {
      await api.updateRecommendationStatus(recId, newStatus);
      if (summary) {
        setSummary({
          ...summary,
          recommendations: summary.recommendations.map((r) =>
            r.id === recId ? { ...r, status: newStatus as any } : r
          ),
        });
      }
    } catch (err: any) {
      alert(`Could not update recommendation status: ${err.message}`);
    }
  };

  if (datasetLoading) return <LoadingSpinner message="Checking datasets..." />;
  if (!selectedDataset) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No Dataset Selected"
        description="Select a dataset to synthesize machine learning observations and generate data-backed energy conservation measures."
      />
    );
  }

  const recs = summary?.recommendations || [];
  const filteredRecs =
    priorityFilter === 'ALL'
      ? recs
      : recs.filter((r) => r.priority.toUpperCase() === priorityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Energy Efficiency Recommendations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data-backed heuristic energy conservation measures synthesized from load profiles, baseload floor, and anomaly patterns for{' '}
            <span className="font-semibold text-slate-700">{selectedDataset.name}</span>
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          <span>{generating ? 'Synthesizing Patterns...' : 'Regenerate Recommendations'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !generating && <LoadingSpinner message="Retrieving recommendations..." />}

      {summary && (
        <>
          {/* Aggregate Potential Savings Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Annual Cost Savings"
              value={`$${summary.total_potential_cost_savings.toLocaleString()}`}
              unit="/year"
              icon={DollarSign}
              subtitle="Calculated at active electricity tariff"
              color="emerald"
            />
            <KPICard
              title="Potential Energy Avoided"
              value={`${summary.total_potential_kwh_savings.toLocaleString()}`}
              unit="kWh/yr"
              icon={Zap}
              subtitle="Sum of efficiency opportunities"
              color="blue"
            />
            <KPICard
              title="Carbon Avoidance"
              value={`${summary.total_potential_co2e_kg_savings.toLocaleString()}`}
              unit="kg CO2e"
              icon={Leaf}
              subtitle={`${(summary.total_potential_co2e_kg_savings / 1000).toFixed(2)} MT CO2e GHG avoided`}
              color="emerald"
            />
            <KPICard
              title="Identified Actions"
              value={summary.total_recommendations}
              unit={`(${summary.critical_count} critical)`}
              icon={Lightbulb}
              subtitle={`${summary.high_count} high priority`}
              color="purple"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] mr-2">
                Filter Priority:
              </span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    priorityFilter === p
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredRecs.length} of {recs.length} recommendations
            </span>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {filteredRecs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                No recommendations match the selected filter.
              </div>
            ) : (
              filteredRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  {/* Top Bar: Title, Priority, Status Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-medium text-slate-400">
                            Category: {rec.category}
                          </span>
                          <span className="text-slate-300">•</span>
                          <Badge label={rec.priority} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Status:</span>
                      <select
                        value={rec.status}
                        onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Implemented">Implemented</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>

                  {/* Evidence Box */}
                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-1">
                      Observed Evidence from Telemetry:
                    </span>
                    <p className="leading-relaxed">{rec.evidence}</p>
                  </div>

                  {/* Suggested Action & Expected Savings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="md:col-span-2 space-y-2">
                      <div>
                        <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-1">
                          Recommended Engineering Action:
                        </span>
                        <p className="text-slate-700 leading-relaxed bg-brand-50/40 p-3 rounded-lg border border-brand-200/60 font-medium">
                          {rec.suggested_action}
                        </p>
                      </div>

                      {rec.limitations && (
                        <p className="text-[11px] text-slate-400 italic">
                          <strong>Assumptions & Limitations:</strong> {rec.limitations}
                        </p>
                      )}
                    </div>

                    {/* Savings Card */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Estimated Annual Impact
                      </span>

                      <div className="space-y-1.5 my-2">
                        {rec.expected_savings_cost != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Cost Savings:</span>
                            <span className="font-bold text-emerald-800 text-sm">
                              ${rec.expected_savings_cost.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {rec.expected_savings_kwh != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Energy Savings:</span>
                            <span className="font-semibold text-slate-900">
                              {rec.expected_savings_kwh.toLocaleString()} kWh
                            </span>
                          </div>
                        )}
                        {rec.expected_savings_co2e_kg != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">GHG Avoidance:</span>
                            <span className="font-semibold text-slate-900">
                              {rec.expected_savings_co2e_kg.toLocaleString()} kg
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-emerald-700 font-medium pt-2 border-t border-emerald-200">
                        {rec.calculation_details || 'Based on active facility tariff & baseline reduction.'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
