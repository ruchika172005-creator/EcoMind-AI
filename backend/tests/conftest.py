import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings
from app.models.setting import SystemSetting
from app.models.sustainability_score import SustainabilityScoreConfig
from app.models.esg import ESGIndicator
from app.models.erp import ERPConnector
from app.models.iot import IoTDevice

# Use an in-memory SQLite database for test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # 1. Seed default system settings
    settings_data = [
        SystemSetting(key="emission_factor", value=str(settings.DEFAULT_EMISSION_FACTOR), description="Grid carbon factor"),
        SystemSetting(key="emission_factor_name", value=settings.DEFAULT_EMISSION_FACTOR_NAME, description="Grid factor name"),
        SystemSetting(key="energy_tariff", value=str(settings.DEFAULT_ENERGY_TARIFF), description="Electricity tariff"),
        SystemSetting(key="default_forecast_horizon", value="168", description="Default horizon"),
        SystemSetting(key="default_contamination", value="0.03", description="Default contamination"),
    ]
    session.add_all(settings_data)

    # 2. Seed scoring config
    cfg = SustainabilityScoreConfig(
        name="Corporate ESG & Sustainability Standard",
        weight_environmental=0.35,
        weight_energy=0.25,
        weight_carbon=0.20,
        weight_water=0.10,
        weight_waste=0.10,
        target_energy_intensity=25.0,
        target_carbon_intensity=9.5,
        target_water_intensity=1.2,
        target_waste_diversion=65.0,
        target_anomaly_rate=0.03
    )
    session.add(cfg)

    # 3. Seed standard ESG indicators
    standard_indicators = [
        ESGIndicator(category="Environmental", code="GRI-302-1", name="Total Energy Consumption", unit="kWh", description="Energy consumed.", framework="GRI 302-1", is_mandatory=True, sort_order=1),
        ESGIndicator(category="Environmental", code="GRI-302-3", name="Energy Intensity", unit="kWh / m²", description="Energy intensity.", framework="GRI 302-3", is_mandatory=True, sort_order=2),
        ESGIndicator(category="Environmental", code="GRI-305-1", name="Direct GHG Emissions (Scope 1)", unit="MT CO2e", description="Scope 1.", framework="GRI 305-1", is_mandatory=True, sort_order=3),
        ESGIndicator(category="Environmental", code="GRI-305-2", name="Indirect GHG Emissions (Scope 2)", unit="MT CO2e", description="Scope 2.", framework="GRI 305-2", is_mandatory=True, sort_order=4),
        ESGIndicator(category="Environmental", code="GRI-305-4", name="GHG Emissions Intensity", unit="kg CO2e / unit", description="Carbon intensity.", framework="GRI 305-4", is_mandatory=False, sort_order=5),
        ESGIndicator(category="Environmental", code="GRI-303-1", name="Total Water Consumption", unit="m³", description="Water withdrawal.", framework="GRI 303-1", is_mandatory=False, sort_order=6),
        ESGIndicator(category="Environmental", code="GRI-306-3", name="Total Waste Generated", unit="Metric Tonnes", description="Total waste.", framework="GRI 306-3", is_mandatory=False, sort_order=7),
        ESGIndicator(category="Environmental", code="GRI-306-4", name="Waste Diverted from Disposal", unit="%", description="Waste diverted.", framework="GRI 306-4", is_mandatory=False, sort_order=8),
        ESGIndicator(category="Environmental", code="GRI-302-1-REN", name="Renewable Energy Share", unit="%", description="Renewables.", framework="GRI 302-1", is_mandatory=False, sort_order=9),
        ESGIndicator(category="Social", code="GRI-403-9", name="Lost-Time Injury Frequency Rate", unit="Incidents", description="EHS.", framework="GRI 403-9", is_mandatory=False, sort_order=10),
        ESGIndicator(category="Social", code="GRI-404-1", name="Sustainability Training Hours", unit="Hours", description="Training.", framework="GRI 404-1", is_mandatory=False, sort_order=11),
        ESGIndicator(category="Governance", code="GRI-2-9", name="Board Sustainability Oversight", unit="Status", description="Board oversight.", framework="GRI 2-9", is_mandatory=True, sort_order=12),
    ]
    session.add_all(standard_indicators)

    # 4. Seed ERP connectors
    connectors = [
        ERPConnector(
            name="SAP S/4HANA Utilities Adapter",
            connector_type="SIMULATED",
            endpoint_url="https://sap-gateway.enterprise.internal/odata/v4/UtilityBilling",
            auth_type="OAUTH2",
            credentials_masked="oauth2_client_id: sap_****_prod",
            is_simulated=True,
            status="CONNECTED",
            last_sync_status="SUCCESS",
            last_sync_records_count=12
        ),
        ERPConnector(
            name="Oracle NetSuite ERP",
            connector_type="NETSUITE",
            endpoint_url="https://app.netsuite.com/services/rest/record/v1/customrecord_utility_bill",
            auth_type="BEARER_TOKEN",
            credentials_masked="bearer: ns_****_corp",
            is_simulated=False,
            status="CONFIGURED"
        )
    ]
    session.add_all(connectors)

    # 5. Seed IoT devices
    devices = [
        IoTDevice(
            device_id="MTR-BLDG1-MAIN",
            name="HQ Main Building Feeder Smart Meter",
            facility_id="HQ-BLDG-01",
            device_type="ELECTRIC_SMART_METER",
            measurement_type="ACTIVE_POWER_KW",
            unit="kW",
            protocol="HTTP",
            connection_status="ONLINE",
            latest_value=284.5,
            is_simulated=True,
            configuration_json='{"alarm_threshold_kw": 450.0}'
        ),
        IoTDevice(
            device_id="SUB-HVAC-CHILLER",
            name="Chiller Plant Submeter #1",
            facility_id="HQ-BLDG-01",
            device_type="ELECTRIC_SUBMETER",
            measurement_type="ACTIVE_POWER_KW",
            unit="kW",
            protocol="HTTP",
            connection_status="ONLINE",
            latest_value=122.3,
            is_simulated=True
        ),
        IoTDevice(
            device_id="WTR-FLOW-MAIN",
            name="Primary Water Intake Flow Meter",
            facility_id="HQ-BLDG-01",
            device_type="WATER_FLOW_METER",
            measurement_type="WATER_VOLUME_M3",
            unit="m³",
            protocol="HTTP",
            connection_status="ONLINE",
            latest_value=14.8,
            is_simulated=True
        )
    ]
    session.add_all(devices)
    session.commit()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
