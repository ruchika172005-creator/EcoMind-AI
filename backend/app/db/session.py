from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Determine database dialect
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables and seed default settings, ESG catalog, and demo integrations."""
    from app.models import (
        dataset,
        energy_record,
        forecast,
        anomaly,
        carbon,
        recommendation,
        setting,
        sustainability_score,
        esg,
        erp,
        iot,
    )
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        from app.models.setting import SystemSetting
        existing_setting = db.query(SystemSetting).filter_by(key="emission_factor").first()
        if not existing_setting:
            default_settings = [
                SystemSetting(
                    key="emission_factor",
                    value=str(settings.DEFAULT_EMISSION_FACTOR),
                    description="Grid carbon emission factor in kg CO2e / kWh"
                ),
                SystemSetting(
                    key="emission_factor_name",
                    value=settings.DEFAULT_EMISSION_FACTOR_NAME,
                    description="Standard or geographic label for the active emission factor"
                ),
                SystemSetting(
                    key="energy_tariff",
                    value=str(settings.DEFAULT_ENERGY_TARIFF),
                    description="Standard electricity tariff in $ / kWh"
                ),
                SystemSetting(
                    key="default_forecast_horizon",
                    value="168",
                    description="Default forecasting horizon in hours (168 = 7 days)"
                ),
                SystemSetting(
                    key="default_contamination",
                    value="0.03",
                    description="Default anomaly detection contamination fraction (3%)"
                ),
            ]
            db.add_all(default_settings)
            db.commit()

        # Seed default sustainability scoring config
        from app.models.sustainability_score import SustainabilityScoreConfig
        existing_cfg = db.query(SustainabilityScoreConfig).first()
        if not existing_cfg:
            cfg = SustainabilityScoreConfig(
                name="Corporate ESG & Sustainability Standard",
                weight_environmental=0.35,
                weight_energy=0.25,
                weight_carbon=0.20,
                weight_water=0.10,
                weight_waste=0.10,
                target_energy_intensity=25.0, # kWh / m² / month
                target_carbon_intensity=9.5,  # kg CO2e / unit
                target_water_intensity=1.2,   # m³ / occupant
                target_waste_diversion=65.0,  # 65% target diversion
                target_anomaly_rate=0.03      # 3% acceptable threshold
            )
            db.add(cfg)
            db.commit()

        # Seed standard GRI / ISSB ESG indicators
        from app.models.esg import ESGIndicator
        if db.query(ESGIndicator).count() == 0:
            standard_indicators = [
                # Environmental
                ESGIndicator(category="Environmental", code="GRI-302-1", name="Total Energy Consumption", unit="kWh", description="Total electrical and thermal energy consumed across facility boundary.", framework="GRI 302-1 / ISSB S2", is_mandatory=True, sort_order=1),
                ESGIndicator(category="Environmental", code="GRI-302-3", name="Energy Intensity", unit="kWh / m²", description="Energy consumption normalized per square meter of operational floor area.", framework="GRI 302-3", is_mandatory=True, sort_order=2),
                ESGIndicator(category="Environmental", code="GRI-305-1", name="Direct GHG Emissions (Scope 1)", unit="MT CO2e", description="Direct emissions from stationary combustion, generators, and natural gas.", framework="GRI 305-1 / GHG Protocol", is_mandatory=True, sort_order=3),
                ESGIndicator(category="Environmental", code="GRI-305-2", name="Indirect GHG Emissions (Scope 2)", unit="MT CO2e", description="Location-based emissions from purchased grid electricity.", framework="GRI 305-2 / GHG Protocol", is_mandatory=True, sort_order=4),
                ESGIndicator(category="Environmental", code="GRI-305-4", name="GHG Emissions Intensity", unit="kg CO2e / unit", description="Carbon intensity relative to organizational activity or production output.", framework="GRI 305-4", is_mandatory=False, sort_order=5),
                ESGIndicator(category="Environmental", code="GRI-303-1", name="Total Water Consumption", unit="m³", description="Municipal potable and utility water withdrawal across operations.", framework="GRI 303-1", is_mandatory=False, sort_order=6),
                ESGIndicator(category="Environmental", code="GRI-306-3", name="Total Waste Generated", unit="Metric Tonnes", description="Total operational waste generated prior to recycling or landfilling.", framework="GRI 306-3", is_mandatory=False, sort_order=7),
                ESGIndicator(category="Environmental", code="GRI-306-4", name="Waste Diverted from Disposal", unit="%", description="Percentage of solid waste sent to recycling, composting, or reuse.", framework="GRI 306-4", is_mandatory=False, sort_order=8),
                ESGIndicator(category="Environmental", code="GRI-302-1-REN", name="Renewable Energy Share", unit="%", description="Proportion of total power sourced from onsite or certified renewable PPAs.", framework="GRI 302-1", is_mandatory=False, sort_order=9),

                # Social
                ESGIndicator(category="Social", code="GRI-403-9", name="Lost-Time Injury Frequency Rate (LTIFR)", unit="Incidents / 1M hrs", description="Work-related safety incidents resulting in lost work days per million hours.", framework="GRI 403-9", is_mandatory=False, sort_order=10),
                ESGIndicator(category="Social", code="GRI-404-1", name="Sustainability & Safety Training Hours", unit="Hours / Employee", description="Average annual hours of occupational safety and environmental training per employee.", framework="GRI 404-1", is_mandatory=False, sort_order=11),
                ESGIndicator(category="Social", code="GRI-405-1", name="Workforce Diversity Index", unit="%", description="Representation of historically underrepresented demographics in workforce.", framework="GRI 405-1", is_mandatory=False, sort_order=12),

                # Governance
                ESGIndicator(category="Governance", code="GRI-2-9", name="Board Sustainability Oversight", unit="Status", description="Formal board-level charter and committee reviewing ESG risks and targets.", framework="GRI 2-9 / IFRS S1", is_mandatory=True, sort_order=13),
                ESGIndicator(category="Governance", code="GRI-2-23", name="Climate & Decarbonization Policy Status", unit="Status", description="Executive-approved policy codifying net-zero commitments and science-based targets.", framework="GRI 2-23", is_mandatory=True, sort_order=14),
                ESGIndicator(category="Governance", code="GRI-2-27", name="Regulatory Compliance Status", unit="Status", description="Record of zero significant environmental non-compliance fines or sanctions.", framework="GRI 2-27", is_mandatory=True, sort_order=15),
                ESGIndicator(category="Governance", code="GRI-2-5", name="Data Provenance & Audit Verification", unit="Status", description="Independent third-party verification or internal audit signoff on energy data.", framework="GRI 2-5", is_mandatory=True, sort_order=16),
            ]
            db.add_all(standard_indicators)
            db.commit()

        # Seed default ERP connectors
        from app.models.erp import ERPConnector
        if db.query(ERPConnector).count() == 0:
            connectors = [
                ERPConnector(
                    name="SAP S/4HANA Utilities Adapter",
                    connector_type="SAP",
                    endpoint_url="https://sap-gateway.enterprise.internal/odata/v4/UtilityBilling",
                    auth_type="OAUTH2",
                    credentials_masked="oauth2_client_id: sap_****_prod",
                    is_simulated=True,
                    status="CONNECTED",
                    last_sync_status="SUCCESS",
                    last_sync_records_count=12,
                    field_mapping='{"invoice_no": "InvoiceNumber", "billing_start": "PeriodStartDate", "billing_end": "PeriodEndDate", "kwh": "BilledElectricityKWh", "cost": "TotalAmountUSD"}'
                ),
                ERPConnector(
                    name="Oracle NetSuite ERP",
                    connector_type="NETSUITE",
                    endpoint_url="https://app.netsuite.com/services/rest/record/v1/customrecord_utility_bill",
                    auth_type="BEARER_TOKEN",
                    credentials_masked="bearer: ns_****_corp",
                    is_simulated=False,
                    status="CONFIGURED",
                    field_mapping='{"invoice_no": "tranId", "billing_start": "custrecord_period_start", "billing_end": "custrecord_period_end", "kwh": "custrecord_kwh_billed", "cost": "custrecord_bill_amount"}'
                ),
                ERPConnector(
                    name="Microsoft Dynamics 365 Finance & Ops",
                    connector_type="DYNAMICS_365",
                    endpoint_url="https://org.operations.dynamics.com/data/UtilityInvoices",
                    auth_type="OAUTH2",
                    credentials_masked="aad_client_id: d365_****_tenant",
                    is_simulated=False,
                    status="CONFIGURED",
                    field_mapping='{"invoice_no": "InvoiceId", "billing_start": "StartDate", "billing_end": "EndDate", "kwh": "MeteredKWh", "cost": "InvoiceAmount"}'
                ),
                ERPConnector(
                    name="Generic CSV / Flat-File Ingest",
                    connector_type="CSV_IMPORT",
                    endpoint_url=None,
                    auth_type="NONE",
                    credentials_masked="N/A (Local Ingestion)",
                    is_simulated=False,
                    status="CONNECTED",
                    last_sync_status="SUCCESS",
                    last_sync_records_count=24
                )
            ]
            db.add_all(connectors)
            db.commit()

        # Seed default IoT devices
        from app.models.iot import IoTDevice
        if db.query(IoTDevice).count() == 0:
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
                    configuration_json='{"sampling_rate_seconds": 60, "ct_ratio": 200, "alarm_threshold_kw": 480.0}'
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
                    is_simulated=True,
                    configuration_json='{"subsystem": "HVAC", "alarm_threshold_kw": 250.0}'
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
                    is_simulated=True,
                    configuration_json='{"flow_sensor": "Electromagnetic Pulse", "alarm_leak_threshold_m3": 45.0}'
                ),
                IoTDevice(
                    device_id="SOLAR-INV-ROOF",
                    name="Rooftop Solar Array Inverter",
                    facility_id="HQ-BLDG-01",
                    device_type="ELECTRIC_SUBMETER",
                    measurement_type="ACTIVE_POWER_KW",
                    unit="kW",
                    protocol="MQTT",
                    connection_status="ONLINE",
                    latest_value=68.2,
                    is_simulated=True,
                    configuration_json='{"mqtt_topic": "ecomind/meters/solar/power", "capacity_kw": 100.0}'
                ),
                IoTDevice(
                    device_id="ENV-TEMP-OUTDOOR",
                    name="Facility Weather Station Ambient Sensor",
                    facility_id="HQ-BLDG-01",
                    device_type="TEMPERATURE_SENSOR",
                    measurement_type="TEMPERATURE_C",
                    unit="°C",
                    protocol="HTTP",
                    connection_status="ONLINE",
                    latest_value=22.4,
                    is_simulated=True,
                    configuration_json='{"precision": 0.1}'
                ),
            ]
            db.add_all(devices)
            db.commit()

    except Exception as e:
        db.rollback()
        print(f"Warning during DB init seed: {e}")
    finally:
        db.close()
