import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class ERPConnector(Base):
    __tablename__ = "erp_connectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    connector_type = Column(String(50), nullable=False) # "SIMULATED", "GENERIC_REST", "SAP", "NETSUITE", "DYNAMICS_365", "CSV_IMPORT"
    endpoint_url = Column(String(512), nullable=True)
    auth_type = Column(String(50), default="NONE") # "NONE", "API_KEY", "BEARER_TOKEN", "OAUTH2", "BASIC"
    credentials_masked = Column(String(255), nullable=True) # Redacted display e.g. "sk_live_****3a9f"
    
    field_mapping = Column(Text, nullable=True) # JSON field mapping dictionary
    is_simulated = Column(Boolean, default=False)
    status = Column(String(50), default="CONFIGURED") # "CONNECTED", "CONFIGURED", "DISCONNECTED", "ERROR"
    
    last_sync_time = Column(DateTime, nullable=True)
    last_sync_status = Column(String(50), nullable=True) # "SUCCESS", "FAILED", "PARTIAL"
    last_sync_records_count = Column(Integer, default=0)
    error_details = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    sync_runs = relationship("ERPSyncRun", back_populates="connector", cascade="all, delete-orphan")
    records = relationship("ERPUtilityRecord", back_populates="connector", cascade="all, delete-orphan")


class ERPSyncRun(Base):
    __tablename__ = "erp_sync_runs"

    id = Column(Integer, primary_key=True, index=True)
    connector_id = Column(Integer, ForeignKey("erp_connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="IN_PROGRESS") # "IN_PROGRESS", "SUCCESS", "FAILED", "PARTIAL"
    
    records_imported = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    data_quality_issues = Column(Text, nullable=True) # JSON array of warnings
    details = Column(Text, nullable=True)

    connector = relationship("ERPConnector", back_populates="sync_runs")


class ERPUtilityRecord(Base):
    __tablename__ = "erp_utility_records"

    id = Column(Integer, primary_key=True, index=True)
    connector_id = Column(Integer, ForeignKey("erp_connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    external_transaction_id = Column(String(100), nullable=False, index=True) # For idempotent deduplication
    
    facility_id = Column(String(100), default="HQ-BLDG-01", index=True)
    utility_type = Column(String(50), nullable=False) # "ELECTRICITY", "WATER", "NATURAL_GAS", "DIESEL", "WASTE"
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    billed_quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False) # "kWh", "m³", "therms", "litres", "kg"
    total_cost = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    invoice_number = Column(String(100), nullable=True)
    
    provenance = Column(String(50), default="Measured") # "Measured", "Estimated", "Simulated"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    connector = relationship("ERPConnector", back_populates="records")

    __table_args__ = (
        Index("ix_erp_rec_conn_extid", "connector_id", "external_transaction_id", unique=True),
    )
