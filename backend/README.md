# EcoMind AI — Backend API Service

Production-ready sustainability intelligence and energy analytics engine built with **FastAPI**, **SQLAlchemy ORM**, **Scikit-Learn**, and **XGBoost**.

---

## 🏗️ Architectural Overview

The backend is cleanly structured into decoupled domain layers:
- `app/api/routes/`: REST API endpoints for datasets, analytics, forecasting, anomaly detection, carbon accounting, recommendations, reports, assistant, and settings.
- `app/ml/`: Machine learning models including time-aware multi-step regressors (`forecaster.py`) and ensemble Isolation Forest (`anomaly_detector.py`).
- `app/services/`: Business logic for data ingestion, quality validation, Scope 2 GHG accounting, rule-based recommendation heuristics, and conversational assistant.
- `app/models/`: SQLAlchemy database models (Datasets, EnergyRecords, ForecastRuns, AnomalyRuns, CarbonCalculations, Recommendations, Settings).
- `app/schemas/`: Pydantic V2 request and response contracts.
- `app/core/`: Configuration via `pydantic-settings` reading from `.env`.
- `app/db/`: Session management and auto-initializing SQLite/PostgreSQL schema.

---

## 🚀 Running the Backend (Windows PowerShell)

Open PowerShell and navigate to the `backend/` directory:

```powershell
cd backend

# 1. Create virtual environment (if not already created)
python -m venv .venv

# 2. Activate virtual environment in PowerShell
.\.venv\Scripts\Activate.ps1
# If you encounter an execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Install dependencies
python -m pip install -r requirements.txt

# 4. Start the FastAPI Uvicorn development server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### URLs:
- **API Base**: `http://127.0.0.1:8000/api/v1`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

## 🧪 Running Automated Tests

Run the full pytest test suite:

```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```

This runs unit and integration tests across:
- System health checks
- In-memory database initialization
- Sample dataset ingestion and validation
- Supervised forecasting (XGBoost / Random Forest vs Seasonal Naive)
- Isolation Forest anomaly detection
- Scope 2 GHG carbon accounting & EPA equivalencies
- Heuristic energy efficiency recommendation engine
- AI Sustainability Assistant natural language queries
- CSV file export streaming for all modules

---

## ⚙️ Environment Variables (`.env`)

Copy `.env.example` to `.env` to configure:
```env
PROJECT_NAME="EcoMind AI - Enterprise Sustainability Intelligence Platform"
ENVIRONMENT="development"
DEBUG=True
DATABASE_URL="sqlite:///./ecomind.db"
DEFAULT_EMISSION_FACTOR=0.386
DEFAULT_ENERGY_TARIFF=0.14
```
