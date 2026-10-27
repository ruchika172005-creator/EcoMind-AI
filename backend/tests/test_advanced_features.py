import pytest
from app.integrations.erp.security import ERPSecurity
from app.services.scoring_service import SustainabilityScoringService

def test_sustainability_scoring_weights_validation():
    # Valid weights summing to 1.0
    assert SustainabilityScoringService.validate_weights(0.35, 0.25, 0.20, 0.10, 0.10) is True
    # Invalid: sums to 0.70
    assert SustainabilityScoringService.validate_weights(0.20, 0.20, 0.10, 0.10, 0.10) is False
    # Invalid: negative weight
    assert SustainabilityScoringService.validate_weights(-0.10, 0.40, 0.40, 0.15, 0.15) is False

def test_sustainability_metric_normalization():
    # Lower is better: at or below benchmark receives high score (80 - 100)
    score_good = SustainabilityScoringService.normalize_metric(observed=15.0, benchmark=25.0, direction="lower_is_better")
    assert score_good >= 90.0

    # Lower is better: double the benchmark receives low score (<= 30)
    score_bad = SustainabilityScoringService.normalize_metric(observed=55.0, benchmark=25.0, direction="lower_is_better")
    assert score_bad <= 35.0

    # Higher is better: 70% diversion with 70% benchmark receives 100.0
    score_high = SustainabilityScoringService.normalize_metric(observed=70.0, benchmark=70.0, direction="higher_is_better")
    assert score_high == 100.0

def test_sustainability_scoring_api(client):
    # Trigger scoring calculation
    res = client.post("/api/v1/sustainability/scores/run", json={"facility_id": "HQ-BLDG-01"})
    assert res.status_code == 200
    data = res.json()
    assert "overall_score" in data
    assert 0.0 <= data["overall_score"] <= 100.0
    assert "environmental_score" in data
    assert "energy_efficiency_score" in data
    assert "carbon_performance_score" in data
    assert "data_completeness_pct" in data
    assert len(data["breakdown"]) >= 3
    assert len(data["recommendations"]) >= 1

    # Check config endpoint
    cfg_res = client.get("/api/v1/sustainability/scores/config")
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert "weight_environmental" in cfg

    # Update config with valid weights
    up_res = client.put("/api/v1/sustainability/scores/config", json={
        "name": "Updated Test Weights",
        "weight_environmental": 0.40,
        "weight_energy": 0.20,
        "weight_carbon": 0.20,
        "weight_water": 0.10,
        "weight_waste": 0.10,
        "target_energy_intensity": 22.0,
        "target_carbon_intensity": 8.0,
        "target_water_intensity": 1.0,
        "target_waste_diversion": 75.0,
        "target_anomaly_rate": 0.02
    })
    assert up_res.status_code == 200
    assert up_res.json()["weight_environmental"] == 0.40

    # Test history endpoint
    hist_res = client.get("/api/v1/sustainability/scores/history")
    assert hist_res.status_code == 200
    assert len(hist_res.json()) >= 1

def test_esg_reporting_api(client):
    # 1. Fetch indicators
    ind_res = client.get("/api/v1/esg/indicators")
    assert ind_res.status_code == 200
    indicators = ind_res.json()
    assert len(indicators) >= 10
    assert any(i["code"] == "GRI-302-1" for i in indicators)

    # 2. Fetch indicator values
    val_res = client.get("/api/v1/esg/values?reporting_period=2024-Annual")
    assert val_res.status_code == 200
    values = val_res.json()
    assert len(values) >= 10

    # 3. Generate PDF Report
    gen_res = client.post("/api/v1/esg/reports", json={
        "organization_name": "EcoMind Test Org",
        "facility_id": "HQ-BLDG-01",
        "reporting_period": "2024-Annual",
        "framework_alignment": "GRI Standards / ISSB S2"
    })
    assert gen_res.status_code == 200
    report_data = gen_res.json()
    assert report_data["pdf_filename"] is not None
    assert report_data["completeness_score"] > 0
    report_id = report_data["id"]

    # 4. Download PDF
    pdf_res = client.get(f"/api/v1/esg/reports/{report_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Actual binary PDF content!

    # 5. Export CSV
    csv_res = client.get("/api/v1/esg/export/csv?reporting_period=2024-Annual")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "GRI_Code" in csv_res.text

def test_erp_ssrf_security():
    # Loopback blocked
    assert ERPSecurity.validate_safe_url("http://127.0.0.1:8000/api") is False
    assert ERPSecurity.validate_safe_url("http://localhost:8000/api") is False
    # Cloud metadata blocked
    assert ERPSecurity.validate_safe_url("http://169.254.169.254/latest/meta-data") is False
    # Invalid schemes
    assert ERPSecurity.validate_safe_url("ftp://ftp.server.com") is False
    assert ERPSecurity.validate_safe_url("file:///etc/passwd") is False

def test_erp_connectors_and_sync(client):
    # 1. List connectors
    conn_res = client.get("/api/v1/integrations/erp/connectors")
    assert conn_res.status_code == 200
    connectors = conn_res.json()
    assert len(connectors) >= 1

    sim_conn = next((c for c in connectors if c["is_simulated"]), connectors[0])
    conn_id = sim_conn["id"]

    # 2. Test Connection
    test_res = client.post(f"/api/v1/integrations/erp/connectors/{conn_id}/test")
    assert test_res.status_code == 200
    assert test_res.json()["success"] is True

    # 3. Synchronize
    sync_res = client.post(f"/api/v1/integrations/erp/connectors/{conn_id}/sync?limit_records=12")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["status"] in ("SUCCESS", "PARTIAL")
    assert sync_data["records_imported"] >= 1

    # 4. Check Utility Records
    rec_res = client.get("/api/v1/integrations/erp/utility-records")
    assert rec_res.status_code == 200
    assert len(rec_res.json()) >= 1

    # 5. Idempotent re-sync (should skip already imported transactions)
    resync_res = client.post(f"/api/v1/integrations/erp/connectors/{conn_id}/sync?limit_records=12")
    assert resync_res.status_code == 200
    assert resync_res.json()["records_skipped"] >= 1

def test_iot_devices_and_ingestion(client):
    # 1. List devices
    dev_res = client.get("/api/v1/iot/devices")
    assert dev_res.status_code == 200
    devices = dev_res.json()
    assert len(devices) >= 3
    assert any(d["device_id"] == "MTR-BLDG1-MAIN" for d in devices)

    # 2. Ingest valid reading (instantaneous power kW)
    ingest_payload = {
        "readings": [
            {
                "device_id": "MTR-BLDG1-MAIN",
                "facility_id": "HQ-BLDG-01",
                "timestamp_utc": "2024-06-15T10:30:00Z",
                "measurement_type": "ACTIVE_POWER_KW",
                "value": 312.4,
                "unit": "kW"
            }
        ]
    }
    ing_res = client.post("/api/v1/iot/ingest", json=ingest_payload)
    assert ing_res.status_code == 200
    assert ing_res.json()["accepted_count"] == 1

    # 3. Unit validation error: power with kWh must be rejected by Pydantic
    bad_payload = {
        "readings": [
            {
                "device_id": "MTR-BLDG1-MAIN",
                "facility_id": "HQ-BLDG-01",
                "timestamp_utc": "2024-06-15T11:00:00Z",
                "measurement_type": "ACTIVE_POWER_KW",
                "value": 312.4,
                "unit": "kWh" # Confusion between kW and kWh!
            }
        ]
    }
    bad_res = client.post("/api/v1/iot/ingest", json=bad_payload)
    assert bad_res.status_code == 422 # Pydantic schema validation error!

    # 4. Duplicate reading rejection
    dup_res = client.post("/api/v1/iot/ingest", json=ingest_payload)
    assert dup_res.status_code == 200
    assert dup_res.json()["duplicates_count"] == 1

    # 5. Simulator Step with Anomaly Spike (triggers alert)
    sim_res = client.post("/api/v1/iot/simulator/step", json={
        "action": "step",
        "inject_anomaly": True,
        "readings_per_device": 1
    })
    assert sim_res.status_code == 200
    assert sim_res.json()["accepted_count"] >= 1
    assert sim_res.json()["alerts_triggered_count"] >= 1

    # 6. Check Alerts
    alert_res = client.get("/api/v1/iot/alerts")
    assert alert_res.status_code == 200
    alerts = alert_res.json()
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    # 7. Resolve Alert
    resolve_res = client.patch(f"/api/v1/iot/alerts/{alert_id}/resolve")
    assert resolve_res.status_code == 200
    assert resolve_res.json()["resolved"] is True

    # 8. Check IoT Subsystem Health
    health_res = client.get("/api/v1/iot/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"
