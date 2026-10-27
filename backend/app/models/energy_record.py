import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class EnergyRecord(Base):
    __tablename__ = "energy_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, index=True)
    consumption_kwh = Column(Float, nullable=False)
    
    # Optional contextual attributes
    building_id = Column(String(100), nullable=True)
    temperature_c = Column(Float, nullable=True)
    occupancy_pct = Column(Float, nullable=True)
    tariff_per_kwh = Column(Float, nullable=True)
    
    # Derived calendar attributes for fast aggregation
    hour_of_day = Column(Integer, nullable=True) # 0-23
    day_of_week = Column(Integer, nullable=True) # 0-6 (0=Mon)
    month = Column(Integer, nullable=True)       # 1-12
    is_weekend = Column(Boolean, default=False)
    
    dataset = relationship("Dataset", back_populates="records")

    __table_args__ = (
        Index("ix_dataset_timestamp", "dataset_id", "timestamp"),
    )
