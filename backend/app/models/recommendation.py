import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # e.g., "Baseload Reduction", "Peak Shaving", "HVAC Schedule", "Anomaly Investigation"
    priority = Column(String(50), nullable=False)  # "Critical", "High", "Medium", "Low"
    
    evidence = Column(Text, nullable=False)
    calculation_details = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    limitations = Column(Text, nullable=True)
    
    expected_savings_kwh = Column(Float, nullable=True)
    expected_savings_cost = Column(Float, nullable=True) # in configured currency ($)
    expected_savings_co2e_kg = Column(Float, nullable=True) # in kg CO2e
    
    status = Column(String(50), default="New") # "New", "In Review", "Implemented", "Dismissed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="recommendations")
