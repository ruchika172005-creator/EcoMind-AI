export interface ESGIndicator {
  id: number;
  category: 'Environmental' | 'Social' | 'Governance';
  code: string;
  name: string;
  unit: string;
  description?: string;
  framework: string;
  is_mandatory: boolean;
  sort_order: number;
}

export interface ESGIndicatorValue {
  id: number;
  indicator_id: number;
  indicator_code: string;
  indicator_name: string;
  category: 'Environmental' | 'Social' | 'Governance';
  unit: string;
  facility_id: string;
  reporting_period: string;
  numeric_value?: number | null;
  text_value?: string | null;
  provenance: 'Measured' | 'Estimated' | 'User-Entered' | 'Simulated';
  data_source: string;
  status: 'Verified' | 'Pending Review' | 'Not Measured' | 'Not Provided';
  notes?: string | null;
  created_at: string;
}

export interface ESGReport {
  id: number;
  title: string;
  organization_name: string;
  facility_id: string;
  reporting_period: string;
  framework_alignment: string;
  completeness_score: number;
  status: 'Draft' | 'Approved' | 'Published';
  pdf_filename?: string | null;
  methodology_version: string;
  summary_data?: {
    organization_name: string;
    facility_id: string;
    reporting_period: string;
    completeness_score: number;
    verified_indicators: number;
    total_indicators: number;
    indicators: ESGIndicatorValue[];
  } | null;
  created_at: string;
}
