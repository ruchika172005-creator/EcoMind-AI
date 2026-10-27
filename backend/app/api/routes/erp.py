from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.erp import ERPConnector, ERPSyncRun, ERPUtilityRecord
from app.schemas.erp import (
    ERPConnectorResponse,
    ERPConnectorCreateRequest,
    ERPSyncTriggerRequest,
    ERPSyncRunResponse,
    ERPUtilityRecordResponse
)
from app.integrations.erp.security import ERPSecurity
from app.integrations.erp.erp_service import ERPIntegrationService
from app.services.unified_data_service import UnifiedDataService

router = APIRouter()

@router.get("/connectors", response_model=List[ERPConnectorResponse])
def list_connectors(db: Session = Depends(get_db)):
    connectors = db.query(ERPConnector).order_by(ERPConnector.id.asc()).all()
    return connectors

@router.post("/connectors", response_model=ERPConnectorResponse)
def create_connector(req: ERPConnectorCreateRequest, db: Session = Depends(get_db)):
    # Validate URL for SSRF if provided
    if req.endpoint_url and not req.is_simulated:
        if not ERPSecurity.validate_safe_url(req.endpoint_url):
            raise HTTPException(
                status_code=400,
                detail="Endpoint URL is prohibited by security policy (SSRF prevention). Loopback, private subnets, and metadata services are blocked."
            )

    connector = ERPConnector(
        name=req.name,
        connector_type=req.connector_type,
        endpoint_url=req.endpoint_url,
        auth_type=req.auth_type,
        credentials_masked=ERPSecurity.mask_secret(req.credentials) if req.credentials else "None",
        is_simulated=req.is_simulated,
        status="CONFIGURED",
        field_mapping=req.field_mapping
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector

@router.post("/connectors/{connector_id}/test")
def test_connector(connector_id: int, db: Session = Depends(get_db)):
    success, message = ERPIntegrationService.test_connection(db, connector_id)
    return {"success": success, "message": message}

@router.post("/connectors/{connector_id}/sync", response_model=ERPSyncRunResponse)
def sync_connector(
    connector_id: int,
    simulate_error: bool = Query(default=False),
    limit_records: int = Query(default=50),
    db: Session = Depends(get_db)
):
    req = ERPSyncTriggerRequest(
        connector_id=connector_id,
        simulate_error=simulate_error,
        limit_records=limit_records
    )
    return ERPIntegrationService.synchronize(db, req)

@router.get("/sync-history", response_model=List[ERPSyncRunResponse])
def get_sync_history(limit: int = Query(default=20), db: Session = Depends(get_db)):
    runs = db.query(ERPSyncRun).order_by(ERPSyncRun.id.desc()).limit(limit).all()
    result = []
    for r in runs:
        issues = []
        if r.data_quality_issues:
            try:
                import json
                issues = json.loads(r.data_quality_issues)
            except Exception:
                pass
        result.append(ERPSyncRunResponse(
            id=r.id,
            connector_id=r.connector_id,
            connector_name=r.connector.name if r.connector else "ERP Connector",
            started_at=r.started_at,
            completed_at=r.completed_at,
            status=r.status,
            records_imported=r.records_imported,
            records_skipped=r.records_skipped,
            data_quality_issues=issues,
            details=r.details
        ))
    return result

@router.get("/utility-records", response_model=List[ERPUtilityRecordResponse])
def get_utility_records(
    facility_id: Optional[str] = Query(None),
    utility_type: Optional[str] = Query(None),
    limit: int = Query(default=50),
    db: Session = Depends(get_db)
):
    return ERPIntegrationService.get_utility_records(
        db, facility_id=facility_id, utility_type=utility_type, limit=limit
    )

@router.post("/connectors/{connector_id}/convert-to-analytics")
def convert_to_analytics(connector_id: int, db: Session = Depends(get_db)):
    count = UnifiedDataService.sync_erp_to_energy_records(db, connector_id)
    return {"status": "success", "converted_records_count": count}
