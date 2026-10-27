export interface ERPConnector {
  id: number;
  name: string;
  connector_type: 'SIMULATED' | 'GENERIC_REST' | 'SAP' | 'NETSUITE' | 'DYNAMICS_365' | 'CSV_IMPORT';
  endpoint_url?: string | null;
  auth_type: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC';
  credentials_masked?: string | null;
  is_simulated: boolean;
  status: 'CONNECTED' | 'CONFIGURED' | 'DISCONNECTED' | 'ERROR';
  last_sync_time?: string | null;
  last_sync_status?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | null;
  last_sync_records_count: number;
  error_details?: string | null;
  created_at: string;
}

export interface ERPSyncRun {
  id: number;
  connector_id: number;
  connector_name: string;
  started_at: string;
  completed_at?: string | null;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  records_imported: number;
  records_skipped: number;
  data_quality_issues: string[];
  details?: string | null;
}

export interface ERPUtilityRecord {
  id: number;
  connector_id: number;
  external_transaction_id: string;
  facility_id: string;
  utility_type: 'ELECTRICITY' | 'WATER' | 'NATURAL_GAS' | 'DIESEL' | 'WASTE';
  billing_period_start: string;
  billing_period_end: string;
  billed_quantity: number;
  unit: string;
  total_cost: number;
  currency: string;
  invoice_number?: string | null;
  provenance: string;
  created_at: string;
}
