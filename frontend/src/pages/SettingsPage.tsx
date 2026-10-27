import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Server,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import type { SystemSetting, SystemHealth } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsList, healthData] = await Promise.all([
        api.getSettings(),
        api.getHealth(),
      ]);
      setSettings(settingsList);
      setHealth(healthData);

      const valMap: Record<string, string> = {};
      settingsList.forEach((s) => {
        valMap[s.key] = s.value;
      });
      setFormValues(valMap);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSetting = async (key: string) => {
    setSavingKey(key);
    setError(null);
    setSuccess(null);
    try {
      const val = formValues[key];
      const updated = await api.updateSetting(key, val);
      setSuccess(`Setting "${key}" successfully saved.`);
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
    } catch (err: any) {
      setError(err.message || `Failed to update setting "${key}"`);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading configuration & server status..." />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          System Settings & Platform Status
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage system-wide emission factors, tariff assumptions, forecasting horizons, and inspect infrastructure health.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Infrastructure Health Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Backend & Database Infrastructure</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            API {health?.status === 'healthy' ? 'Operational' : 'Degraded'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Database Engine</span>
            <p className="font-semibold text-slate-900 capitalize">{health?.database_dialect || 'sqlite'}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Connection Active</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Environment</span>
            <p className="font-semibold text-slate-900 capitalize">{health?.environment || 'development'}</p>
            <span className="text-[10px] text-slate-400">Version {health?.version || '1.0.0'}</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Datasets</span>
            <p className="font-semibold text-slate-900">{health?.active_datasets_count || 0} registered</p>
            <span className="text-[10px] text-slate-400">SQLAlchemy ORM</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Security & CORS</span>
            <p className="font-semibold text-emerald-700">Validated Local</p>
            <span className="text-[10px] text-slate-400">Strict Separation</span>
          </div>
        </div>

        {/* Available ML Algorithms */}
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-brand-600" />
            Verified Machine Learning Runtimes:
          </span>
          <div className="flex flex-wrap gap-2">
            {health?.models_available.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>{m}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Global Configuration Parameters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Sustainability & Model Parameters</h3>
          <p className="text-xs text-slate-500">
            Changes to default emission factors or tariffs immediately apply to future analytical runs.
          </p>
        </div>

        <div className="space-y-4">
          {settings.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="max-w-md">
                <span className="font-mono text-xs font-bold text-slate-800">{s.key}</span>
                <p className="text-xs text-slate-500 mt-0.5">{s.description || 'Configurable system parameter'}</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formValues[s.key] ?? s.value}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      [s.key]: e.target.value,
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-brand-500 focus:outline-none w-48"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSetting(s.key)}
                  disabled={savingKey === s.key}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingKey === s.key ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
