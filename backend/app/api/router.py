from fastapi import APIRouter
from app.api.routes import (
    health,
    datasets,
    analytics,
    forecast,
    anomalies,
    carbon,
    recommendations,
    assistant,
    reports,
    settings,
    sustainability_score,
    esg,
    erp,
    iot,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Forecasting"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomaly Detection"])
api_router.include_router(carbon.router, prefix="/carbon", tags=["Carbon Accounting"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["AI Recommendations"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["Conversational Assistant"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Exports"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])

# Advanced Enterprise Sustainability Features
api_router.include_router(sustainability_score.router, prefix="/sustainability/scores", tags=["Sustainability Scoring"])
api_router.include_router(esg.router, prefix="/esg", tags=["ESG Reporting"])
api_router.include_router(erp.router, prefix="/integrations/erp", tags=["ERP Integrations"])
api_router.include_router(iot.router, prefix="/iot", tags=["IoT & Smart Meters"])
