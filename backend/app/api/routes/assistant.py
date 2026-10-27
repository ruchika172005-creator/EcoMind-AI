from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.assistant import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_service import AssistantService

router = APIRouter()

@router.post("/query", response_model=AssistantQueryResponse)
def query_assistant(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    try:
        response = AssistantService.process_query(
            db=db,
            query=req.query,
            dataset_id=req.dataset_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant processing error: {str(e)}")
