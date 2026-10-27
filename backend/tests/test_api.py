import pytest
import io

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert "Isolation Forest (Scikit-Learn)" in data["models_available"]

def test_settings_endpoints(client):
    response = client.get("/api/v1/settings")
    assert response.status_code == 200
    settings = response.json()
    assert len(settings) >= 3
    
    # Update a setting
    update_res = client.put("/api/v1/settings", json={"key": "energy_tariff", "value": "0.18"})
    assert update_res.status_code == 200
    assert update_res.json()["value"] == "0.18"

def test_load_demo_dataset(client):
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    ds = res.json()
    assert ds["name"] == "Commercial Campus Energy (Demo)"
    assert ds["row_count"] > 1000
    assert ds["is_demo"] is True
    assert ds["total_consumption_kwh"] > 0
    dataset_id = ds["id"]

    # Verify listing
    list_res = client.get("/api/v1/datasets")
    assert list_res.status_code == 200
    datasets = list_res.json()
    assert any(d["id"] == dataset_id for d in datasets)

    # Verify detail
    detail_res = client.get(f"/api/v1/datasets/{dataset_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["sample_records"]) > 0

def test_full_pipeline_with_demo_dataset(client):
    # 1. Load demo dataset
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    dataset_id = res.json()["id"]

    # 2. Analytics overview
    overview_res = client.get(f"/api/v1/analytics/overview/{dataset_id}")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["total_energy_kwh"] > 0
    assert overview["avg_daily_kwh"] > 0
    assert overview["peak_demand_kwh"] > 0

    # 3. Timeseries
    ts_res = client.get(f"/api/v1/analytics/timeseries/{dataset_id}?limit=100")
    assert ts_res.status_code == 200
    ts_data = ts_res.json()
    assert len(ts_data) <= 100
    assert "consumption_kwh" in ts_data[0]

    # 4. Hourly profile
    profile_res = client.get(f"/api/v1/analytics/hourly-profile/{dataset_id}")
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert len(profile_data) == 24

    # 5. Period breakdown
    breakdown_res = client.get(f"/api/v1/analytics/breakdown/{dataset_id}?period_type=month")
    assert breakdown_res.status_code == 200
    breakdown = breakdown_res.json()
    assert len(breakdown) > 0

    # 6. Forecasting - Baseline and ML
    fc_res = client.post("/api/v1/forecast/run", json={
        "dataset_id": dataset_id,
        "model_type": "random_forest",
        "horizon_hours": 24,
        "train_split_ratio": 0.8
    })
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert len(fc_data["predictions"]) == 24
    assert fc_data["mae"] >= 0
    assert fc_data["rmse"] >= 0
    assert len(fc_data["model_comparison"]) >= 2 # compared with baseline

    # Get latest forecast
    fc_get = client.get(f"/api/v1/forecast/runs/{dataset_id}")
    assert fc_get.status_code == 200
    assert fc_get.json()["id"] == fc_data["id"]

    # 7. Anomaly detection - Isolation Forest
    anom_res = client.post("/api/v1/anomalies/run", json={
        "dataset_id": dataset_id,
        "contamination": 0.02
    })
    assert anom_res.status_code == 200
    anom_data = anom_res.json()
    assert anom_data["anomalies_detected"] > 0
    assert len(anom_data["anomalies"]) > 0
    first_anom = anom_data["anomalies"][0]
    assert first_anom["severity"] in ["Critical", "High", "Medium", "Low"]

    # Get latest anomalies
    anom_get = client.get(f"/api/v1/anomalies/runs/{dataset_id}")
    assert anom_get.status_code == 200
    assert anom_get.json()["anomalies_detected"] == anom_data["anomalies_detected"]

    # 8. Carbon Accounting
    factors_res = client.get("/api/v1/carbon/factors")
    assert factors_res.status_code == 200
    assert len(factors_res.json()) >= 4

    carbon_calc = client.post("/api/v1/carbon/calculate", json={
        "dataset_id": dataset_id,
        "emission_factor": 0.386,
        "factor_source": "US EPA eGRID 2024"
    })
    assert carbon_calc.status_code == 200
    c_data = carbon_calc.json()
    assert c_data["total_emissions_kg_co2e"] > 0
    assert c_data["total_emissions_mt_co2e"] > 0
    assert c_data["tree_seedlings_grown_10yr"] > 0

    carbon_sum = client.get(f"/api/v1/carbon/summary/{dataset_id}")
    assert carbon_sum.status_code == 200
    assert carbon_sum.json()["total_emissions_kg_co2e"] == c_data["total_emissions_kg_co2e"]

    # 9. AI Recommendations
    rec_res = client.post(f"/api/v1/recommendations/generate/{dataset_id}")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["total_recommendations"] > 0
    assert len(rec_data["recommendations"]) > 0
    first_rec = rec_data["recommendations"][0]
    assert first_rec["priority"] in ["Critical", "High", "Medium", "Low"]
    assert first_rec["suggested_action"] != ""

    # Update recommendation status
    patch_res = client.patch(f"/api/v1/recommendations/{first_rec['id']}/status", json={"status": "In Progress"})
    assert patch_res.status_code == 200
    assert patch_res.json()["new_status"] == "In Progress"

    # 10. AI Sustainability Assistant
    query_res = client.post("/api/v1/assistant/query", json={
        "query": "What was the total energy consumption?",
        "dataset_id": dataset_id
    })
    assert query_res.status_code == 200
    ans_data = query_res.json()
    assert "kWh" in ans_data["answer"]
    assert len(ans_data["citations"]) > 0

    # 11. Reports & Exports
    rep_res = client.get(f"/api/v1/reports/summary/{dataset_id}")
    assert rep_res.status_code == 200
    rep_summary = rep_res.json()
    assert rep_summary["dataset"]["name"] == "Commercial Campus Energy (Demo)"

    # Export CSVs
    for mod in ["energy_records", "forecast", "anomalies", "carbon", "recommendations"]:
        csv_res = client.get(f"/api/v1/reports/export/{dataset_id}/{mod}")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers.get("content-type", "")
        content = csv_res.text
        assert len(content.splitlines()) > 1

def test_csv_upload_and_validation(client):
    # Valid mini CSV
    valid_csv = (
        "timestamp,energy_consumption_kwh,temperature_c\n"
        "2024-01-01 00:00:00,55.4,12.0\n"
        "2024-01-01 01:00:00,52.1,11.5\n"
        "2024-01-01 02:00:00,50.8,11.2\n"
    )
    files = {"file": ("test.csv", valid_csv.encode("utf-8"), "text/csv")}
    preview_res = client.post("/api/v1/datasets/upload-preview", files=files)
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["suggested_timestamp_col"] == "timestamp"
    assert preview["suggested_energy_col"] == "energy_consumption_kwh"

    # Process and save
    proc_res = client.post("/api/v1/datasets/process", json={
        "temp_file_id": preview["temp_file_id"],
        "name": "Unit Test Custom Dataset",
        "timestamp_column": "timestamp",
        "energy_column": "energy_consumption_kwh",
        "temperature_column": "temperature_c",
        "missing_value_strategy": "interpolate"
    })
    assert proc_res.status_code == 200
    new_ds = proc_res.json()
    assert new_ds["row_count"] == 3
    assert new_ds["name"] == "Unit Test Custom Dataset"

    # Clean up
    del_res = client.delete(f"/api/v1/datasets/{new_ds['id']}")
    assert del_res.status_code == 200
