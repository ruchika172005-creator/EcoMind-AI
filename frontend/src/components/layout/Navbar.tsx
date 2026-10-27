import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Database,
  Bot,
  Activity,
  ChevronDown,
  RefreshCw,
  Server,
} from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';
import { api } from '../../api/client';
import type { SystemHealth } from '../../types';

interface NavbarProps {
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleAssistant, isAssistantOpen }) => {
  const { datasets, selectedDataset, setSelectedDataset, loadDemo, loading } = useDataset();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    api
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md">
      {/* Left: Dataset Selector Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Database className="h-4 w-4 text-brand-600" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-normal">Active Dataset</span>
              <span className="max-w-[200px] truncate font-semibold text-slate-900">
                {selectedDataset ? selectedDataset.name : 'Select Dataset...'}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Switch Dataset
              </div>
              <div className="max-h-60 overflow-y-auto">
                {datasets.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">
                    No datasets loaded yet.
                  </div>
                ) : (
                  datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => {
                        setSelectedDataset(ds);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full flex-col px-3 py-2 text-left text-xs transition-colors ${
                        selectedDataset?.id === ds.id
                          ? 'bg-brand-50 text-brand-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{ds.name}</span>
                        {ds.is_demo && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                            Demo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {ds.row_count.toLocaleString()} rows • {ds.data_frequency}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Load Demo Data Quick Action */}
        <button
          onClick={() => loadDemo()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          title="Load pre-configured commercial campus dataset"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>{loading ? 'Loading...' : 'Load Demo Data'}</span>
        </button>
      </div>

      {/* Right: Health Indicator and AI Assistant Launcher */}
      <div className="flex items-center gap-3">
        {/* Backend Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs text-slate-600">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-medium hidden sm:inline">
            API {health?.status === 'healthy' ? 'Online' : 'Degraded'}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline">
            ({health?.database_dialect || 'sqlite'})
          </span>
        </div>

        {/* AI Sustainability Assistant Toggle */}
        <button
          onClick={onToggleAssistant}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all duration-200 ${
            isAssistantOpen
              ? 'bg-brand-700 text-white shadow-brand-500/25 ring-2 ring-brand-500/30'
              : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Assistant</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      </div>
    </header>
  );
};
