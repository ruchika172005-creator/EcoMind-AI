from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SettingUpdateRequest(BaseModel):
    key: str
    value: str

class SystemHealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database_connected: bool
    database_dialect: str
    active_datasets_count: int
    models_available: List[str]
    timestamp: datetime
