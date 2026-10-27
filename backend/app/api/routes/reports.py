from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.report_service import ReportService

router = APIRouter()

@router.get("/summary/{dataset_id}")
def get_report_summary(dataset_id: int, db: Session = Depends(get_db)):
    try:
        summary = ReportService.get_comprehensive_summary(db, dataset_id)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/{dataset_id}/{module}")
def export_module_csv(dataset_id: int, module: str, db: Session = Depends(get_db)):
    try:
        return ReportService.export_csv(db, dataset_id, module)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
