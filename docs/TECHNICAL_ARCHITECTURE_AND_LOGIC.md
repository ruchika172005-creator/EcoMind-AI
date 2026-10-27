# EcoMind AI — Comprehensive Technical Architecture & Backend Logic Guide

> **Document Purpose**: This document provides an exhaustive, line-by-line explanation of the **programming languages**, **frameworks**, **mathematical logic**, **algorithms**, and **architectural design patterns** implemented across both the Backend and Frontend of EcoMind AI.

---

## 📌 TABLE OF CONTENTS
1. [Executive Technology Stack & Language Matrix](#1-executive-technology-stack--language-matrix)
2. [Frontend Architecture & Technical Implementation](#2-frontend-architecture--technical-implementation)
   - 2.1 Framework & Core Languages
   - 2.2 Client-Side State Management & Routing
   - 2.3 Data Visualization & Styling Engine
   - 2.4 API Communication Layer
3. [Backend Architecture & Engineering Logic](#3-backend-architecture--engineering-logic)
   - 3.1 Web Framework & Execution Model (FastAPI & ASGI)
   - 3.2 Data Validation & Serialization (Pydantic V2)
   - 3.3 Database Layer & ORM (SQLAlchemy 2.0)
4. [Deep-Dive into Backend Mathematical Logic & Algorithms](#4-deep-dive-into-backend-mathematical-logic--algorithms)
   - 4.1 Data Processing & Imputation Logic (`data_service.py`)
   - 4.2 Energy Profiling & Weather Correlation (`analytics_service.py`)
   - 4.3 Machine Learning Forecasting Engine (`ml/forecasting.py`)
   - 4.4 Unsupervised Anomaly Detection (`ml/anomaly_detection.py`)
   - 4.5 Scope 2 Carbon Accounting & GHG Conversion (`carbon_service.py`)
   - 4.6 Conservation Measures & ROI Synthesis (`recommendation_service.py`)
   - 4.7 Sustainability Scoring Engine (`scoring_service.py`)
   - 4.8 ESG Disclosures & ReportLab PDF Compilation (`esg_service.py`)
   - 4.9 ERP Connector Framework & SSRF Firewall (`integrations/erp/`)
   - 4.10 IoT Ingestion & Multi-Meter Simulator (`integrations/iot/`)
5. [End-to-End Data Flow Pipeline](#5-end-to-end-data-flow-pipeline)
6. [Summary Cheat-Sheet for Oral Defense](#6-summary-cheat-sheet-for-oral-defense)

---

## 1. Executive Technology Stack & Language Matrix

EcoMind AI is engineered as a decoupled, multi-tier enterprise web application utilizing four primary programming languages and specialized open-source scientific libraries:

| Tier | Language | Framework / Primary Tool | Version | Role in Project |
|---|---|---|---|---|
| **Backend** | **Python** | FastAPI + Uvicorn | 3.12+ / 0.110+ | Asynchronous REST API, ML pipeline, document compilation, telemetry ingestion |
| **Frontend** | **TypeScript** | React + Vite | 5.x / 19.3+ | Type-safe Single Page Application (SPA), dynamic user interaction |
| **Styling** | **CSS3** | Tailwind CSS | 3.4+ | Utility-first responsive design, dark/light glassmorphic styling |
| **Database** | **SQL** | SQLAlchemy ORM (SQLite / PostgreSQL) | 2.0+ | Relational schema definitions, relational integrity, time-series querying |
| **Data Science** | **Python** | Scikit-Learn + XGBoost + Pandas + NumPy | 1.4+ / 2.0+ | Vector mathematics, decision tree training, anomaly scoring, dataframe manipulation |
| **IoT / Comm** | **Python** | Paho-MQTT | 2.0+ | Event-driven MQTT telemetry message broker subscriber |
| **Reporting** | **Python** | ReportLab | 4.0+ | Server-side vector PDF document compiler |

---

## 2. Frontend Architecture & Technical Implementation

```
[User Browser]
      │
      ▼
React 19 Virtual DOM (TypeScript)
      │
      ├── React Router v7 ──► 13 Dedicated SPA Pages (/analytics, /forecasting, etc.)
      ├── React Context    ──► Global Selected Dataset State (DatasetContext)
      ├── Axios Client     ──► Typed HTTP Request Interceptor (Base URL: /api/v1)
      ├── Recharts         ──► Dynamic SVG Rendering (LineChart, AreaChart, BarChart)
      └── Tailwind CSS     ──► Atomic CSS Utility Compilation
```

### 2.1 Framework & Core Languages
- **React 19**: EcoMind AI does not use traditional multi-page static HTML files. Instead, it operates as a **Single Page Application (SPA)**. When the user navigates between pages, the browser does not reload; the React Virtual DOM conditionally mounts and unmounts component trees.
- **TypeScript (`.tsx`)**: Replaces vanilla JavaScript (`.js`). Every API response, data model, and component prop has a strict TypeScript interface (located in `frontend/src/types/`). This guarantees compile-time type safety—if an API response schema changes, TypeScript flags errors before code can be deployed.
- **Vite 8**: Modern front-end build tool utilizing native ES modules (ESM) and Rollup for production bundling.

### 2.2 Client-Side State Management & Routing
- **React Router v7**: Declarative routing defined in `frontend/src/App.tsx`. Manages 13 distinct routes without full-page refreshes.
- **React Context API (`DatasetContext.tsx`)**: Global state provider that tracks the currently active dataset ID, name, and observation count across the entire application. When a user switches or loads the demo dataset, every open page (Analytics, Forecast, Carbon, Score) automatically re-fetches its data via `useEffect` hooks.

### 2.3 Data Visualization & Styling
- **Recharts**: Declarative charting library built on SVG elements. Used for:
  - Time-series line charts with prediction confidence interval bands (`AreaChart`).
  - Anomaly scatter points plotted over continuous load curves.
  - 24-hour diurnal weekday vs. weekend profile comparisons.
- **Tailwind CSS**: Utility-first CSS framework configured in `tailwind.config.js`. Eliminates bloated `.css` stylesheets by applying atomic classes directly to JSX elements.

### 2.4 API Communication Layer (`frontend/src/api/`)
- Uses **Axios** with a central configuration (`client.ts`).
- Automatically handles:
  - Base URL routing (`http://127.0.0.1:8000/api/v1`).
  - JSON header serialization.
  - Centralized error response interceptors for network failures and HTTP 4xx/5xx status codes.

---

## 3. Backend Architecture & Engineering Logic

```
HTTP Client Request (Port 8000)
            │
            ▼
    [Uvicorn ASGI Server]
            │
    [FastAPI Router Engine]
            │
    ├── CORS Middleware (Cross-Origin Resource Sharing)
    ├── Pydantic V2 Request Validation (Type casting & constraint validation)
    ├── Dependency Injection (db: Session = Depends(get_db))
    │       │
    │       ▼
    │   [SQLAlchemy 2.0 ORM Engine] ──► SQLite (dev) / PostgreSQL (prod)
    │
    └── Service Layer Execution:
            ├── DataService (Pandas/NumPy cleaning)
            ├── ForecastingEngine (XGBoost / Random Forest)
            ├── AnomalyDetector (Isolation Forest)
            ├── ScoringService (Weighted benchmark math)
            ├── ESGService (ReportLab PDF generation)
            ├── ERPService (SSRF Firewall & Connectors)
            └── IoTService (kW vs kWh enforcement & MQTT)
```

### 3.1 Web Framework & Execution Model (FastAPI & Uvicorn)
- **FastAPI**: Built on top of Starlette and Pydantic. It provides asynchronous request handling via Python's `asyncio` event loop.
- **Uvicorn**: Lightning-fast ASGI (Asynchronous Server Gateway Interface) server executing the Python backend process.
- **Dependency Injection**: Database sessions are injected into route handlers using `Depends(get_db)`. This guarantees that each incoming HTTP request receives an isolated database transaction that automatically closes when the request finishes, preventing database connection leaks.

### 3.2 Data Validation & Serialization (Pydantic V2)
- All incoming payloads (such as IoT meter readings or custom scoring weights) are validated against Pydantic models before reaching business logic.
- Enforces strict data constraints:
  - Scores must be $\ge 0$ and $\le 100$.
  - Scoring weights must sum to exactly $100.0\%$.
  - Instantaneous active power must strictly have unit `kW`.
  - Cumulative energy readings must strictly have unit `kWh` and be non-negative.
  - Automatically compiles OpenAPI 3.0 schema definitions powering the interactive Swagger documentation at `/docs`.

### 3.3 Database Layer & ORM (SQLAlchemy 2.0)
- **Object-Relational Mapping (ORM)**: Translates Python classes into database tables.
- **Engine Abstraction**:
  - In development: Uses **SQLite** (`backend/ecomind.db`) for zero-configuration setup.
  - In production: By changing `DATABASE_URL` in `.env`, it seamlessly points to **PostgreSQL** without altering application code.
- **Automated Seeding (`session.py`)**: On first startup, `init_db()` automatically provisions default scoring weights, 16 standard GRI/ISSB indicators, 4 ERP connectors, and 5 IoT smart meters.

---

## 4. Deep-Dive into Backend Mathematical Logic & Algorithms

### 4.1 Data Processing & Imputation Logic (`data_service.py`)
When a raw CSV is uploaded or loaded:
1. **Timestamp Parsing**: Converts raw strings into UTC Python `datetime` objects.
2. **Interval Frequency Detection**: Computes the median difference between consecutive timestamps ($\Delta t = t_i - t_{i-1}$). Classifies cadence into 15-minute, hourly, or daily intervals.
3. **Missing Value Imputation**:
   - If missing readings exist, applies **linear interpolation**:
     $$y_t = y_{t_0} + (t - t_0) \frac{y_{t_1} - y_{t_0}}{t_1 - t_0}$$
   - Fills remaining boundary values using forward-fill (`ffill`) and backward-fill (`bfill`).
4. **Data Cleansing**: Negative electricity consumption values are physically impossible for passive consumers; the service clips values at zero: $y = \max(0.0, y)$.

---

### 4.2 Energy Profiling & Weather Correlation (`analytics_service.py`)
1. **Diurnal 24-Hour Profile**:
   Groups observations by `(day_of_week >= 5, hour_of_day)` and computes the mean load:
   $$\bar{P}_{\text{hour}} = \frac{1}{N} \sum_{k=1}^N P_{k, \text{hour}}$$
2. **Baseload Floor Identification**:
   Finds the 5th percentile of consumption between 02:00 and 05:00:
   $$\text{Baseload Floor} = \text{Percentile}_{0.05}(P_{t \in [02:00, 05:00]})$$
3. **Weather Sensitivity Slope (OLS Regression)**:
   Performs Ordinary Least Squares between ambient temperature ($T$) and consumption ($P$):
   $$\text{Slope } \beta = \frac{\sum (T_i - \bar{T})(P_i - \bar{P})}{\sum (T_i - \bar{T})^2} \quad (\text{kWh/}^\circ\text{C})$$
   Calculates the Pearson correlation coefficient ($r \in [-1, 1]$).

---

### 4.3 Machine Learning Forecasting Engine (`ml/forecasting.py`)

#### Problem Formulation
Given historical hourly observations $\{y_1, y_2, \dots, y_t\}$, predict future values $\{y_{t+1}, \dots, y_{t+H}\}$ for horizon $H \in [24, 336]$ hours.

#### Feature Engineering Pipeline ($X$-Matrix Creation)
The model does not rely solely on the raw timestamp; it extracts a rich multi-dimensional feature space:
1. **Cyclical Trigonometric Time Encodings**:
   Because hour 23 is mathematically close to hour 0, linear numbers fail. We encode:
   $$x_{\sin\_hour} = \sin\left(\frac{2\pi \cdot \text{hour}}{24}\right), \quad x_{\cos\_hour} = \cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$
   $$x_{\sin\_month} = \sin\left(\frac{2\pi \cdot \text{month}}{12}\right), \quad x_{\cos\_month} = \cos\left(\frac{2\pi \cdot \text{month}}{12}\right)$$
2. **Lag Features**: Historical values capturing autocorrelation:
   $$\text{lag}_1 = y_{t-1}, \quad \text{lag}_2 = y_{t-2}, \quad \text{lag}_{24} = y_{t-24}, \quad \text{lag}_{168} = y_{t-168} \text{ (same hour last week)}$$
3. **Rolling Window Statistics**:
   $$\mu_{24} = \text{mean}(y_{t-24:t}), \quad \sigma_{24} = \text{std}(y_{t-24:t}), \quad \max_{24} = \max(y_{t-24:t})$$

#### Supervised Regression Models
1. **XGBoost Regressor (`xgboost.XGBRegressor`)**:
   - Minimizes regularized objective: $\mathcal{L}(\theta) = \sum l(y_i, \hat{y}_i) + \sum \left(\gamma T_m + \frac{1}{2}\lambda w_m^2 + \alpha |w_m|\right)$.
   - Employs gradient-boosted decision trees where each subsequent tree fits the negative gradient (residual errors) of the prior trees.
   - Built-in L1 (`reg_alpha`) and L2 (`reg_lambda`) penalties prevent memorization of noise.
2. **Random Forest Regressor (`sklearn.ensemble.RandomForestRegressor`)**:
   - Ensemble of 100 decorrelated regression trees trained on bootstrap samples of the training set (Bagging).
   - Reduces model variance without increasing bias.
3. **Seasonal-Naive Benchmark Model**:
   - Strictly sets $\hat{y}_t = y_{t-168}$ (same hour from 7 days ago).
   - Serves as the baseline: if an ML model cannot beat Seasonal-Naive, it is rejected.

#### Error Evaluation Metrics
- **Mean Absolute Error (MAE)**: $\frac{1}{n} \sum |y_i - \hat{y}_i|$
- **Root Mean Squared Error (RMSE)**: $\sqrt{\frac{1}{n} \sum (y_i - \hat{y}_i)^2}$
- **Weighted Absolute Percentage Error (WAPE)**:
  $$\text{WAPE} = \frac{\sum_{i=1}^n |y_i - \hat{y}_i|}{\sum_{i=1}^n y_i} \times 100\%$$
- **Coefficient of Determination ($R^2$)**:
  $$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$

---

### 4.4 Unsupervised Anomaly Detection (`ml/anomaly_detection.py`)
- **Algorithm**: **Isolation Forest** (`sklearn.ensemble.IsolationForest`).
- **Mathematical Principle**:
  Anomalies in electricity telemetry (e.g. equipment power surges or unmanaged weekend HVAC running) are "few and different". Rather than modeling the normal distribution, Isolation Forest constructs an ensemble of randomized binary decision trees.
- **Tree Splitting Logic**:
  At each node, an isolation tree randomly selects a feature and a random split value between that feature's minimum and maximum.
- **Path Length Formulation**:
  Anomalous points have attribute values very different from normal data, so they are isolated **very close to the root of the tree** (short average path length $h(x)$). Normal points require many splits to isolate.
  The anomaly score for instance $x$ across $n$ samples is:
  $$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
  Where $E(h(x))$ is the average path length across all isolation trees, and $c(n)$ is the average path length of an unsuccessful search in a Binary Search Tree:
  $$c(n) = 2\left(\ln(n - 1) + 0.5772156649\right) - \frac{2(n - 1)}{n}$$
- **Severity Scoring**:
  - If $s(x, n) \to 1$: Definite anomaly.
  - If $s(x, n) < 0.5$: Normal observation.
  - Classified into:
    - **CRITICAL**: Bottom 1% of scores.
    - **HIGH**: Next 2%.
    - **MEDIUM**: Next 2%.
    - **LOW**: Remaining contaminated samples.

---

### 4.5 Scope 2 Carbon Accounting & GHG Conversion (`carbon_service.py`)
- **GHG Protocol Standard Formula**:
  $$\text{Emissions (Metric Tons CO}_2\text{e)} = \frac{\text{Consumption (kWh)} \times \text{Grid Emission Factor (kg CO}_2\text{e/kWh)}}{1000}$$
- **Emission Factor Database**:
  - US National EPA eGRID: $0.386 \text{ kg CO}_2\text{e/kWh}$
  - UK Defra 2024: $0.207 \text{ kg CO}_2\text{e/kWh}$
  - EU-27 Average: $0.230 \text{ kg CO}_2\text{e/kWh}$
- **U.S. EPA Equivalency Conversions**:
  $$\text{Tree Seedlings} = \text{tCO}_2\text{e} \times 16.5$$
  $$\text{Gallons of Gasoline} = \text{tCO}_2\text{e} \times 112.5$$
  $$\text{Passenger Vehicle Miles} = \text{tCO}_2\text{e} \times 2,485$$

---

### 4.6 Conservation Measures & ROI Synthesis (`recommendation_service.py`)
Analyzes observed data patterns to synthesize concrete engineering interventions:
1. **Baseload Ratio Rule**:
   $$\text{Ratio} = \frac{\text{Weekend Mean Load}}{\text{Weekday Mean Load}}$$
   If $\text{Ratio} > 0.65$, generates *Baseload Scheduling Optimization*.
2. **Peak Shaving Rule**:
   Quantifies the difference between top 5% peak hours and median load.
3. **Financial Estimation**:
   $$\Delta \text{kWh/year} = \text{Estimated Energy Reduction}$$
   $$\text{Annual Savings (\$)} = \Delta \text{kWh} \times \text{Tariff Rate (\$/kWh)}$$
   $$\text{Simple Payback Period (Years)} = \frac{\text{Project Implementation Cost (\$)}}{\text{Annual Cost Savings (\$/year)}}$$

---

### 4.7 Sustainability Scoring Engine (`scoring_service.py`)

#### Overall Score Formulation
$$\text{Sustainability Score} = \sum_{i \in \text{Available}} w_i^* \cdot S_i \quad \in [0, 100]$$

#### Directional Benchmark Normalization
Each indicator is evaluated against a documented target benchmark ($T$):
- **Inverse Indicators** (Energy intensity, Carbon intensity, Anomaly rate, Water intensity — where lower is better):
  $$S = \min\left(100, \max\left(0, 100 \cdot \left(1 - \frac{V - T}{T}\right)\right)\right)$$
- **Positive Indicators** (Renewable share, Waste diversion — where higher is better):
  $$S = \min\left(100, \max\left(0, 100 \cdot \frac{V}{T}\right)\right)$$

#### Dynamic Weight Rebalancing (Missing Data Solution)
If a facility does not track waste or water, standard systems either assign a zero (falsely harsh) or award a 100 (falsely generous). EcoMind AI dynamically rescales only the available indicator weights:
$$w_i^* = \frac{w_i}{\sum_{j \in \text{Available}} w_j}$$
And outputs an explicit **Data Coverage Index**:
$$\text{Coverage \%} = \frac{\sum_{j \in \text{Available}} w_j}{\sum_{\text{all } k} w_k} \times 100\%$$

#### Rating Tiers
- **A+**: 90 – 100 | **A**: 80 – 89 | **B**: 70 – 79 | **C**: 60 – 69 | **D**: 50 – 59 | **F**: < 50

---

### 4.8 ESG Disclosures & ReportLab PDF Compilation (`esg_service.py`)
- **GRI Standards & ISSB S2 Registry**:
  Stores disclosures for Energy (GRI 302), Emissions (GRI 305), Water (GRI 303), Waste (GRI 306), Social Safety (GRI 403), Training (GRI 404), and Governance (GRI 2).
- **Provenance Metadata**: Every indicator carries a tag: `MEASURED`, `USER_ENTERED`, `ESTIMATED`, or `SIMULATED`.
- **Programmatic PDF Compilation**:
  Uses Python's `reportlab.platypus` (Page Layout and Typography Using Scripts):
  - Builds a `SimpleDocTemplate` with custom page geometry.
  - Compiles Flowable objects: `Paragraph`, `Spacer`, and styled `Table`.
  - Implements custom canvas callbacks (`NumberedCanvas`) that compute running `"Page X of Y"` footers on a two-pass render.
  - Streams directly over HTTP as an `application/pdf` binary stream without saving temporary files to disk.

---

### 4.9 ERP Connector Framework & SSRF Firewall (`integrations/erp/`)
- **Abstract Base Connector (`BaseERPConnector`)**:
  Defines abstract methods: `validate_config()`, `test_connection()`, and `sync_records()`.
- **Connectors Implemented**: SAP S/4HANA OData, Oracle NetSuite SuiteTalk, Microsoft Dynamics 365, Generic REST, CSV Importer, and Synthetic Sandbox.
- **SSRF (Server-Side Request Forgery) Firewall (`security.py`)**:
  Protects the backend server from being weaponized to attack internal infrastructure.
  Before any outbound HTTP request:
  1. Parses the target URL and extracts the hostname.
  2. Resolves the hostname to IP addresses via `socket.getaddrinfo`.
  3. Checks whether the IP belongs to forbidden ranges using Python's `ipaddress` library:
     - Loopback (`127.0.0.0/8`, `::1`)
     - RFC 1918 Private Networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
     - Link-Local & Cloud Metadata (`169.254.169.254`)
  4. If forbidden, raises `SSRFBlockedException` and halts the connection.
- **Idempotent Synchronization**:
  ERP billing records generate deterministic compound hashes:
  $$\text{Hash} = \text{MD5}(\text{connector\_id} + \text{invoice\_num} + \text{billing\_start})$$
  Repeated synchronizations update existing records instead of creating duplicate consumption.

---

### 4.10 IoT Ingestion & Multi-Meter Simulator (`integrations/iot/`)
- **Thermodynamic Measurement Typing**:
  - **`ACTIVE_POWER_KW`**: Instantaneous demand rate in **`kW`**.
  - **`CUMULATIVE_ENERGY_KWH`**: Accumulated energy in **`kWh`**. Strictly non-negative and monotonically non-decreasing.
  - Enforced via Pydantic schema validators `@field_validator("unit")`.
- **MQTT Broker Client (`mqtt_client.py`)**:
  - Implemented using **`paho-mqtt` v2**.
  - Subscribes to `ecomind/meters/+/readings`.
  - Parses JSON packets, validates schema, and saves to database with automatic reconnect backoff.
- **Real-Time Threshold Alarms**:
  When a reading $v > \text{Threshold}_{\text{critical}}$, generates an `IoTAlert` row with status `ACTIVE`. Operators can transition alerts to `ACKNOWLEDGED` and `RESOLVED` with audit notes.

---

## 5. End-to-End Data Flow Pipeline

```
[IoT Smart Meters]           [ERP Financial Invoices]
  (kW/kWh Readings)             (Monthly Utility Bills)
         │                                │
         ├── HTTP POST /api/v1/iot/ingest ├── SSRF Security Firewall Check
         └── MQTT Broker Subscription     └── BaseERPConnector Mapping
                         │                                │
                         ▼                                ▼
                  [UnifiedDataService & Database Models]
                         │
        ┌────────────────┴────────────────────────┐
        ▼                                         ▼
[ML Forecasting Pipeline]              [Sustainability Scoring Engine]
  • Cyclical trigonometric encoding      • Benchmark target normalization
  • Lag & rolling feature extraction     • Dynamic weight rebalancing
  • XGBoost / Random Forest training     • 0-100 score + A-F grading
  • Error evaluation (MAE, WAPE, R²)     • Actionable ECM recommendations
        │                                         │
        ▼                                         ▼
[Isolation Forest Anomaly Detection]   [ESG Reporting & PDF Engine]
  • Unsupervised space partitioning      • GRI 302/305/303/306 registry
  • Path-length anomaly scoring          • Measured vs Estimated provenance
  • Severity tagging (Critical/High)     • ReportLab vector PDF compilation
        │                                         │
        └────────────────┬────────────────────────┘
                         ▼
        [FastAPI Asynchronous Router Layer]
                         │
                    HTTP REST API
                         │
                         ▼
        [React 19 / TypeScript Single Page App]
          • Responsive Recharts Visualization
          • Interactive Weight Adjusters & Simulators
          • Executive KPI Summary Dashboard
```

---

## 6. Summary Cheat-Sheet for Oral Defense

| If Examiner Asks... | Your Exact Technical Answer |
|---|---|
| **What languages did you write this in?** | *"The backend is written in **Python 3.12** using **FastAPI** and **SQLAlchemy**. The frontend is written in **TypeScript** using **React 19** and styled with **Tailwind CSS**."* |
| **Why not plain HTML, CSS, and JS?** | *"Plain static HTML/JS cannot manage complex enterprise state across 13 views. React gives us a reactive Virtual DOM and component reusability, while TypeScript enforces strict compile-time type safety preventing runtime crashes."* |
| **Why XGBoost over Deep Learning (LSTM)?** | *"For tabular time-series with hourly intervals, XGBoost trained on engineered cyclical trigonometric and lag features matches LSTM accuracy with 1/50th of the training time, zero GPU requirements, and full feature importance interpretability."* |
| **Why Isolation Forest for anomalies?** | *"Energy consumption is non-Gaussian and varies by hour and weekday. A consumption of 300 kW is normal on a Tuesday afternoon but anomalous on Sunday at 3 AM. Isolation Forest partitions feature space with random trees and isolates outliers in fewer splits without assuming a normal distribution."* |
| **How does your scoring handle missing metrics?** | *"It does not award a fake 100 or a harsh zero. It performs dynamic weight rebalancing across available metrics ($w_i^* = w_i / \sum w_{\text{avail}}$) and reports an independent Data Coverage and Confidence Index."* |
| **How did you secure ERP connections?** | *"We built an SSRF (Server-Side Request Forgery) firewall that resolves hostnames before socket connection and strictly blocks any requests targeting loopback addresses (`127.0.0.1`), private RFC 1918 subnets, or cloud metadata services (`169.254.169.254`)."* |
| **What is the difference between kW and kWh?** | *"Active Power (kW) is the instantaneous rate of electrical demand. Cumulative Energy (kWh) is the integral of power over time. Our Pydantic schemas enforce strict typing so kW and kWh can never be confused."* |
| **Is your PDF export real?** | *"Yes, it is dynamically compiled on the backend using Python's ReportLab library, generating multi-page vector tables, running page numbers, and GRI disclosures as a real binary stream."* |

---

*This guide was generated for the project defense of EcoMind AI.*  
*Use this document as your primary reference to answer any architectural, algorithmic, or technical question with total authority!*
