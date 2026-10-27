import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.erp import ERPConnector, ERPSyncRun, ERPUtilityRecord
from app.schemas.erp import (
    ERPConnectorResponse,
    ERPConnectorCreateRequest,
    ERPSyncRunResponse,
    ERPUtilityRecordResponse,
    ERPSyncTriggerRequest
)
from app.integrations.erp.security import ERPSecurity
from app.integrations.erp.simulated_connector import SimulatedERPConnector
from app.integrations.erp.generic_rest_connector import GenericRESTConnector
from app.integrations.erp.vendor_adapters import SAPConnector, NetSuiteConnector, Dynamics365Connector

class ERPIntegrationService:
    @staticmethod
    def get_connector_instance(connector: ERPConnector):
        cfg = {
            "endpoint_url": connector.endpoint_url,
            "auth_type": connector.auth_type,
            "field_mapping": connector.field_mapping,
            "is_simulated": connector.is_simulated,
        }
        
        if connector.is_simulated or connector.connector_type == "SIMULATED":
            return SimulatedERPConnector(connector.id, connector.name, cfg)
        elif connector.connector_type == "GENERIC_REST":
            return GenericRESTConnector(connector.id, connector.name, cfg)
        elif connector.connector_type == "SAP":
            return SAPConnector(connector.id, connector.name, cfg)
        elif connector.connector_type == "NETSUITE":
            return NetSuiteConnector(connector.id, connector.name, cfg)
        elif connector.connector_type == "DYNAMICS_365":
            return Dynamics365Connector(connector.id, connector.name, cfg)
        else:
            return SimulatedERPConnector(connector.id, connector.name, cfg)

    @classmethod
    def test_connection(cls, db: Session, connector_id: int) -> Tuple[bool, str]:
        connector = db.query(ERPConnector).filter_by(id=connector_id).first()
        if not connector:
            return False, "Connector not found."

        instance = cls.get_connector_instance(connector)
        success, message = instance.test_connection()

        connector.status = "CONNECTED" if success else "ERROR"
        connector.error_details = None if success else message
        db.commit()

        return success, message

    @classmethod
    def synchronize(cls, db: Session, req: ERPSyncTriggerRequest) -> ERPSyncRunResponse:
        connector = db.query(ERPConnector).filter_by(id=req.connector_id).first()
        if not connector:
            raise ValueError("Connector not found.")

        # Create SyncRun record in IN_PROGRESS state
        sync_run = ERPSyncRun(
            connector_id=connector.id,
            status="IN_PROGRESS",
            records_imported=0,
            records_skipped=0
        )
        db.add(sync_run)
        db.commit()
        db.refresh(sync_run)

        instance = cls.get_connector_instance(connector)
        warnings: List[str] = []
        imported_count = 0
        skipped_count = 0

        try:
            if req.simulate_error:
                raise RuntimeError("Simulated network timeout during ERP payload transmission.")

            raw_records = instance.fetch_records(limit=req.limit_records)
            normalized_records, norm_warnings = instance.map_and_normalize(raw_records)
            warnings.extend(norm_warnings)

            for rec in normalized_records:
                tx_id = rec["external_transaction_id"]
                # Idempotent deduplication check
                existing = db.query(ERPUtilityRecord).filter_by(
                    connector_id=connector.id,
                    external_transaction_id=tx_id
                ).first()

                if existing:
                    skipped_count += 1
                    continue

                db_rec = ERPUtilityRecord(
                    connector_id=connector.id,
                    external_transaction_id=tx_id,
                    facility_id=rec.get("facility_id", "HQ-BLDG-01"),
                    utility_type=rec["utility_type"],
                    billing_period_start=rec["billing_period_start"],
                    billing_period_end=rec["billing_period_end"],
                    billed_quantity=rec["billed_quantity"],
                    unit=rec["unit"],
                    total_cost=rec["total_cost"],
                    currency=rec.get("currency", "USD"),
                    invoice_number=rec.get("invoice_number"),
                    provenance=rec.get("provenance", "Measured")
                )
                db.add(db_rec)
                imported_count += 1

            db.commit()

            sync_status = "PARTIAL" if (warnings and imported_count > 0) else "SUCCESS"
            sync_run.status = sync_status
            sync_run.completed_at = datetime.datetime.utcnow()
            sync_run.records_imported = imported_count
            sync_run.records_skipped = skipped_count
            sync_run.data_quality_issues = json.dumps(warnings) if warnings else None
            sync_run.details = f"Successfully synchronized {imported_count} records ({skipped_count} duplicates skipped)."

            connector.last_sync_time = sync_run.completed_at
            connector.last_sync_status = sync_status
            connector.last_sync_records_count = imported_count
            connector.status = "CONNECTED"
            connector.error_details = None
            db.commit()

        except Exception as e:
            db.rollback()
            sync_run.status = "FAILED"
            sync_run.completed_at = datetime.datetime.utcnow()
            sync_run.details = f"Sync failed: {str(e)}"
            connector.last_sync_time = sync_run.completed_at
            connector.last_sync_status = "FAILED"
            connector.status = "ERROR"
            connector.error_details = str(e)
            db.commit()

        return ERPSyncRunResponse(
            id=sync_run.id,
            connector_id=connector.id,
            connector_name=connector.name,
            started_at=sync_run.started_at,
            completed_at=sync_run.completed_at,
            status=sync_run.status,
            records_imported=sync_run.records_imported,
            records_skipped=sync_run.records_skipped,
            data_quality_issues=warnings,
            details=sync_run.details
        )

    @staticmethod
    def get_utility_records(
        db: Session,
        facility_id: Optional[str] = None,
        utility_type: Optional[str] = None,
        limit: int = 50
    ) -> List[ERPUtilityRecordResponse]:
        query = db.query(ERPUtilityRecord)
        if facility_id and facility_id != "All Facilities":
            query = query.filter(ERPUtilityRecord.facility_id == facility_id)
        if utility_type:
            query = query.filter(ERPUtilityRecord.utility_type == utility_type.upper())
            
        records = query.order_by(ERPUtilityRecord.billing_period_start.desc()).limit(limit).all()
        return [ERPUtilityRecordResponse.from_orm(r) for r in records]
