import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatasetProvider } from './context/DatasetContext';
import { MainLayout } from './layouts/MainLayout';

import { DashboardPage } from './pages/DashboardPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { EnergyAnalyticsPage } from './pages/EnergyAnalyticsPage';
import { ForecastingPage } from './pages/ForecastingPage';
import { AnomalyDetectionPage } from './pages/AnomalyDetectionPage';
import { CarbonAnalyticsPage } from './pages/CarbonAnalyticsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SustainabilityScorePage } from './pages/SustainabilityScorePage';
import { ESGReportsPage } from './pages/ESGReportsPage';
import { ERPIntegrationsPage } from './pages/ERPIntegrationsPage';
import { IoTDevicesPage } from './pages/IoTDevicesPage';

export const App: React.FC = () => {
  return (
    <DatasetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="data" element={<DataManagementPage />} />
            <Route path="analytics" element={<EnergyAnalyticsPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
            <Route path="anomalies" element={<AnomalyDetectionPage />} />
            <Route path="carbon" element={<CarbonAnalyticsPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="sustainability-score" element={<SustainabilityScorePage />} />
            <Route path="esg-reports" element={<ESGReportsPage />} />
            <Route path="erp-integrations" element={<ERPIntegrationsPage />} />
            <Route path="iot-devices" element={<IoTDevicesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DatasetProvider>
  );
};

export default App;
