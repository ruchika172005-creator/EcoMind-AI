import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Leaf,
  Lightbulb,
  FileText,
  Sliders,
  Award,
  FileCheck,
  Network,
  Radio,
} from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

interface NavSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'Core Analytics',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Data Management', href: '/data', icon: Database },
      { name: 'Energy Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Consumption Forecasting', href: '/forecasting', icon: TrendingUp },
      { name: 'Anomaly Detection', href: '/anomalies', icon: AlertTriangle },
      { name: 'Carbon Analytics', href: '/carbon', icon: Leaf },
      { name: 'AI Recommendations', href: '/recommendations', icon: Lightbulb },
    ],
  },
  {
    title: 'Enterprise Sustainability',
    items: [
      { name: 'Sustainability Score', href: '/sustainability-score', icon: Award, badge: 'Score' },
      { name: 'ESG Reports', href: '/esg-reports', icon: FileCheck, badge: 'PDF' },
      { name: 'ERP Integrations', href: '/erp-integrations', icon: Network },
      { name: 'IoT & Smart Meters', href: '/iot-devices', icon: Radio, badge: 'Live' },
    ],
  },
  {
    title: 'System & Reports',
    items: [
      { name: 'Reports & Exports', href: '/reports', icon: FileText },
      { name: 'Settings & Status', href: '/settings', icon: Sliders },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { selectedDataset } = useDataset();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 border-r border-slate-800 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white shadow-lg shadow-brand-500/25 ring-2 ring-brand-400/20">
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">EcoMind</span>
            <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400 border border-brand-500/20">AI</span>
          </div>
          <p className="text-[11px] text-slate-400">Enterprise Sustainability</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 shadow-sm border border-brand-500/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            item.badge === 'Live'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                              : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Active Dataset Footer Indicator */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Active Dataset
          </span>
        </div>
        <p className="text-xs font-semibold text-white truncate">
          {selectedDataset ? selectedDataset.name : 'No dataset loaded'}
        </p>
        {selectedDataset && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            {selectedDataset.row_count.toLocaleString()} hourly observations
          </p>
        )}
      </div>
    </aside>
  );
};
