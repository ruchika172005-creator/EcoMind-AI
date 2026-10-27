import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class ESGIndicator(Base):
    __tablename__ = "esg_indicators"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False) # "Environmental", "Social", "Governance"
    code = Column(String(50), unique=True, nullable=False, index=True) # e.g. "GRI-302-1"
    name = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=False) # e.g. "kWh", "MT CO2e", "m³", "%", "Hours", "Count"
    description = Column(Text, nullable=True)
    framework = Column(String(100), default="GRI / ISSB")
    is_mandatory = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    values = relationship("ESGIndicatorValue", back_populates="indicator", cascade="all, delete-orphan")


class ESGIndicatorValue(Base):
    __tablename__ = "esg_indicator_values"

    id = Column(Integer, primary_key=True, index=True)
    indicator_id = Column(Integer, ForeignKey("esg_indicators.id", ondelete="CASCADE"), nullable=False, index=True)
    facility_id = Column(String(100), nullable=True, default="All Facilities")
    reporting_period = Column(String(50), nullable=False, index=True) # e.g. "2024-Annual", "2024-Q1"
    
    numeric_value = Column(Float, nullable=True)
    text_value = Column(String(255), nullable=True)
    
    # Provenance & Auditability
    provenance = Column(String(50), default="Measured") # "Measured", "Estimated", "User-Entered", "Simulated"
    data_source = Column(String(255), default="Automated System")
    status = Column(String(50), default="Verified") # "Verified", "Pending Review", "Not Measured", "Not Provided"
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    indicator = relationship("ESGIndicator", back_populates="values")


class ESGReport(Base):
    __tablename__ = "esg_reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    organization_name = Column(String(255), default="Enterprise Operations")
    facility_id = Column(String(100), default="All Facilities")
    reporting_period = Column(String(50), nullable=False)
    framework_alignment = Column(String(100), default="GRI Standards / ISSB S2")
    
    completeness_score = Column(Float, default=100.0)
    status = Column(String(50), default="Published") # "Draft", "Approved", "Published"
    
    summary_json = Column(Text, nullable=True) # Full structured indicator report cache
    pdf_filename = Column(String(255), nullable=True)
    methodology_version = Column(String(50), default="EcoMind ESG Core v2.4")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
