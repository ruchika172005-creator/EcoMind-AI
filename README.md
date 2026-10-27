
EcoMind AI --- Enterprise Sustainability Intelligence Platform
EcoMind AI is a sustainability intelligence platform designed to help
organizations analyze energy consumption, forecast future usage,
identify unusual patterns, estimate electricity-related carbon
emissions, and explore energy-saving opportunities from one dashboard.

Project status: Development/demo project. Some data sources and
external integrations may use simulated data. Verify integrations and
validate real data before operational use.

Problem Statement
Organizations may store energy data across different systems, making it
difficult to understand consumption trends, identify unusual readings,
estimate emissions, and plan energy-saving actions. EcoMind AI aims to
bring energy analytics, forecasting, anomaly detection, carbon
estimation, and sustainability insights together in one platform.

Objectives
Analyze historical energy-consumption data.
Forecast future consumption using regression models.
Identify unusual energy-consumption patterns.
Estimate electricity-related carbon emissions using an appropriate
emission factor.
Present sustainability indicators and recommendations in a
dashboard.
Support data-informed decisions about energy efficiency and resource
use.
Key Features
Energy analytics: View consumption trends and summary
indicators.
Energy forecasting: Estimate future consumption from historical
data.
Anomaly detection: Flag readings or patterns that differ from
expected usage.
Carbon estimation: Estimate emissions associated with
electricity consumption.
Recommendations: Display rule-based energy-saving suggestions
and estimated savings where configured.
Sustainability scoring: Combine selected indicators into a score
where implemented.
Visualizations and reports: Present metrics, trends, and
supported reporting outputs.
Data integration framework: Designed to support file-based data
and configured integration adapters.
How It Works
Ingest data from a supported file, configured source, or simulator.
Validate and preprocess the data.
Analyze consumption trends and summary indicators.
Forecast usage with configured models.
Detect anomalies in consumption patterns.
Estimate emissions using electricity consumption and a suitable
emission factor.
Present insights through dashboards, recommendations, and reports.
Technology Stack
Layer Technologies

Frontend React 19, TypeScript, Vite, React
Router, React Context, Axios,
Recharts, Tailwind CSS

Backend API Python, FastAPI, Uvicorn, Pydantic
v2

Data processing Pandas, NumPy

Machine learning Scikit-learn, XGBoost

Database access SQLAlchemy 2.0; SQLite for
development, PostgreSQL supported

IoT messaging Paho-MQTT, where configured

Reporting ReportLab
Exact capabilities depend on the code and configuration in your
checkout.

Machine Learning and Analytics
Energy Forecasting --- Regression
The project architecture includes: - Random Forest Regressor - XGBoost
Regressor - Seasonal Naive Baseline

These approaches predict a numerical quantity, such as energy
consumption. Evaluate them on held-out data and compare them with the
baseline.

Anomaly Detection
Isolation Forest is used in the anomaly-detection design to flag
observations that differ from typical patterns. An anomaly is a signal
to investigate, not proof of equipment failure or a specific cause.

Carbon Emission Estimation
A basic electricity-related estimate is:

Estimated emissions (kg CO₂e) = Electricity consumed (kWh) × Emission factor (kg CO₂e/kWh)

Use an emission factor appropriate to the location, time period, and
reporting methodology. A demo factor should not automatically be treated
as universally valid.

Recommendations and Sustainability Score
Recommendations may be generated using predefined rules. A
sustainability score may combine selected indicators using configured
weights. Outputs depend on available data, implemented logic, and
documented assumptions.

System Architecture
Frontend: React-based interface for dashboards, visualizations,
and user interaction.
Backend: FastAPI endpoints for application logic and data
access.
Analytics and ML: Data processing, forecasting models, and
anomaly detection.
Persistence: SQLAlchemy-supported database layer; SQLite for
development and PostgreSQL support.
Integrations: Configurable data adapters and MQTT-related
functionality where enabled.
Reporting: Report generation for supported outputs.
Data Sources / CSV / Simulator / Configured Integrations
                         |
                         v
                 FastAPI Backend
                         |
            +------------+-------------+
            |            |             |
            v            v             v
       Data Processing Forecasting  Anomaly Detection
            |            |             |
            +------------+-------------+
                         |
              Carbon & Sustainability Logic
                         |
                         v
                 Database / Reports
                         |
                         v
               React Web Dashboard
Getting Started
The commands below are a general local-development outline. Confirm the
exact dependency files, scripts, entry point, and environment variables
in your repository and in backend/README.md.

Prerequisites
Python version supported by the backend dependencies
Node.js and npm compatible with the frontend
Git
Optional: PostgreSQL or an MQTT broker if your configuration
requires them
1. Clone the Repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
Replace the placeholders with your repository URL and folder name.

2. Set Up the Backend
cd backend
python -m venv .venv
Activate the environment:

Windows PowerShell

.\.venv\Scripts\Activate.ps1
macOS/Linux

source .venv/bin/activate
Install dependencies using the dependency file included in the
repository. If it has requirements.txt:

python -m pip install -r requirements.txt
If an environment template is provided, create a local .env file from
it and configure the required values. For example, on Windows
PowerShell:

Copy-Item .env.example .env
Do not commit secrets or real credentials.

Start the API using the actual application entry point in your project.
For example, if the app is exposed as app.main:app:

uvicorn app.main:app --reload
FastAPI commonly serves interactive documentation at
http://127.0.0.1:8000/docs, depending on server configuration.

3. Set Up the Frontend
In a second terminal, navigate to the actual frontend directory (for
example, frontend):

cd frontend
npm install
npm run dev
Open the local URL printed by Vite. Configure the frontend API base URL
using the settings expected by the project.

Note: Directory names, entry-point modules, dependency files, and
npm scripts above are examples where your repository may differ.
Confirm them before running these commands.

Configuration
Review the configuration available in your checkout, including:

Backend .env.example or equivalent environment template
Database connection settings
Frontend API base URL
Data-source and simulator settings
MQTT broker settings, if MQTT ingestion is enabled
Emission-factor values and their sources
Model and reporting configuration
Never publish API keys, passwords, production connection strings, or
private company data in GitHub.

Evaluation Metrics
Forecasting performance should be reported from actual evaluation runs,
not assumed in advance.

Metric Meaning Preferred direction

MAE Mean absolute Lower
difference between
actual and predicted
values

RMSE Error metric that Lower
penalizes larger errors
more strongly

WAPE Total absolute error Lower
relative to total
actual consumption

R² How well predictions Usually closer to 1,
explain variation in interpreted in context
target values

Do not report a classification-accuracy percentage for the regression
forecasting task. Report measured results only when the test split,
target, units, and evaluation procedure are known. For anomaly
detection, use suitable evaluation data and metrics where labelled
examples are available.

Sustainability and SDGs
EcoMind AI is intended to support sustainability-related decision-making
and is relevant to:

SDG 7 --- Affordable and Clean Energy: Encouraging energy
efficiency.
SDG 9 --- Industry, Innovation and Infrastructure: Applying
digital analytics to organizational processes.
SDG 12 --- Responsible Consumption and Production: Supporting
informed resource use.
SDG 13 --- Climate Action: Helping estimate electricity-related
emissions and consider reduction measures.
These are intended areas of contribution; the platform alone does not
guarantee energy savings or emissions reductions.

Limitations
Forecast quality depends on the amount, quality, and
representativeness of historical data.
Anomaly detection can produce false positives or miss unusual
events.
Carbon estimates depend on energy data and the relevance of the
emission factor.
Recommendations and sustainability scores depend on configured
rules, indicators, and weights.
Some integrations or demo flows may be simulated; verify which
sources are actually connected.
The platform is a decision-support tool, not a substitute for
engineering inspection or verified emissions accounting.
Future Enhancements
Connect and validate live meter, IoT, and enterprise-system data
sources.
Add model monitoring and retraining workflows.
Compare forecasting models with repeatable test datasets and
documented metrics.
Store emission factors with source, geography, and reporting-period
metadata.
Improve alerting, user roles, audit trails, and report
customization.
Validate recommendations and estimated savings against measured
outcomes.
Contributing
Contributions and suggestions are welcome.

Fork the repository.
Create a feature branch.
Make and test your changes.
Open a pull request describing your changes.
Do not include secrets, private company data, or identifiable
operational information in commits or issues.

License
No license has been specified in this README. Add a LICENSE file and
update this section before permitting others to reuse, modify, or
distribute the project.

⋮⋮⋮⋮⋮⋮⋮⋮⋮⋮⋮⋮
