from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.db.session import init_db
from app.api.router import api_router
from app.integrations.iot.mqtt_client import mqtt_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables and seed defaults on startup
    init_db()
    # Start MQTT telemetry subscriber if enabled
    mqtt_service.start()
    yield
    # Stop MQTT subscriber cleanly
    mqtt_service.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    description="EcoMind AI — Enterprise Sustainability Intelligence Platform. Real time-aware forecasting, Isolation Forest anomaly detection, carbon accounting, sustainability scoring, ESG reporting, ERP connectors, and IoT smart-meter integration.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all; configurable via settings.BACKEND_CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
