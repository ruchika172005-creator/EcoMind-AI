import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
      <Loader2 className={`${sizeMap[size]} animate-spin text-brand-600 mb-3`} />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};
