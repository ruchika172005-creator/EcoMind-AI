import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, Boolean, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class AnomalyRun(Base):
    __tablename__ = "anomaly_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    algorithm = Column(String(100), default="Isolation Forest")
    contamination = Column(Float, default=0.03) # expected proportion of outliers
    total_records_analyzed = Column(Integer, default=0)
    anomalies_detected = Column(Integer, default=0)
    threshold_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="anomaly_runs")
    results = relationship("AnomalyResult", back_populates="run", cascade="all, delete-orphan")


class AnomalyResult(Base):
    __tablename__ = "anomaly_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("anomaly_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, index=True)
    consumption_kwh = Column(Float, nullable=False)
    expected_kwh = Column(Float, nullable=True)  # Typical baseline for this time
    anomaly_score = Column(Float, nullable=False) # Negative / decision function score
    is_anomaly = Column(Boolean, default=True)
    severity = Column(String(50), default="Medium") # "Low", "Medium", "High", "Critical"
    explanation = Column(Text, nullable=True)     # Human-readable statistical explanation

    run = relationship("AnomalyRun", back_populates="results")

    __table_args__ = (
        Index("ix_anomaly_run_timestamp", "run_id", "timestamp"),
    )
