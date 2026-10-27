from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AssistantQueryRequest(BaseModel):
    dataset_id: Optional[int] = None
    query: str

class AssistantSourceCitation(BaseModel):
    module: str
    metric: str
    value: str

class AssistantQueryResponse(BaseModel):
    query: str
    answer: str
    source_module: str
    confidence: float
    citations: List[AssistantSourceCitation] = []
    suggested_followups: List[str] = []
