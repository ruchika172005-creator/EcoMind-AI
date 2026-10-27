import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db, is_sqlite
from app.core.config import settings
from app.models.dataset import Dataset
from app.schemas.setting import SystemHealthResponse

router = APIRouter()

@router.get("/health", response_model=SystemHealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False
        
    dataset_count = 0
    if db_connected:
        try:
            dataset_count = db.query(Dataset).count()
        except Exception:
            pass
            
    models = ["Isolation Forest (Scikit-Learn)", "Random Forest Regressor (Scikit-Learn)", "Seasonal Naive Baseline"]
    try:
        import xgboost
        models.append("XGBoost Regressor")
    except ImportError:
        pass
        
    return SystemHealthResponse(
        status="healthy" if db_connected else "degraded",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database_connected=db_connected,
        database_dialect="sqlite" if is_sqlite else "postgresql",
        active_datasets_count=dataset_count,
        models_available=models,
        timestamp=datetime.datetime.utcnow()
    )
