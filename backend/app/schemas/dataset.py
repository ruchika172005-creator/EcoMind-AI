from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DataQualityIssue(BaseModel):
    issue_type: str
    description: str
    count: int
    severity: str # "warning", "error", "info"

class DataQualityReport(BaseModel):
    total_rows: int
    missing_timestamp_count: int
    missing_value_count: int
    negative_values_count: int
    duplicate_timestamps_count: int
    detected_frequency: str
    issues: List[DataQualityIssue] = []

class CSVPreviewResponse(BaseModel):
    filename: str
    temp_file_id: str
    total_rows_preview: int
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    suggested_timestamp_col: Optional[str] = None
    suggested_energy_col: Optional[str] = None
    suggested_building_col: Optional[str] = None
    suggested_temperature_col: Optional[str] = None
    suggested_occupancy_col: Optional[str] = None
    quality_report: DataQualityReport

class ColumnMappingRequest(BaseModel):
    temp_file_id: str
    name: str
    timestamp_column: str
    energy_column: str
    building_column: Optional[str] = None
    temperature_column: Optional[str] = None
    occupancy_column: Optional[str] = None
    missing_value_strategy: str = "interpolate" # "interpolate", "forward_fill", "drop"

class DatasetResponse(BaseModel):
    id: int
    name: str
    filename: str
    row_count: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_consumption_kwh: float
    avg_consumption_kwh: float
    min_consumption_kwh: float
    max_consumption_kwh: float
    is_demo: bool
    data_frequency: str
    created_at: datetime

    class Config:
        from_attributes = True

class DatasetDetailResponse(DatasetResponse):
    column_mapping: Optional[str] = None
    sample_records: List[Dict[str, Any]] = []
