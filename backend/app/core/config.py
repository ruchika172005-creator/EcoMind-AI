from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "EcoMind AI - Enterprise Sustainability Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    
    # Database URL (SQLite fallback by default, PostgreSQL supported)
    DATABASE_URL: str = "sqlite:///./ecomind.db"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    EXPORTS_DIR: str = "./exports"
    REPORTS_DIR: str = "./reports_pdf"
    
    # Default Emission Factors (kg CO2e / kWh)
    DEFAULT_EMISSION_FACTOR: float = 0.386  # US EPA eGRID average
    DEFAULT_EMISSION_FACTOR_NAME: str = "US EPA eGRID National Average"
    
    # Default Energy Tariff ($ / kWh) for savings calculations
    DEFAULT_ENERGY_TARIFF: float = 0.14
    
    # IoT and Smart Meter Configuration
    IOT_API_KEY: str = "ecomind-iot-ingest-key-2026"
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "ecomind/meters"
    MQTT_CLIENT_ID: str = "ecomind-backend-subscriber"
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_ENABLED: bool = False
    
    # ERP Configuration
    ERP_ENCRYPTION_SECRET: str = "ecomind-erp-safe-secret-key"
    
    # Optional LLM API keys
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
