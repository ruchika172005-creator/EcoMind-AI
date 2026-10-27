# EcoMind AI — System Architecture & Methodology Specification

## 1. High-Level Architecture

EcoMind AI is structured around strict separation of concerns, decoupling the heavy analytical, statistical, and machine-learning processing from the presentation layer.

```
+-------------------------------------------------------------------------+
|                           CLIENT TIER (Frontend)                        |
|   React 19 | TypeScript | Vite | Tailwind CSS | Recharts | Lucide React |
|                                                                         |
|  [Dashboard] [Data Mgmt] [Analytics] [Forecaster] [Anomalies] [Carbon]  |
|         [AI Recommendations] [Reporting & Exports] [Assistant]         |
+------------------------------------+------------------------------------+
                                     | HTTP REST (JSON)
                                     v
+-------------------------------------------------------------------------+
|                         APPLICATION TIER (Backend)                      |
|                  FastAPI | Pydantic V2 | Uvicorn Worker                 |
|                                                                         |
|  [/api/v1/health]  [/api/v1/datasets]  [/api/v1/analytics]             |
|  [/api/v1/forecast]  [/api/v1/anomalies]  [/api/v1/carbon]             |
|  [/api/v1/recommendations]  [/api/v1/assistant]  [/api/v1/reports]     |
+------------------------------------+------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
+-----------------------------+               +-----------------------------+
|     DATA SCIENCE & ML       |               |     PERSISTENCE & ORM       |
|                             |               |                             |
|  - Feature Engineering      |               |  - SQLAlchemy 2.0 ORM       |
|  - XGBoost & Random Forest  |               |  - SQLite (Dev fallback)    |
|  - Seasonal-Naive Baseline  |               |  - PostgreSQL (Production)  |
|  - Isolation Forest Anomaly |               |  - Automatic Schema Init    |
|  - EPA GHG Carbon Engine    |               |  - Atomic Transactions      |
|  - Rule Recommendation Sys  |               +-----------------------------+
+-----------------------------+
```

---

## 2. Machine Learning Methodology

### 2.1 Time-Aware Supervised Forecaster (`forecaster.py`)
- **Feature Engineering**:
  - Temporal cyclical features: Hour of day, day of week, day of month, month of year, weekend boolean.
  - Lag features: Lag 1 hour, Lag 24 hours (previous day same hour), Lag 168 hours (previous week same hour).
  - Rolling aggregations: Rolling 24-hour mean, rolling 24-hour standard deviation, rolling 168-hour baseline.
  - Ambient weather & occupancy correlations (when available).
- **Leakage Prevention**:
  - Chronological splitting: The dataset is split sequentially (default 80% train / 20% validation).
  - No future observations are used in computing rolling statistics.
- **Models Evaluated**:
  - **Seasonal Naive Benchmark**: Uses Lag 168 (consumption at identical hour in previous week).
  - **Random Forest Regressor**: Ensemble of decision trees capturing nonlinear schedule transitions.
  - **XGBoost Regressor**: Gradient boosted decision trees optimized for time series tabular features.
- **Model Evaluation Metrics**:
  - **MAE** (Mean Absolute Error): Average absolute magnitude of deviation in kWh.
  - **RMSE** (Root Mean Squared Error): Quadratic scoring penalizing extreme errors.
  - **WAPE** (Weighted Absolute Percentage Error): $\frac{\sum |y_i - \hat{y}_i|}{\sum y_i}$, robust against division-by-zero on low/zero baseload readings.
  - **$R^2$ Score**: Coefficient of determination measuring proportion of variance explained.

### 2.2 Unsupervised Anomaly Detection (`anomaly_detector.py`)
- **Algorithm**: **Isolation Forest** (Scikit-Learn).
- **Core Concept**: An ensemble of isolation trees that recursively partition feature space. Anomalies isolate with significantly fewer random splits than normal observations.
- **Features Used**: Standardized hourly consumption, hour-of-day, day-of-week, weekend flag, and rolling 24-hour mean deviation.
- **Severity Scoring**:
  - **Critical**: Anomaly Score $\le -0.20$ and Deviation $\ge 60\%$.
  - **High**: Anomaly Score $\le -0.12$ and Deviation $\ge 35\%$.
  - **Medium**: Anomaly Score $\le -0.05$ and Deviation $\ge 20\%$.
  - **Low**: Moderate statistical outliers ($< 20\%$ deviation).

### 2.3 Scope 2 Carbon Accounting (`carbon_service.py`)
- **Formula**:
  $$\text{Emissions } (\text{kg } \text{CO}_2\text{e}) = \text{Energy Consumed } (\text{kWh}) \times \text{Emission Factor } \left(\frac{\text{kg } \text{CO}_2\text{e}}{\text{kWh}}\right)$$
- **Equivalency Calculations**:
  - Tree seedlings grown for 10 years: $\text{Emissions (MT)} \times 16.5$
  - Gallons of gasoline: $\frac{\text{Emissions (kg)}}{8.887}$
  - Passenger vehicle miles: $\frac{\text{Emissions (kg)}}{0.400}$
  - Homes electricity for one year: $\frac{\text{Emissions (MT)}}{7.5}$

---

## 3. Database Schema

- **`datasets`**: Metadata including filename, row count, date ranges, total/average/min/max consumption, demo flag.
- **`energy_records`**: Raw and cleaned time series observations (`dataset_id`, `timestamp`, `consumption_kwh`, `building_id`, `temperature_c`, `occupancy_pct`, `is_weekend`, `hour_of_day`, `day_of_week`, `month`).
- **`forecast_runs` & `forecast_results`**: Historical runs, model selection, hyperparameters, evaluation metrics (MAE, RMSE, WAPE, R²), prediction intervals.
- **`anomaly_runs` & `anomaly_results`**: Algorithm, contamination factor, anomaly flags, deviation percentage, diagnostic explanations.
- **`carbon_calculations`**: Traceable emission factors, total kg & MT CO2e, EPA equivalencies, monthly breakdowns.
- **`recommendations`**: AI-generated energy conservation roadmaps, priority levels, telemetry evidence, action roadmaps, expected cost/kWh savings, status trackers.
- **`system_settings`**: Global configuration key-value storage.
