import axios from 'axios';
import { SustainabilityScoreRun, ScoreConfig } from '../types/sustainability';
import { ESGIndicator, ESGIndicatorValue, ESGReport } from '../types/esg';
import { ERPConnector, ERPSyncRun, ERPUtilityRecord } from '../types/erp';
import { IoTDevice, IoTMeterReading, IoTAlert, IoTHealth } from '../types/iot';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sustainability Scoring APIs
export const scoringApi = {
  getLatestScore: async (datasetId?: number, facilityId = 'HQ-BLDG-01'): Promise<SustainabilityScoreRun> => {
    const params = new URLSearchParams();
    if (datasetId) params.append('dataset_id', datasetId.toString());
    params.append('facility_id', facilityId);
    const res = await apiClient.get<SustainabilityScoreRun>(`/sustainability/scores?${params.toString()}`);
    return res.data;
  },

  runScoring: async (datasetId?: number, facilityId = 'HQ-BLDG-01'): Promise<SustainabilityScoreRun> => {
    const res = await apiClient.post<SustainabilityScoreRun>('/sustainability/scores/run', {
      dataset_id: datasetId,
      facility_id: facilityId,
    });
    return res.data;
  },

  getScoreHistory: async (limit = 10): Promise<SustainabilityScoreRun[]> => {
    const res = await apiClient.get<SustainabilityScoreRun[]>(`/sustainability/scores/history?limit=${limit}`);
    return res.data;
  },

  getConfig: async (): Promise<ScoreConfig> => {
    const res = await apiClient.get<ScoreConfig>('/sustainability/scores/config');
    return res.data;
  },

  updateConfig: async (config: Partial<ScoreConfig>): Promise<ScoreConfig> => {
    const res = await apiClient.put<ScoreConfig>('/sustainability/scores/config', config);
    return res.data;
  },
};

// ESG Reporting APIs
export const esgApi = {
  getIndicators: async (): Promise<ESGIndicator[]> => {
    const res = await apiClient.get<ESGIndicator[]>('/esg/indicators');
    return res.data;
  },

  getValues: async (facilityId = 'All Facilities', reportingPeriod = '2024-Annual'): Promise<ESGIndicatorValue[]> => {
    const res = await apiClient.get<ESGIndicatorValue[]>(
      `/esg/values?facility_id=${encodeURIComponent(facilityId)}&reporting_period=${encodeURIComponent(reportingPeriod)}`
    );
    return res.data;
  },

  updateValue: async (payload: {
    indicator_id: number;
    facility_id: string;
    reporting_period: string;
    numeric_value?: number | null;
    text_value?: string | null;
    provenance?: string;
    data_source?: string;
    notes?: string | null;
  }): Promise<ESGIndicatorValue> => {
    const res = await apiClient.put<ESGIndicatorValue>('/esg/values', payload);
    return res.data;
  },

  generateReport: async (payload: {
    organization_name: string;
    facility_id: string;
    reporting_period: string;
    framework_alignment: string;
  }): Promise<ESGReport> => {
    const res = await apiClient.post<ESGReport>('/esg/reports', payload);
    return res.data;
  },

  getReports: async (): Promise<ESGReport[]> => {
    const res = await apiClient.get<ESGReport[]>('/esg/reports');
    return res.data;
  },

  getPdfUrl: (reportId: number): string => {
    return `${API_BASE_URL}/esg/reports/${reportId}/pdf`;
  },

  getCsvExportUrl: (facilityId = 'All Facilities', reportingPeriod = '2024-Annual'): string => {
    return `${API_BASE_URL}/esg/export/csv?facility_id=${encodeURIComponent(facilityId)}&reporting_period=${encodeURIComponent(reportingPeriod)}`;
  },
};

// ERP Integration APIs
export const erpApi = {
  getConnectors: async (): Promise<ERPConnector[]> => {
    const res = await apiClient.get<ERPConnector[]>('/integrations/erp/connectors');
    return res.data;
  },

  createConnector: async (payload: {
    name: string;
    connector_type: string;
    endpoint_url?: string | null;
    auth_type: string;
    credentials?: string | null;
    is_simulated: boolean;
  }): Promise<ERPConnector> => {
    const res = await apiClient.post<ERPConnector>('/integrations/erp/connectors', payload);
    return res.data;
  },

  testConnection: async (connectorId: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/integrations/erp/connectors/${connectorId}/test`);
    return res.data;
  },

  syncConnector: async (connectorId: number, simulateError = false, limitRecords = 50): Promise<ERPSyncRun> => {
    const res = await apiClient.post<ERPSyncRun>(
      `/integrations/erp/connectors/${connectorId}/sync?simulate_error=${simulateError}&limit_records=${limitRecords}`
    );
    return res.data;
  },

  getSyncHistory: async (limit = 20): Promise<ERPSyncRun[]> => {
    const res = await apiClient.get<ERPSyncRun[]>(`/integrations/erp/sync-history?limit=${limit}`);
    return res.data;
  },

  getUtilityRecords: async (facilityId?: string, utilityType?: string, limit = 50): Promise<ERPUtilityRecord[]> => {
    const params = new URLSearchParams();
    if (facilityId) params.append('facility_id', facilityId);
    if (utilityType) params.append('utility_type', utilityType);
    params.append('limit', limit.toString());
    const res = await apiClient.get<ERPUtilityRecord[]>(`/integrations/erp/utility-records?${params.toString()}`);
    return res.data;
  },

  convertToAnalytics: async (connectorId: number): Promise<{ status: string; converted_records_count: number }> => {
    const res = await apiClient.post<{ status: string; converted_records_count: number }>(
      `/integrations/erp/connectors/${connectorId}/convert-to-analytics`
    );
    return res.data;
  },
};

// IoT and Smart Meter APIs
export const iotApi = {
  getDevices: async (): Promise<IoTDevice[]> => {
    const res = await apiClient.get<IoTDevice[]>('/iot/devices');
    return res.data;
  },

  registerDevice: async (payload: {
    device_id: string;
    name: string;
    facility_id: string;
    device_type: string;
    measurement_type: string;
    unit: string;
    protocol: string;
    is_simulated: boolean;
  }): Promise<IoTDevice> => {
    const res = await apiClient.post<IoTDevice>('/iot/devices', payload);
    return res.data;
  },

  getReadings: async (deviceId?: string, limit = 100): Promise<IoTMeterReading[]> => {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId);
    params.append('limit', limit.toString());
    const res = await apiClient.get<IoTMeterReading[]>(`/iot/readings?${params.toString()}`);
    return res.data;
  },

  getAlerts: async (unresolvedOnly = false, limit = 50): Promise<IoTAlert[]> => {
    const res = await apiClient.get<IoTAlert[]>(`/iot/alerts?unresolved_only=${unresolvedOnly}&limit=${limit}`);
    return res.data;
  },

  resolveAlert: async (alertId: number): Promise<{ status: string; resolved: boolean }> => {
    const res = await apiClient.patch<{ status: string; resolved: boolean }>(`/iot/alerts/${alertId}/resolve`);
    return res.data;
  },

  triggerSimulator: async (action: 'step' | 'burst', injectAnomaly = false): Promise<{
    status: string;
    accepted_count: number;
    alerts_triggered_count: number;
  }> => {
    const res = await apiClient.post('/iot/simulator/step', {
      action,
      inject_anomaly: injectAnomaly,
      readings_per_device: action === 'burst' ? 5 : 1,
    });
    return res.data;
  },

  getHealth: async (): Promise<IoTHealth> => {
    const res = await apiClient.get<IoTHealth>('/iot/health');
    return res.data;
  },
};
