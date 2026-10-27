from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ERPConnectorResponse(BaseModel):
    id: int
    name: str
    connector_type: str
    endpoint_url: Optional[str] = None
    auth_type: str
    credentials_masked: Optional[str] = None
    is_simulated: bool
    status: str
    last_sync_time: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_records_count: int
    error_details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ERPConnectorCreateRequest(BaseModel):
    name: str
    connector_type: str # "GENERIC_REST", "SAP", "NETSUITE", "DYNAMICS_365", "CSV_IMPORT"
    endpoint_url: Optional[str] = None
    auth_type: str = "NONE"
    credentials: Optional[str] = None
    is_simulated: bool = False
    field_mapping: Optional[str] = None

class ERPSyncTriggerRequest(BaseModel):
    connector_id: int
    simulate_error: bool = False
    limit_records: int = 50

class ERPSyncRunResponse(BaseModel):
    id: int
    connector_id: int
    connector_name: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    records_imported: int
    records_skipped: int
    data_quality_issues: List[str] = []
    details: Optional[str] = None

    class Config:
        from_attributes = True

class ERPUtilityRecordResponse(BaseModel):
    id: int
    connector_id: int
    external_transaction_id: str
    facility_id: str
    utility_type: str
    billing_period_start: datetime
    billing_period_end: datetime
    billed_quantity: float
    unit: str
    total_cost: float
    currency: str
    invoice_number: Optional[str] = None
    provenance: str
    created_at: datetime

    class Config:
        from_attributes = True
