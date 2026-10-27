from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ESGIndicatorResponse(BaseModel):
    id: int
    category: str
    code: str
    name: str
    unit: str
    description: Optional[str] = None
    framework: str
    is_mandatory: bool
    sort_order: int

    class Config:
        from_attributes = True

class ESGIndicatorValueResponse(BaseModel):
    id: int
    indicator_id: int
    indicator_code: str
    indicator_name: str
    category: str
    unit: str
    facility_id: str
    reporting_period: str
    numeric_value: Optional[float] = None
    text_value: Optional[str] = None
    provenance: str
    data_source: str
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ESGIndicatorValueUpdateRequest(BaseModel):
    indicator_id: int
    facility_id: str = "All Facilities"
    reporting_period: str = "2024-Annual"
    numeric_value: Optional[float] = None
    text_value: Optional[str] = None
    provenance: str = "User-Entered"
    data_source: str = "Sustainability Officer Input"
    notes: Optional[str] = None

class ESGReportGenerateRequest(BaseModel):
    organization_name: str = "EcoMind Enterprise Corp"
    facility_id: str = "All Facilities"
    reporting_period: str = "2024-Annual"
    framework_alignment: str = "GRI Standards / ISSB S2"
    included_indicator_ids: Optional[List[int]] = None

class ESGReportResponse(BaseModel):
    id: int
    title: str
    organization_name: str
    facility_id: str
    reporting_period: str
    framework_alignment: str
    completeness_score: float
    status: str
    pdf_filename: Optional[str] = None
    methodology_version: str
    summary_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
