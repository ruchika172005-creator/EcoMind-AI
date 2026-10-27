import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { KPICard } from '../components/common/KPICard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

describe('UI Component Unit Tests', () => {
  it('renders Badge with correct label and variants', () => {
    const { rerender } = render(<Badge label="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();

    rerender(<Badge label="High Priority" variant="high" />);
    expect(screen.getByText('High Priority')).toBeInTheDocument();

    rerender(<Badge label="Active Selected" variant="success" />);
    expect(screen.getByText('Active Selected')).toBeInTheDocument();
  });

  it('renders KPICard with metric, title, and units', () => {
    render(
      <KPICard
        title="Total Energy"
        value="1,245,670"
        unit="kWh"
        icon={Zap}
        subtitle="Cumulative load"
        change="+4.2%"
        changeType="positive"
        color="emerald"
      />
    );

    expect(screen.getByText('Total Energy')).toBeInTheDocument();
    expect(screen.getByText('1,245,670')).toBeInTheDocument();
    expect(screen.getByText('kWh')).toBeInTheDocument();
    expect(screen.getByText('Cumulative load')).toBeInTheDocument();
    expect(screen.getByText('+4.2%')).toBeInTheDocument();
  });

  it('renders LoadingSpinner with custom message', () => {
    render(<LoadingSpinner message="Training supervised XGBoost forecaster..." />);
    expect(screen.getByText('Training supervised XGBoost forecaster...')).toBeInTheDocument();
  });
});
