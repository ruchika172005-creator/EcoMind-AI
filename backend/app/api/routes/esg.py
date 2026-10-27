import os
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.esg import ESGIndicator, ESGIndicatorValue, ESGReport
from app.schemas.esg import (
    ESGIndicatorResponse,
    ESGIndicatorValueResponse,
    ESGIndicatorValueUpdateRequest,
    ESGReportResponse,
    ESGReportGenerateRequest
)
from app.services.esg_service import ESGReportingService

router = APIRouter()

@router.get("/indicators", response_model=List[ESGIndicatorResponse])
def get_indicators(db: Session = Depends(get_db)):
    indicators = db.query(ESGIndicator).order_by(ESGIndicator.sort_order.asc()).all()
    return indicators

@router.get("/values", response_model=List[ESGIndicatorValueResponse])
def get_indicator_values(
    facility_id: str = Query("All Facilities"),
    reporting_period: str = Query("2024-Annual"),
    db: Session = Depends(get_db)
):
    return ESGReportingService.get_or_create_indicator_values(db, facility_id, reporting_period)

@router.put("/values", response_model=ESGIndicatorValueResponse)
def update_indicator_value(
    req: ESGIndicatorValueUpdateRequest,
    db: Session = Depends(get_db)
):
    val_record = db.query(ESGIndicatorValue).filter_by(
        indicator_id=req.indicator_id,
        facility_id=req.facility_id,
        reporting_period=req.reporting_period
    ).first()

    ind = db.query(ESGIndicator).filter_by(id=req.indicator_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found.")

    if not val_record:
        val_record = ESGIndicatorValue(
            indicator_id=req.indicator_id,
            facility_id=req.facility_id,
            reporting_period=req.reporting_period
        )
        db.add(val_record)

    val_record.numeric_value = req.numeric_value
    val_record.text_value = req.text_value
    val_record.provenance = req.provenance
    val_record.data_source = req.data_source
    val_record.notes = req.notes
    val_record.status = "Verified" if req.numeric_value is not None or req.text_value else "Pending Review"

    db.commit()
    db.refresh(val_record)

    return ESGIndicatorValueResponse(
        id=val_record.id,
        indicator_id=ind.id,
        indicator_code=ind.code,
        indicator_name=ind.name,
        category=ind.category,
        unit=ind.unit,
        facility_id=val_record.facility_id,
        reporting_period=val_record.reporting_period,
        numeric_value=val_record.numeric_value,
        text_value=val_record.text_value,
        provenance=val_record.provenance,
        data_source=val_record.data_source,
        status=val_record.status,
        notes=val_record.notes,
        created_at=val_record.created_at
    )

@router.post("/reports", response_model=ESGReportResponse)
def generate_esg_report(
    req: ESGReportGenerateRequest,
    db: Session = Depends(get_db)
):
    try:
        report = ESGReportingService.generate_pdf_report(db, req)
        summary_dict = json.loads(report.summary_json) if report.summary_json else None
        return ESGReportResponse(
            id=report.id,
            title=report.title,
            organization_name=report.organization_name,
            facility_id=report.facility_id,
            reporting_period=report.reporting_period,
            framework_alignment=report.framework_alignment,
            completeness_score=report.completeness_score,
            status=report.status,
            pdf_filename=report.pdf_filename,
            methodology_version=report.methodology_version,
            summary_data=summary_dict,
            created_at=report.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate ESG report: {str(e)}")

@router.get("/reports", response_model=List[ESGReportResponse])
def list_esg_reports(db: Session = Depends(get_db)):
    reports = db.query(ESGReport).order_by(ESGReport.id.desc()).all()
    result = []
    for r in reports:
        summary_dict = json.loads(r.summary_json) if r.summary_json else None
        result.append(ESGReportResponse(
            id=r.id,
            title=r.title,
            organization_name=r.organization_name,
            facility_id=r.facility_id,
            reporting_period=r.reporting_period,
            framework_alignment=r.framework_alignment,
            completeness_score=r.completeness_score,
            status=r.status,
            pdf_filename=r.pdf_filename,
            methodology_version=r.methodology_version,
            summary_data=summary_dict,
            created_at=r.created_at
        ))
    return result

@router.get("/reports/{report_id}/pdf")
def download_report_pdf(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ESGReport).filter_by(id=report_id).first()
    if not report or not report.pdf_filename:
        raise HTTPException(status_code=404, detail="Report PDF not found.")

    pdf_path = os.path.join(settings.REPORTS_DIR, report.pdf_filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file does not exist on disk.")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=report.pdf_filename
    )

@router.get("/export/csv")
def export_esg_csv(
    facility_id: str = Query("All Facilities"),
    reporting_period: str = Query("2024-Annual"),
    db: Session = Depends(get_db)
):
    return ESGReportingService.export_indicators_csv(db, facility_id, reporting_period)
