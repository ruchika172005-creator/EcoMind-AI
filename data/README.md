# EcoMind AI - Datasets & Demonstration Data Guide

This directory contains demonstration and sample energy consumption time series data for the **EcoMind AI Enterprise Sustainability Intelligence Platform**.

## 1. Built-in Sample Dataset

- **File**: `data/sample/commercial_campus_energy_hourly.csv`
- **Observations**: 8,760 hourly readings (Full 1-year timeline, 2024-01-01 to 2024-12-31)
- **Source**: Calibrated synthetic building simulation based on commercial office / university campus load profiles.
- **Features**:
  - `timestamp`: UTC/Local ISO timestamp (`YYYY-MM-DD HH:MM:SS`)
  - `energy_consumption_kwh`: Active electric energy in kilowatt-hours (kWh)
  - `building_id`: Facility / building identifier (`HQ-BLDG-01`)
  - `temperature_c`: Ambient outdoor dry-bulb temperature in °C
  - `occupancy_pct`: Estimated building occupancy percentage (0 - 100%)
- **Data Characteristics**:
  - Realistic baseload: ~85–120 kWh during night/off-hours.
  - Working-hour peaks: Weekday 8:00 AM – 6:00 PM peaks up to 350–500 kWh.
  - Temperature response: Summer cooling load (June–August) and winter heating load (December–February).
  - Built-in Anomalies: Includes realistic HVAC off-hour runtime, chiller power surges, and temporary drops to test the Isolation Forest detector.

## 2. Supported Public Datasets (e.g. ASHRAE Great Energy Predictor III)

EcoMind AI is designed to accept industry standard public datasets:
- **Kaggle / ASHRAE Great Energy Predictor III**:
  - Download meter readings (`train.csv`) and weather data (`weather_train.csv`) from [Kaggle ASHRAE](https://www.kaggle.com/c/ashrae-energy-prediction/data).
  - Filter for `meter == 0` (Electricity).
  - Map `meter_reading` to `energy_consumption_kwh` and `timestamp` to `timestamp`.
- **NREL Commercial Reference Buildings**:
  - Sub-hourly and hourly simulated load profiles from the National Renewable Energy Laboratory.
- **Smart Meter Datasets (e.g., London Datastore / Low Carbon London)**:
  - Half-hourly residential and commercial smart meter data.

## 3. CSV File Specifications for Upload

To upload your custom dataset via the **Energy Data Management** interface:
1. Provide a UTF-8 encoded `.csv` file.
2. Ensure at least two columns exist:
   - One date/time column (e.g., `timestamp`, `datetime`, `date`, `time`).
   - One numeric consumption column (e.g., `energy_consumption_kwh`, `kwh`, `energy`, `usage`).
3. Optional columns supported: `building_id`, `facility_id`, `temperature_c`, `occupancy_pct`, `tariff_per_kwh`.
4. The system provides an interactive column mapping tool and missing-value imputation (forward fill, linear interpolation, or deletion) prior to saving to the database.
