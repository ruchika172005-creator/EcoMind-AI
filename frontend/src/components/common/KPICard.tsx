import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  subtitle,
  change,
  changeType = 'neutral',
  color = 'emerald',
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      gradient: 'from-emerald-500/10 to-teal-500/5',
    },
    blue: {
      bg: 'bg-sky-50/80',
      text: 'text-sky-600',
      border: 'border-sky-100',
      gradient: 'from-sky-500/10 to-blue-500/5',
    },
    amber: {
      bg: 'bg-amber-50/80',
      text: 'text-amber-600',
      border: 'border-amber-100',
      gradient: 'from-amber-500/10 to-orange-500/5',
    },
    purple: {
      bg: 'bg-purple-50/80',
      text: 'text-purple-600',
      border: 'border-purple-100',
      gradient: 'from-purple-500/10 to-indigo-500/5',
    },
    slate: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      gradient: 'from-slate-500/10 to-slate-400/5',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${scheme.gradient} rounded-bl-full pointer-events-none`} />
      
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${scheme.bg} ${scheme.text} shadow-sm ring-1 ring-black/5`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>

      {(subtitle || change) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          {change && (
            <span
              className={`font-semibold ${
                changeType === 'positive'
                  ? 'text-emerald-600'
                  : changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-slate-500'
              }`}
            >
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
