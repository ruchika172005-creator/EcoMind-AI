# EcoMind AI — User Manual & Operations Guide

Welcome to **EcoMind AI**, an enterprise sustainability decision-support platform designed to transform historical electrical telemetry into energy efficiency, cost savings, and emissions reduction.

---

## 1. Quick Start Walkthrough

### Step 1: Launch Backend and Frontend
Follow the instructions in the root `README.md` to start both Terminal 1 (FastAPI backend at `http://127.0.0.1:8000`) and Terminal 2 (Vite React frontend at `http://localhost:5173`).

### Step 2: Open Dashboard & Load Demonstration Data
Open `http://localhost:5173` in your web browser.
- If you don't have custom CSV data ready, simply click the **"Load Demo Data"** button in the top navbar.
- The system automatically imports **8,760 hourly readings** representing one year of continuous commercial campus energy telemetry.

---

## 2. Navigating the Intelligence Modules

### 📊 1. Executive Dashboard
- **KPI Overview**: Instant cards for Total Energy, Daily Average, Next 7-Day Forecast, Carbon Footprint, Anomalies Detected, and Potential Cost Savings.
- **Charts**:
  - *Historical Consumption Profile*: Sampled high-resolution time series curve.
  - *24-Hour Diurnal Pattern*: Compares peak working-day curves with off-hours setback.
  - *Monthly Consumption & Carbon*: Side-by-side energy volume and GHG output.

### 🗄️ 2. Energy Data Management
- **Upload CSV**: Drag and drop any meter CSV.
- **Data Quality Assessment**: Automatically detects row count, missing values, duplicate timestamps, negative values, and estimated sampling frequency.
- **Field Mapping**: Match your CSV columns to `timestamp` and `energy_consumption_kwh`, with optional `temperature`, `occupancy`, and `building_id`.
- **Missing Value Handling**: Select between linear interpolation, forward fill, or drop rows.

### 📈 3. Energy Analytics
- Dual-axis temperature vs energy load plot showing heating/cooling degree correlation.
- Weekday vs weekend 24-hour diurnal signatures.
- Monthly or 30-day daily aggregated load breakdowns.

### 🔮 4. Consumption Forecasting
- **Select Algorithm**: Choose between **Random Forest Regressor**, **XGBoost Regressor**, or **Seasonal Naive Benchmark**.
- **Configure Horizon**: 24h (1 day), 72h (3 days), 168h (7 days), or 336h (14 days).
- **Validation Split**: Set the chronological training percentage slider (e.g., 80% train / 20% test).
- **Review Results**: Inspect MAE, RMSE, WAPE, and R² scores, benchmark comparisons, and interactive prediction intervals.

### 🚨 5. Anomaly Detection
- Adjust the **Isolation Forest** contamination parameter (1% to 5%).
- View flagged anomaly events overlaid directly as red scatter markers on the load curve.
- Filter anomalies by severity (*Critical*, *High*, *Medium*, *Low*).
- Click any anomaly in the table to inspect surrounding values and root-cause explanations.

### 🌿 6. Carbon Analytics
- Choose standard regional emission factor presets (US EPA eGRID, UK Defra, EU-27) or enter custom factors.
- Review total Scope 2 emissions in Metric Tons CO2e.
- View EPA Greenhouse Gas Equivalencies: tree seedlings grown for 10 years, gasoline gallons consumed, and vehicle miles driven.

### 💡 7. AI Energy Recommendations
- Review prioritized energy conservation measures generated from observed telemetry.
- Inspect the exact statistical evidence (baseload ratio, night spikes, weekend HVAC).
- Review estimated annual cost, kWh, and carbon savings.
- Update action status directly (*Open*, *In Progress*, *Implemented*, *Dismissed*).

### 📑 8. Reports & Analytical Exports
- Download validated CSV files for each module:
  1. Validated Energy Records CSV
  2. Multi-Step Forecast CSV
  3. Detected Anomalies CSV
  4. Carbon Footprint Monthly CSV
  5. Actionable Recommendations CSV
- Click **"Print / Save as PDF"** to produce an executive sustainability audit.

### ⚙️ 9. Settings & Platform Health
- Modify default grid emission factors and electricity tariffs ($/kWh).
- Inspect database connection status, ORM dialect, and active machine learning runtimes.

### 🤖 10. AI Sustainability Assistant
- Click the **"AI Assistant"** button in the top navbar at any time.
- Ask questions in natural language:
  - *"What was the total energy consumption in the selected period?"*
  - *"What consumption is forecast for the next seven days?"*
  - *"Which unusual readings require investigation?"*
  - *"What is our estimated carbon impact?"*
  - *"Which recommendations have the strongest supporting evidence?"*
- Receive factual answers with verified data citations and follow-up prompts.
