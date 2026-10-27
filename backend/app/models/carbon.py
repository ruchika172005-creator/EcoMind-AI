import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class CarbonCalculation(Base):
    __tablename__ = "carbon_calculations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    emission_factor = Column(Float, nullable=False) # kg CO2e / kWh
    factor_source = Column(String(255), nullable=False)
    
    total_energy_kwh = Column(Float, nullable=False)
    total_emissions_kg_co2e = Column(Float, nullable=False)
    total_emissions_mt_co2e = Column(Float, nullable=False) # Metric tonnes
    
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    
    # Equivalencies (EPA greenhouse gas equivalencies)
    gasoline_gallons_equiv = Column(Float, nullable=True)
    tree_seedlings_grown_10yr = Column(Float, nullable=True)
    passenger_vehicle_miles = Column(Float, nullable=True)
    homes_electricity_year = Column(Float, nullable=True)
    
    breakdown_by_month = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="carbon_calculations")
