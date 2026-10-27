export interface MetricBreakdownItem {
  metric_name: string;
  dimension: 'Environmental' | 'Energy' | 'Carbon' | 'Water' | 'Waste';
  observed_value: number;
  target_benchmark: number;
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  normalized_score: number;
  weight_in_category: number;
  weighted_contribution: number;
  data_status: 'Measured' | 'Estimated' | 'Not Measured' | 'Not Available';
  explanation: string;
}

export interface ScoreRecommendationItem {
  dimension: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  issue: string;
  action: string;
  potential_score_impact: number;
}

export interface SustainabilityScoreRun {
  id: number;
  dataset_id?: number | null;
  facility_id: string;
  overall_score: number;
  environmental_score: number;
  energy_efficiency_score: number;
  carbon_performance_score: number;
  water_efficiency_score?: number | null;
  waste_management_score?: number | null;
  data_completeness_pct: number;
  grade: string;
  breakdown: MetricBreakdownItem[];
  recommendations: ScoreRecommendationItem[];
  methodology_notes?: string;
  created_at: string;
}

export interface ScoreConfig {
  id: number;
  name: string;
  weight_environmental: number;
  weight_energy: number;
  weight_carbon: number;
  weight_water: number;
  weight_waste: number;
  target_energy_intensity: number;
  target_carbon_intensity: number;
  target_water_intensity: number;
  target_waste_diversion: number;
  target_anomaly_rate: number;
  is_active: boolean;
  created_at: string;
}
