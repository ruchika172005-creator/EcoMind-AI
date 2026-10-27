import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  showDemoButton?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  showDemoButton = true,
}) => {
  const { loadDemo, loading } = useDataset();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-12 text-center backdrop-blur-sm max-w-xl mx-auto my-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-8 ring-brand-50/50 mb-5">
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            {actionText}
          </button>
        )}

        {showDemoButton && (
          <button
            onClick={() => loadDemo()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            {loading ? 'Loading Demo Data...' : 'Load Demo Campus Dataset'}
          </button>
        )}
      </div>
    </div>
  );
};
