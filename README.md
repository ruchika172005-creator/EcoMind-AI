# EcoMind AI — Enterprise Sustainability Intelligence Platform

> **University Major Project**: Complete, production-style, AI-driven energy sustainability decision-support platform for organizations, universities, commercial campuses, hospitals, and industrial facilities.

![EcoMind AI Architecture](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4+-F7931E?style=flat&logo=scikit-learn&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-2072AF?style=flat&logo=xgboost&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

---

## 🌟 Executive Summary

**EcoMind AI** transforms raw, timestamped electricity consumption telemetry, enterprise ERP utility invoices, and real-time IoT smart-meter streams into actionable sustainability intelligence. The platform delivers:

### Core Data-Science Pipelines
- **Energy Load Analytics**: Weather correlation, 24-hour diurnal patterns, and periodic load aggregation.
- **Machine Learning Forecasting**: Multi-step horizon energy demand predictions with prediction intervals comparing **XGBoost Regressors**, **Random Forest Regressors**, and **Seasonal-Naive Baselines**.
- **Ensemble Anomaly Detection**: Unsupervised **Isolation Forest** algorithms detecting equipment malfunctions, unmanaged weekend HVAC running, and night surges.
- **Scope 2 Carbon Accounting**: Traceable GHG footprint calculation with standard EPA eGRID / UK Defra / EU-27 emission factors and U.S. EPA greenhouse gas equivalencies.
- **AI-Driven Conservation Measures**: Data-backed energy conservation roadmaps synthesized from load floors and statistical telemetry evidence.
- **Conversational Assistant**: Contextual AI assistant delivering factual, citation-backed answers to facility inquiries.

### Advanced Enterprise Sustainability Modules
- **Sustainability Scoring Engine**: Explainable, configurable weighted scoring (0–100) with dynamic weight rebalancing for missing indicators, target benchmark normalization, directionality rules, and transparent confidence/coverage metrics.
- **ESG Reporting Module (GRI & ISSB S2)**: Modular indicator registry for Environmental, Social, and Governance disclosures with provenance tracking (Measured, Estimated, User-Entered, Simulated), structured CSV exports, and dynamic multi-page **ReportLab PDF generation**.
- **ERP Integration Architecture**: Secure connector ecosystem supporting SAP S/4HANA OData, Oracle NetSuite, Microsoft Dynamics 365, Generic REST, CSV imports, and a synthetic sandbox simulator. Features SSRF firewall protection and secret masking.
- **IoT & Smart-Meter Integration Engine**: Telemetry ingestion engine strictly distinguishing instantaneous active power (**kW**) from cumulative energy (**kWh**), featuring HTTP REST ingestion, **Paho MQTT v2** subscriber support, threshold breach alerting, and a multi-meter simulator with anomaly injection.
- **Unified Analytics Pipeline**: Reconciles and merges ERP billing and IoT streams into the core forecasting and anomaly detection engine without duplicate counting.

---

## 🏛️ Project Architecture

```
EcoMind-AI/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── public/                   # Static assets & favicons
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with typed contracts
│   │   ├── components/           # Reusable UI cards, tables, badges, modals
│   │   ├── context/              # Global dataset selection context
│   │   ├── layouts/              # Shared shell layout with Sidebar & Navbar
│   │   ├── pages/                # 13 dedicated functional intelligence pages
│   │   ├── test/                 # Vitest test suite and setup
│   │   ├── types/                # TypeScript interfaces mirroring API schemas
│   │   ├── App.tsx               # Client-side routing table
│   │   ├── main.tsx              # Application entry point
│   │   └── index.css             # Tailwind design system & utilities
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/                      # Python 3.12+ FastAPI backend
│   ├── app/
│   │   ├── api/routes/           # REST API endpoints (Analytics, Forecast, ESG, ERP, IoT...)
│   │   ├── core/                 # Pydantic-Settings environment configuration
│   │   ├── db/                   # SQLAlchemy engine, session, auto-seeder
│   │   ├── integrations/         # Enterprise integrations
│   │   │   ├── erp/              # Connectors (SAP, NetSuite, Dynamics, REST, SSRF guard)
│   │   │   └── iot/              # Ingestion, MQTT client, Smart-meter simulator
│   │   ├── ml/                   # Forecaster & Isolation Forest detectors
│   │   ├── models/               # SQLAlchemy ORM database models
│   │   ├── schemas/              # Pydantic V2 input & response schemas
│   │   ├── services/             # Scoring, ESG ReportLab PDF, Unified data layer
│   │   └── main.py               # FastAPI application lifecycle, CORS, & MQTT init
│   ├── tests/                    # Pytest automated test suite (12 test suites)
│   ├── scripts/                  # Synthetic campus data generator
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
│
├── data/
│   └── sample/                   # 8,760-row commercial campus demonstration CSV
│
├── docs/                         # Extended methodology & user manual
├── start_project.bat             # Dual-terminal Windows launcher
└── README.md                     # Master documentation
```

---

## ⚡ Launching the Application (Two Independent Terminals)

### 🖥️ Terminal 1 — Backend (FastAPI API)

Open **Windows PowerShell** in the project root:

```powershell
cd backend

# 1. Create virtual environment (if not already created)
python -m venv .venv

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1
# If PowerShell execution policy blocks activation, run once:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Install Python dependencies
python -m pip install -r requirements.txt

# 4. Run the FastAPI development server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Backend URLs:**
> - Swagger Interactive API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
> - Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

### 🖥️ Terminal 2 — Frontend (Vite + React)

Open a **second Windows PowerShell terminal** in the project root:

```powershell
cd frontend

# 1. Install frontend packages
npm install --legacy-peer-deps

# 2. Start Vite development server
npm run dev
```

> **Frontend Dashboard URL:**
> - Open in your browser: [http://localhost:5173](http://localhost:5173/)

---

### 🚀 Optional One-Click Launcher (`start_project.bat`)

For convenience, double-click **`start_project.bat`** in the root directory to automatically launch both the backend API and frontend Vite server in dedicated command prompt windows.

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```
*Tests coverage: health endpoint, in-memory SQLite initialization, demo data loading, XGBoost/Random Forest forecasting, Isolation Forest anomaly scoring, carbon calculators, recommendation rules, conversational assistant, and streaming CSV exports.*

### Frontend Unit Tests (Vitest)
```powershell
cd frontend
npm test
```
*Tests coverage: KPICard metrics, Badge status variants, LoadingSpinner feedback, and component rendering.*

---

## 📖 Step-by-Step User Workflow

1. **Access Dashboard**: Navigate to `http://localhost:5173`.
2. **Instant Demo Mode**: If no dataset is active, click **"Load Demo Campus Dataset"** in the top navigation bar or welcome empty state. This immediately loads 8,760 hourly readings (1 full year) of commercial campus telemetry with HVAC cooling cycles, occupancy rhythms, and injected anomalies.
3. **Inspect Executive KPIs**: View cumulative electricity consumption, average daily load, active baseload floor, forecasted next 7-day usage, carbon footprint in Metric Tons, and potential annual dollar savings.
4. **Energy Load Analytics**: Navigate to **Energy Analytics** to explore dual-axis temperature vs energy profiles, 24-hour diurnal weekday vs weekend curves, and monthly/daily aggregations.
5. **Train Forecast Models**: Navigate to **Consumption Forecasting**. Select your preferred model (e.g. *Random Forest* or *XGBoost*), adjust your forecast horizon (24h to 336h), configure the train/test split slider, and click **"Train & Generate Forecast"**. Review MAE, RMSE, WAPE, and R² scores alongside baseline comparisons and confidence intervals.
6. **Detect Anomalies**: Navigate to **Anomaly Detection**. Choose a contamination rate (e.g., 2%) and fit the **Isolation Forest** model. Inspect the red anomaly markers on the time series, filter by severity (Critical/High/Medium/Low), and click any row to review diagnostic explanations.
7. **Scope 2 Carbon Accounting**: Navigate to **Carbon Analytics**. Switch between regional grid presets (US EPA eGRID, UK Defra, EU-27) or enter custom factors to recalculate emissions and view EPA GHG equivalencies (tree seedlings, gasoline gallons, vehicle miles).
8. **Act on AI Recommendations**: Navigate to **AI Recommendations**. Review data-backed energy conservation measures, inspect observed evidence from telemetry, calculate annual cost savings, and update implementation statuses (*In Progress*, *Implemented*, *Dismissed*).
9. **Query AI Assistant**: Click the **"AI Assistant"** button in the top navbar to open the interactive drawer. Ask questions like *"What was the total consumption?"*, *"What is forecast for the next 7 days?"*, or *"Which anomalies need investigation?"* to receive factual, citation-backed answers.
10. **Export & Print**: Navigate to **Reports & Exports** to download validated CSV files for each domain module or click **"Print / Save as PDF"** for executive presentation.
11. **Explainable Sustainability Scoring**: Navigate to **Sustainability Score** (`/sustainability-score`). Click **"Run Scoring Analysis"** to evaluate energy intensity, carbon intensity, anomaly frequency, renewable share, water, and waste. Inspect pillar scores, dynamic coverage percentages, metric formulas, and actionable improvement recommendations. Click **"Configure Weights & Benchmarks"** to customize indicator weights (validated to sum to 100%).
12. **GRI / ISSB ESG Disclosures & ReportLab PDF**: Navigate to **ESG Reports** (`/esg-reports`). Select a reporting period and facility boundary, review indicator coverage, and click **"Generate ESG Report"**. Click **"Export ReportLab PDF"** to compile and download a formal multi-page PDF disclosure document, or **"Export Structured CSV"** for machine-readable data.
13. **ERP Utility Sync & SSRF Firewall**: Navigate to **ERP Integrations** (`/erp-integrations`). Inspect registered connectors (SAP S/4HANA OData, NetSuite, Dynamics 365, CSV Importer). Click **"Test Connection"** on the Simulated SAP connector, then click **"Synchronize Records"** to ingest electricity, water, gas, and waste utility records. View real-time synchronization history, imported record counts, and SSRF security firewall statuses.
14. **IoT Smart Meters & Live Telemetry Stream**: Navigate to **IoT & Smart Meters** (`/iot-devices`). View connected devices, active power (**kW**), cumulative energy (**kWh**), and telemetry status. Click **"Single Step Simulation"** to stream instantaneous readings, or click **"Inject Peak Surge (&gt; 450 kW)"** to trigger and test real-time threshold breach alerts. Acknowledge and resolve alerts with full audit logs.

> For deep architectural details, mathematical formulations, and security policies, see [docs/ENTERPRISE_MODULES.md](file:///e:/major%20project/docs/ENTERPRISE_MODULES.md).

---

## 🛡️ Security & Reliability Best Practices

- **Strict Frontend-Backend Separation**: The frontend communicates solely through documented HTTP REST APIs. No ML code executes in TypeScript.
- **SQLAlchemy ORM Database Layer**: Automatic table creation on startup. Safe fallback to SQLite for zero-configuration local evaluation, with out-of-the-box PostgreSQL support via `DATABASE_URL`.
- **Environment Isolation**: No hardcoded passwords, tokens, or paths. Configured via `.env` with `.env.example` templates.
- **Safe CSV Ingestion**: Server-side file validation, memory caps, automatic timestamp parsing, missing-value interpolation, and duplicate detection.

---

## 📜 Academic Major Project Compliance
Developed as a production-grade university capstone major project adhering to rigorous software engineering, machine learning rigor, time-series validation principles, and modern enterprise UI/UX standards.
#   E c o M i n d - A I  
 