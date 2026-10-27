import axios from 'axios';
import type {
  SystemHealth,
  Dataset,
  CSVPreviewResponse,
  OverviewMetrics,
  TimeSeriesPoint,
  HourlyProfilePoint,
  AggregatedPoint,
  ForecastRunResponse,
  AnomalyRunResponse,
  EmissionFactorOption,
  CarbonCalculationResponse,
  RecommendationSummaryResponse,
  AssistantQueryResponse,
  SystemSetting,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for model training/clustering
});

// Interceptor for friendly error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Health
  getHealth: () => apiClient.get<SystemHealth>('/health').then((r) => r.data),

  // Datasets
  getDatasets: () => apiClient.get<Dataset[]>('/datasets').then((r) => r.data),
  getDataset: (id: number) => apiClient.get<Dataset>(`/datasets/${id}`).then((r) => r.data),
  uploadPreview: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<CSVPreviewResponse>('/datasets/upload-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  processDataset: (data: {
    temp_file_id: string;
    name: string;
    timestamp_column: string;
    energy_column: string;
    building_column?: string;
    temperature_column?: string;
    occupancy_column?: string;
    missing_value_strategy: string;
  }) => apiClient.post<Dataset>('/datasets/process', data).then((r) => r.data),
  loadDemoDataset: () => apiClient.post<Dataset>('/datasets/demo').then((r) => r.data),
  deleteDataset: (id: number) =>
    apiClient.delete<{ status: string; message: string }>(`/datasets/${id}`).then((r) => r.data),

  // Analytics
  getOverview: (datasetId: number) =>
    apiClient.get<OverviewMetrics>(`/analytics/overview/${datasetId}`).then((r) => r.data),
  getTimeseries: (datasetId: number, limit = 1000) =>
    apiClient
      .get<TimeSeriesPoint[]>(`/analytics/timeseries/${datasetId}`, { params: { limit } })
      .then((r) => r.data),
  getHourlyProfile: (datasetId: number) =>
    apiClient.get<HourlyProfilePoint[]>(`/analytics/hourly-profile/${datasetId}`).then((r) => r.data),
  getBreakdown: (datasetId: number, period_type: 'month' | 'day' = 'month') =>
    apiClient
      .get<AggregatedPoint[]>(`/analytics/breakdown/${datasetId}`, { params: { period_type } })
      .then((r) => r.data),

  // Forecasting
  runForecast: (params: {
    dataset_id: number;
    model_type: string;
    horizon_hours: number;
    train_split_ratio: number;
  }) => apiClient.post<ForecastRunResponse>('/forecast/run', params).then((r) => r.data),
  getLatestForecast: (datasetId: number) =>
    apiClient.get<ForecastRunResponse | null>(`/forecast/runs/${datasetId}`).then((r) => r.data),

  // Anomaly Detection
  runAnomalies: (params: { dataset_id: number; contamination: number }) =>
    apiClient.post<AnomalyRunResponse>('/anomalies/run', params).then((r) => r.data),
  getLatestAnomalies: (datasetId: number) =>
    apiClient.get<AnomalyRunResponse | null>(`/anomalies/runs/${datasetId}`).then((r) => r.data),

  // Carbon Accounting
  getEmissionFactors: () =>
    apiClient.get<EmissionFactorOption[]>('/carbon/factors').then((r) => r.data),
  calculateCarbon: (params: {
    dataset_id: number;
    emission_factor?: number;
    factor_source?: string;
  }) => apiClient.post<CarbonCalculationResponse>('/carbon/calculate', params).then((r) => r.data),
  getCarbonSummary: (datasetId: number) =>
    apiClient
      .get<CarbonCalculationResponse | null>(`/carbon/summary/${datasetId}`)
      .then((r) => r.data),

  // AI Recommendations
  generateRecommendations: (datasetId: number) =>
    apiClient
      .post<RecommendationSummaryResponse>(`/recommendations/generate/${datasetId}`)
      .then((r) => r.data),
  getRecommendations: (datasetId: number) =>
    apiClient
      .get<RecommendationSummaryResponse>(`/recommendations/${datasetId}`)
      .then((r) => r.data),
  updateRecommendationStatus: (id: number, status: string) =>
    apiClient.patch(`/recommendations/${id}/status`, { status }).then((r) => r.data),

  // Assistant
  queryAssistant: (query: string, datasetId?: number) =>
    apiClient
      .post<AssistantQueryResponse>('/assistant/query', { query, dataset_id: datasetId })
      .then((r) => r.data),

  // Reports & Exports
  getReportSummary: (datasetId: number) =>
    apiClient.get<any>(`/reports/summary/${datasetId}`).then((r) => r.data),
  getExportUrl: (datasetId: number, module: string) =>
    `${API_BASE_URL}/reports/export/${datasetId}/${module}`,

  // Settings
  getSettings: () => apiClient.get<SystemSetting[]>('/settings').then((r) => r.data),
  updateSetting: (key: string, value: string) =>
    apiClient.put<SystemSetting>('/settings', { key, value }).then((r) => r.data),
};

export default apiClient;
