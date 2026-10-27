import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    model_name = Column(String(100), nullable=False) # e.g. "XGBoost Regressor", "Random Forest", "Seasonal Naive"
    horizon_hours = Column(Integer, nullable=False)  # e.g. 168 (7 days)
    train_split_ratio = Column(Float, default=0.8)
    
    # Validation Metrics on holdout set
    mae = Column(Float, nullable=True)   # Mean Absolute Error
    rmse = Column(Float, nullable=True)  # Root Mean Squared Error
    wape = Column(Float, nullable=True)  # Weighted Absolute Percentage Error (%)
    r2 = Column(Float, nullable=True)    # R-squared score
    
    hyperparameters = Column(Text, nullable=True) # JSON config
    model_comparison = Column(Text, nullable=True) # JSON comparison with baseline
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="forecast_runs")
    predictions = relationship("ForecastResult", back_populates="run", cascade="all, delete-orphan")


class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("forecast_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, index=True)
    predicted_kwh = Column(Float, nullable=False)
    lower_bound_kwh = Column(Float, nullable=True) # Confidence band lower
    upper_bound_kwh = Column(Float, nullable=True) # Confidence band upper
    actual_kwh = Column(Float, nullable=True)      # Populated when evaluating holdout test set

    run = relationship("ForecastRun", back_populates="predictions")

    __table_args__ = (
        Index("ix_forecast_run_timestamp", "run_id", "timestamp"),
    )
