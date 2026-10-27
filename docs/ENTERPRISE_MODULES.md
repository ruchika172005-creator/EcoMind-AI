# EcoMind AI — Advanced Enterprise Sustainability Architecture & User Guide

This guide provides technical specifications, calculation methodologies, security policies, and user workflows for the four enterprise modules implemented in EcoMind AI:

1. **Sustainability Scoring Engine**
2. **ESG Reporting Module (GRI & ISSB S2)**
3. **ERP Integration Architecture**
4. **IoT & Smart-Meter Integration Engine**
5. **Unified Data & Analytics Integration Layer**

---

## 1. Sustainability Scoring Module

### 1.1 Methodology & Mathematical Formulation
EcoMind AI implements an explainable, configurable weighted scoring engine that produces an overall score from 0 to 100 alongside domain-specific pillar scores.

$$\text{Sustainability Score} = \sum_{i \in \text{Available}} w_i^* \cdot S_i$$

Where:
- $S_i \in [0, 100]$ is the normalized score for metric $i$.
- $w_i$ is the user-configured weight (constrained such that $\sum w_i = 100\%$ and $w_i \ge 0$).
- When data for metric $i$ is missing or unmeasured, EcoMind AI **does not** penalize the organization with a score of zero, nor does it falsely award a perfect 100. Instead, it computes **dynamic weight rebalancing** across available indicators:

$$w_i^* = \frac{w_i}{\sum_{j \in \text{Available}} w_j}$$

- **Data Coverage & Confidence Index**: The platform explicitly reports the percentage of configured weights backed by actual measurements:

$$\text{Coverage} = \frac{\sum_{j \in \text{Available}} w_j}{\sum_{\text{all } k} w_k} \times 100\%$$

### 1.2 Metric Directions & Benchmark Normalization
Each indicator has an explicit directionality and benchmark target:

| Metric | Category | Default Weight | Target Benchmark | Direction | Normalization Logic |
|---|---|---|---|---|---|
| **Energy Intensity** | Energy Efficiency | 25% | 150.0 kWh/m² | Inverse (Lower is Better) | $S = \min(100, \max(0, 100 \cdot (1 - \frac{V - T}{T})))$ |
| **Carbon Intensity** | Carbon Performance | 25% | 60.0 kg CO2e/m² | Inverse (Lower is Better) | $S = \min(100, \max(0, 100 \cdot (1 - \frac{V - T}{T})))$ |
| **Anomaly Frequency** | Reliability & Waste | 15% | 2.0% of hours | Inverse (Lower is Better) | $S = \min(100, \max(0, 100 \cdot (1 - \frac{V - T}{T})))$ |
| **Renewable Ratio** | Clean Energy | 15% | 35.0% | Positive (Higher is Better) | $S = \min(100, \max(0, 100 \cdot \frac{V}{T}))$ |
| **Water Intensity** | Resource Efficiency | 10% | 1.2 m³/m² | Inverse (Lower is Better) | $S = \min(100, \max(0, 100 \cdot (1 - \frac{V - T}{T})))$ |
| **Waste Diversion** | Circular Economy | 10% | 60.0% | Positive (Higher is Better) | $S = \min(100, \max(0, 100 \cdot \frac{V}{T}))$ |

### 1.3 Rating Scale
- **A+ (90–100)**: Exemplary decarbonization & operational efficiency.
- **A (80–89)**: Strong sustainability leadership with robust telemetry coverage.
- **B (70–79)**: Compliant operations with targeted reduction opportunities.
- **C (60–69)**: Moderate efficiency; elevated baseline consumption or anomaly frequency.
- **D (50–59)**: High resource intensity; requires prioritized conservation interventions.
- **F (< 50)**: Critical non-conformance; severe waste or missing foundational controls.

### 1.4 REST Endpoints
- `GET /api/v1/sustainability/score-config`: Retrieve active weights and benchmark targets.
- `PUT /api/v1/sustainability/score-config`: Update weights (validated non-negative and sum = 100).
- `POST /api/v1/sustainability/calculate`: Execute an explainable scoring run on active or facility data.
- `GET /api/v1/sustainability/history`: Retrieve historical scoring runs for trend tracking.

---

## 2. ESG Reporting Module (GRI Standards & ISSB S2)

### 2.1 Modular Indicator Registry
EcoMind AI includes a persistent registry supporting Environmental, Social, and Governance metrics:

- **Environmental (GRI 302, 305, 303, 306)**:
  - `GRI-302-1`: Total Electricity Consumption (MWh)
  - `GRI-302-3`: Energy Intensity per Unit Area (kWh/m²)
  - `GRI-305-2`: Scope 2 Location-Based GHG Emissions (tCO2e)
  - `GRI-305-4`: Carbon Intensity Ratio (kg CO2e/m²)
  - `GRI-303-5`: Total Water Consumption (m³)
  - `GRI-306-3`: Waste Generated & Diverted from Disposal (Metric Tons)
  - `GRI-302-2`: Renewable Energy Share (%)
- **Social (GRI 403, 404, 405)**:
  - `GRI-403-9`: Work-Related Injury Frequency Rate
  - `GRI-404-1`: Average Sustainability Training Hours per Employee
  - `GRI-405-1`: Diversity of Governance Bodies & Management
- **Governance (GRI 2-9, 2-12, 2-27)**:
  - `GRI-2-9`: Sustainability Oversight Committee Mandate
  - `GRI-2-27`: Compliance with Environmental Laws & Regulations
  - `GRI-2-5`: External Assurance & Third-Party Audit Status

### 2.2 Data Provenance & Lineage
Every reported indicator carries transparent data provenance:
- **Measured**: Directly recorded by calibrated smart meters or utility revenue meters.
- **User-Entered**: Submitted by facility managers or compliance officers with review audit trails.
- **Estimated / Modeled**: Derived from regression models or engineering estimations.
- **Simulated**: Generated via test sandboxes or simulated ERP connections for demonstration.

Indicators without records are explicitly flagged as **"Not Provided"** or **"Not Measured"**.

### 2.3 Real PDF Generation via ReportLab
Clicking **"Export ReportLab PDF"** does not link to a dummy file or print a CSS preview. The backend dynamically compiles a formal, publication-ready multi-page PDF document featuring:
- Executive summary with generation timestamp, boundary scope, and coverage rating.
- Detailed indicator disclosures table formatted according to GRI disclosure codes.
- Carbon emission factor provenance (eGRID 2024 / Defra).
- Methodology notes and explicit limitations.
- File streaming via FastAPI `FileResponse`.

### 2.4 REST Endpoints
- `GET /api/v1/esg/indicators`: List registered ESG indicators by category.
- `GET /api/v1/esg/reports`: Retrieve history of generated reports.
- `POST /api/v1/esg/reports/generate`: Compile and store an ESG report.
- `GET /api/v1/esg/reports/{id}/pdf`: Download binary PDF compiled via ReportLab.
- `GET /api/v1/esg/reports/{id}/csv`: Stream structured CSV indicator dataset.

---

## 3. ERP Integration Architecture

### 3.1 Connector Architecture
Enterprise utility invoices and physical consumption records can be ingested across five connector types:
1. **SAP S/4HANA**: OData v4 utility API adapter.
2. **Oracle NetSuite**: SuiteTalk REST API adapter.
3. **Microsoft Dynamics 365 Finance & Operations**: Dual-write REST API adapter.
4. **Generic REST API Connector**: Configurable base URL, headers, and JSON path extraction.
5. **CSV Utility Importer**: Universally compatible tabular billing ingestion.
6. **Synthetic ERP Sandbox Simulator**: Realistic demonstration engine generating electricity, water, gas, and waste utility records.

### 3.2 Cybersecurity & SSRF Prevention
To protect against **Server-Side Request Forgery (SSRF)** when integrating external or user-configured REST endpoints:
- Hostnames are resolved to IP addresses prior to outbound socket connection.
- Outbound requests to **IPv4/IPv6 loopback** (`127.0.0.0/8`, `::1`), **private networks** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and **cloud metadata services** (`169.254.169.254`) are strictly blocked with an `SSRFBlockedException`.
- All credentials (OAuth tokens, API keys) are masked in responses (`••••••••`) and never echoed to frontend logs.

### 3.3 Idempotency & Deduplication
Utility billing records use deterministic compound keys `(connector_id, account_id, invoice_number, billing_period_start)`. Re-syncing an existing invoice updates mutable fields without double-counting physical consumption.

### 3.4 REST Endpoints
- `GET /api/v1/integrations/erp/connectors`: View connector statuses and last sync timestamps.
- `POST /api/v1/integrations/erp/connectors/{id}/test`: Validate connectivity and credentials.
- `POST /api/v1/integrations/erp/connectors/{id}/sync`: Trigger an asynchronous synchronization run.
- `GET /api/v1/integrations/erp/sync-history`: View historical sync logs, record counts, and errors.
- `GET /api/v1/integrations/erp/records`: Query normalized ERP utility records.

---

## 4. IoT & Smart-Meter Integration Engine

### 4.1 Strict Physical Measurement Typing
EcoMind AI enforces thermodynamic and electrical consistency:
- **Instantaneous Active Power (`ACTIVE_POWER_KW`)**: Unit must be **`kW`**. Represents real-time electrical demand rate.
- **Cumulative Active Energy (`CUMULATIVE_ENERGY_KWH`)**: Unit must be **`kWh`**. Represents integrated work over time; strictly monotonic non-negative values.
- **Water Flow Rate (`WATER_FLOW_M3H`)**: Unit **`m³/h`**.
- **Temperature (`TEMPERATURE_C`)**: Unit **`°C`**.

### 4.2 Ingestion Protocols
1. **HTTP REST Ingestion**:
   - `POST /api/v1/iot/ingest`: High-throughput JSON ingestion endpoint with API-key authentication (`X-IOT-API-KEY`).
   - Supports single readings and batch arrays up to 500 measurements.
2. **MQTT Broker Subscriber**:
   - Built with `paho-mqtt` v2.
   - Subscribes to configured topic patterns (e.g., `ecomind/meters/+/readings`).
   - Automatic reconnect backoff and JSON payload validation.
3. **Multi-Meter Telemetry Simulator**:
   - Built-in simulation worker producing readings for registered campus devices.
   - Supports **Single Step**, **Burst Ingestion (10 cycles)**, and **Peak Surge Anomaly Injection (> 450 kW)** to trigger real-time threshold alerts.

### 4.3 Real-Time Threshold Alarms
When an ingested reading exceeds pre-configured safety thresholds (e.g., Chiller Submeter power > 280 kW or Main Feed > 450 kW):
- An `IoTAlert` record is created with severity `CRITICAL` or `WARNING`.
- Telemetry telemetry cards pulse live status in the UI.
- Operators can acknowledge and resolve alerts with audit notes.

### 4.4 REST Endpoints
- `GET /api/v1/iot/devices`: List registered devices, connection statuses, and last-seen timestamps.
- `POST /api/v1/iot/devices`: Register a new smart meter or submeter.
- `GET /api/v1/iot/devices/{id}/readings`: Retrieve historical time-series telemetry.
- `POST /api/v1/iot/ingest`: Submit meter readings via HTTP.
- `GET /api/v1/iot/alerts`: Retrieve active and acknowledged alerts.
- `POST /api/v1/iot/alerts/{id}/resolve`: Mark an alert as resolved.
- `POST /api/v1/iot/simulator/trigger`: Inject synthetic readings or anomaly surges.
- `GET /api/v1/iot/health`: Telemetry fleet health overview.

---

## 5. Unified Data & Analytics Layer

The platform bridges enterprise systems with the machine-learning pipeline:
- Ingested IoT readings and ERP billing records flow into `UnifiedDataService`.
- Reconciles overlapping observations to prevent double-counting.
- Feeds into the existing **XGBoost / Random Forest Forecasting** and **Isolation Forest Anomaly Detection** pipelines.

---

## 6. Demonstration Mode vs. Production Deployment Matrix

| Feature | Local Demo Mode (Out of the Box) | Enterprise Production Mode |
|---|---|---|
| **Sustainability Scoring** | Fully functional with default and customizable weights | Connects to enterprise organization structures |
| **ESG Reporting** | Real ReportLab PDF & CSV exports using synthetic/campus records | Connects to enterprise ERP & HR indicator data lakes |
| **ERP Integration** | Fully functional simulated SAP S/4HANA & CSV connectors | Requires enterprise SAP OData, NetSuite, or Dynamics credentials |
| **IoT Smart Meters** | Interactive simulator with single-step, burst, and surge injection | Requires live smart meters or physical MQTT brokers |
| **Database** | Pre-configured SQLite (`backend/ecomind.db`) | Scalable PostgreSQL cluster via `DATABASE_URL` |
