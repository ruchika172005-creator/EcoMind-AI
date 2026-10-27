export interface DataQualityIssue {
  issue_type: string;
  description: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
}

export interface DataQualityReport {
  total_rows: number;
  missing_timestamp_count: number;
  missing_value_count: number;
  negative_values_count: number;
  duplicate_timestamps_count: number;
  detected_frequency: string;
  issues: DataQualityIssue[];
}

export interface CSVPreviewResponse {
  filename: string;
  temp_file_id: string;
  total_rows_preview: number;
  columns: string[];
  sample_rows: Record<string, any>[];
  suggested_timestamp_col?: string;
  suggested_energy_col?: string;
  suggested_building_col?: string;
  suggested_temperature_col?: string;
  suggested_occupancy_col?: string;
  quality_report: DataQualityReport;
}

export interface Dataset {
  id: number;
  name: string;
  filename: string;
  row_count: number;
  start_time?: string;
  end_time?: string;
  total_consumption_kwh: number;
  avg_consumption_kwh: number;
  min_consumption_kwh: number;
  max_consumption_kwh: number;
  is_demo: boolean;
  data_frequency: string;
  created_at: string;
  sample_records?: any[];
}

export interface OverviewMetrics {
  dataset_id: number;
  dataset_name: string;
  total_energy_kwh: number;
  avg_daily_kwh: number;
  peak_demand_kwh: number;
  baseload_kwh: number;
  total_records: number;
  start_time?: string;
  end_time?: string;
  latest_forecast_kwh_next_7d?: number | null;
  forecast_model_name?: string | null;
  total_anomalies: number;
  critical_anomalies: number;
  emission_factor_used: number;
  total_co2e_kg: number;
  total_co2e_mt: number;
  potential_savings_kwh: number;
  potential_savings_cost: number;
  potential_savings_co2e_kg: number;
  sustainability_score?: number | null;
  sustainability_grade?: string | null;
  data_completeness_pct?: number | null;
  erp_sync_status?: string | null;
  erp_last_sync_time?: string | null;
  iot_total_devices?: number;
  iot_online_devices?: number;
  iot_offline_devices?: number;
  iot_active_alerts_count?: number;
  water_total_m3?: number | null;
  waste_total_kg?: number | null;
}

export * from './sustainability';
export * from './esg';
export * from './erp';
export * from './iot';

export interface TimeSeriesPoint {
  timestamp: string;
  consumption_kwh: number;
  temperature_c?: number | null;
  occupancy_pct?: number | null;
}

export interface HourlyProfilePoint {
  hour: number;
  weekday_avg_kwh: number;
  weekend_avg_kwh: number;
  overall_avg_kwh: number;
}

export interface AggregatedPoint {
  period: string;
  total_kwh: number;
  avg_kwh: number;
  peak_kwh: number;
  co2e_kg: number;
}

export interface ModelComparisonItem {
  model_name: string;
  mae: number;
  rmse: number;
  wape: number;
  r2: number;
  is_selected: boolean;
}

export interface ForecastPredictionPoint {
  timestamp: string;
  predicted_kwh: number;
  lower_bound_kwh: number;
  upper_bound_kwh: number;
  actual_kwh?: number | null;
}

export interface ForecastRunResponse {
  id: number;
  dataset_id: number;
  model_name: string;
  horizon_hours: number;
  train_split_ratio: number;
  mae: number;
  rmse: number;
  wape: number;
  r2: number;
  created_at: string;
  model_comparison: ModelComparisonItem[];
  predictions: ForecastPredictionPoint[];
}

export interface AnomalyPointResponse {
  id: number;
  timestamp: string;
  consumption_kwh: number;
  expected_kwh?: number | null;
  deviation_pct?: number | null;
  anomaly_score: number;
  is_anomaly: boolean;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  explanation?: string | null;
}

export interface AnomalyRunResponse {
  id: number;
  dataset_id: number;
  algorithm: string;
  contamination: number;
  total_records_analyzed: number;
  anomalies_detected: number;
  created_at: string;
  anomalies: AnomalyPointResponse[];
}

export interface MonthlyCarbonItem {
  month: string;
  energy_kwh: number;
  emissions_kg_co2e: number;
  emissions_mt_co2e: number;
}

export interface EmissionFactorOption {
  name: string;
  factor: number;
  region: string;
  source: string;
  year: number;
}

export interface CarbonCalculationResponse {
  id: number;
  dataset_id: number;
  emission_factor: number;
  factor_source: string;
  total_energy_kwh: number;
  total_emissions_kg_co2e: number;
  total_emissions_mt_co2e: number;
  period_start?: string | null;
  period_end?: string | null;
  gasoline_gallons_equiv: number;
  tree_seedlings_grown_10yr: number;
  passenger_vehicle_miles: number;
  homes_electricity_year: number;
  breakdown_by_month: MonthlyCarbonItem[];
  created_at: string;
}

export interface Recommendation {
  id: number;
  dataset_id: number;
  title: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  evidence: string;
  calculation_details?: string | null;
  suggested_action: string;
  limitations?: string | null;
  expected_savings_kwh?: number | null;
  expected_savings_cost?: number | null;
  expected_savings_co2e_kg?: number | null;
  status: 'Open' | 'In Progress' | 'Implemented' | 'Dismissed';
  created_at: string;
}

export interface RecommendationSummaryResponse {
  total_recommendations: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_potential_kwh_savings: number;
  total_potential_cost_savings: number;
  total_potential_co2e_kg_savings: number;
  recommendations: Recommendation[];
}

export interface AssistantSourceCitation {
  module: string;
  metric: string;
  value: string;
}

export interface AssistantQueryResponse {
  query: string;
  answer: string;
  source_module: string;
  confidence: number;
  citations: AssistantSourceCitation[];
  suggested_followups: string[];
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description?: string | null;
  updated_at: string;
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  database_connected: boolean;
  database_dialect: string;
  active_datasets_count: number;
  models_available: string[];
  timestamp: string;
}
