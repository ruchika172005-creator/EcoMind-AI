import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    total_consumption_kwh = Column(Float, default=0.0)
    avg_consumption_kwh = Column(Float, default=0.0)
    min_consumption_kwh = Column(Float, default=0.0)
    max_consumption_kwh = Column(Float, default=0.0)
    
    is_demo = Column(Boolean, default=False)
    column_mapping = Column(Text, nullable=True) # JSON string
    data_frequency = Column(String(50), default="hourly")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    records = relationship("EnergyRecord", back_populates="dataset", cascade="all, delete-orphan")
    forecast_runs = relationship("ForecastRun", back_populates="dataset", cascade="all, delete-orphan")
    anomaly_runs = relationship("AnomalyRun", back_populates="dataset", cascade="all, delete-orphan")
    carbon_calculations = relationship("CarbonCalculation", back_populates="dataset", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="dataset", cascade="all, delete-orphan")
