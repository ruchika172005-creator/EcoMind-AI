import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm' }) => {
  const normalized = (label || '').toLowerCase();
  
  let determinedVariant = variant;
  if (['critical', 'danger', 'error'].includes(normalized)) determinedVariant = 'critical';
  else if (['high', 'warning'].includes(normalized)) determinedVariant = 'high';
  else if (['medium'].includes(normalized)) determinedVariant = 'medium';
  else if (['low'].includes(normalized)) determinedVariant = 'low';
  else if (['success', 'implemented', 'healthy', 'open'].includes(normalized)) determinedVariant = 'success';
  else if (['info', 'in progress', 'demo'].includes(normalized)) determinedVariant = 'info';

  const styles = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-medium' : 'px-2.5 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${styles[determinedVariant]} ${sizeClasses}`}
    >
      {label}
    </span>
  );
};
