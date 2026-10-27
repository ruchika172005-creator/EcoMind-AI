import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class SustainabilityScoreConfig(Base):
    __tablename__ = "sustainability_score_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), default="Standard Corporate Sustainability Scoring")
    
    # Weights for each dimension (must be non-negative and sum to 1.0 or 100%)
    weight_environmental = Column(Float, default=0.35)
    weight_energy = Column(Float, default=0.25)
    weight_carbon = Column(Float, default=0.20)
    weight_water = Column(Float, default=0.10)
    weight_waste = Column(Float, default=0.10)
    
    # Benchmark targets for normalization
    target_energy_intensity = Column(Float, default=20.0) # kWh / sqft / year or kWh / unit
    target_carbon_intensity = Column(Float, default=8.0)  # kg CO2e / unit
    target_water_intensity = Column(Float, default=0.8)   # m³ / unit
    target_waste_diversion = Column(Float, default=70.0)  # % diverted (higher is better)
    target_anomaly_rate = Column(Float, default=0.02)     # max 2% anomaly rate
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    runs = relationship("SustainabilityScoreRun", back_populates="config")


class SustainabilityScoreRun(Base):
    __tablename__ = "sustainability_score_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    config_id = Column(Integer, ForeignKey("sustainability_score_configs.id", ondelete="SET NULL"), nullable=True)
    facility_id = Column(String(100), nullable=True)
    
    # Dimensions (0 to 100 scale)
    overall_score = Column(Float, nullable=False)
    environmental_score = Column(Float, nullable=False)
    energy_efficiency_score = Column(Float, nullable=False)
    carbon_performance_score = Column(Float, nullable=False)
    water_efficiency_score = Column(Float, nullable=True)
    waste_management_score = Column(Float, nullable=True)
    
    # Coverage & Confidence
    data_completeness_pct = Column(Float, default=100.0)
    grade = Column(String(10), default="B") # "A+", "A", "B+", "B", "C", "D", "F"
    
    # JSON breakdown & recommendations
    breakdown_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)
    methodology_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    config = relationship("SustainabilityScoreConfig", back_populates="runs")
