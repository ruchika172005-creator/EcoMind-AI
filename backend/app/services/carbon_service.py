import json
import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.energy_record import EnergyRecord
from app.models.carbon import CarbonCalculation
from app.models.setting import SystemSetting
from app.schemas.carbon import (
    CarbonCalculationResponse,
    MonthlyCarbonItem,
    EmissionFactorOption,
)

# Standard international emission factor catalog (kg CO2e / kWh)
STANDARD_EMISSION_FACTORS: List[EmissionFactorOption] = [
    EmissionFactorOption(
        id="us_egrid_avg",
        name="US National Grid (EPA eGRID)",
        region="United States",
        factor_kg_co2e_per_kwh=0.386,
        source="US EPA eGRID2022 Summary Tables",
        year=2022
    ),
    EmissionFactorOption(
        id="uk_defra_avg",
        name="UK National Grid (DESNZ / Defra)",
        region="United Kingdom",
        factor_kg_co2e_per_kwh=0.207,
        source="UK Government GHG Conversion Factors",
        year=2023
    ),
    EmissionFactorOption(
        id="india_cea_avg",
        name="India National Grid (CEA Baseline)",
        region="India",
        factor_kg_co2e_per_kwh=0.716,
        source="Central Electricity Authority India (v19)",
        year=2023
    ),
    EmissionFactorOption(
        id="eu_eea_avg",
        name="European Union Grid (EEA Average)",
        region="European Union",
        factor_kg_co2e_per_kwh=0.230,
        source="European Environment Agency (EEA)",
        year=2022
    ),
    EmissionFactorOption(
        id="australia_nemo_avg",
        name="Australia National Grid (NEM Average)",
        region="Australia",
        factor_kg_co2e_per_kwh=0.680,
        source="Australian National Greenhouse Accounts",
        year=2023
    ),
    EmissionFactorOption(
        id="california_caiso",
        name="California CAMX (EPA eGRID)",
        region="California, USA",
        factor_kg_co2e_per_kwh=0.215,
        source="US EPA eGRID subregion CAMX",
        year=2022
    ),
]

class CarbonService:
    @staticmethod
    def get_emission_factor_catalog() -> List[EmissionFactorOption]:
        return STANDARD_EMISSION_FACTORS

    @classmethod
    def calculate_emissions(
        cls,
        db: Session,
        dataset_id: int,
        custom_factor: Optional[float] = None,
        custom_source: Optional[str] = None
    ) -> CarbonCalculationResponse:
        records = db.query(EnergyRecord).filter(
            EnergyRecord.dataset_id == dataset_id
        ).order_by(EnergyRecord.timestamp.asc()).all()
        
        if not records:
            raise ValueError("No energy records found for the specified dataset.")
            
        # Determine emission factor to use
        if custom_factor is not None and custom_factor > 0:
            emission_factor = custom_factor
            factor_source = custom_source or "User Configured Factor"
        else:
            # Query setting from DB or default
            setting_factor = db.query(SystemSetting).filter_by(key="emission_factor").first()
            setting_name = db.query(SystemSetting).filter_by(key="emission_factor_name").first()
            emission_factor = float(setting_factor.value) if setting_factor else settings.DEFAULT_EMISSION_FACTOR
            factor_source = setting_name.value if setting_name else settings.DEFAULT_EMISSION_FACTOR_NAME

        data = [{
            "timestamp": r.timestamp,
            "consumption_kwh": r.consumption_kwh,
            "month_str": r.timestamp.strftime("%Y-%m")
        } for r in records]
        
        df = pd.DataFrame(data)
        
        total_kwh = float(df["consumption_kwh"].sum())
        total_emissions_kg = total_kwh * emission_factor
        total_emissions_mt = total_emissions_kg / 1000.0 # Metric tonnes
        
        # Monthly breakdown
        monthly_grp = df.groupby("month_str")["consumption_kwh"].sum().reset_index()
        monthly_items: List[MonthlyCarbonItem] = []
        for _, row in monthly_grp.iterrows():
            m_kwh = float(row["consumption_kwh"])
            m_kg = m_kwh * emission_factor
            monthly_items.append(MonthlyCarbonItem(
                month=row["month_str"],
                energy_kwh=round(m_kwh, 2),
                emissions_kg_co2e=round(m_kg, 2),
                emissions_mt_co2e=round(m_kg / 1000.0, 3)
            ))
            
        # EPA GHG Equivalency formulas:
        # 1 gallon of gasoline = 8.887 kg CO2e
        gasoline_gallons = total_emissions_kg / 8.887
        # 1 tree seedling grown for 10 years absorbs ~0.06 MT CO2e (60 kg CO2e)
        tree_seedlings = total_emissions_kg / 60.0
        # 1 passenger vehicle mile = ~0.400 kg CO2e
        vehicle_miles = total_emissions_kg / 0.400
        # 1 average home's annual electricity = ~7,490 kg CO2e
        homes_elec = total_emissions_kg / 7490.0
        
        start_time = df["timestamp"].min()
        end_time = df["timestamp"].max()
        
        # Persist CarbonCalculation
        calc_record = CarbonCalculation(
            dataset_id=dataset_id,
            emission_factor=emission_factor,
            factor_source=factor_source,
            total_energy_kwh=round(total_kwh, 2),
            total_emissions_kg_co2e=round(total_emissions_kg, 2),
            total_emissions_mt_co2e=round(total_emissions_mt, 3),
            period_start=start_time,
            period_end=end_time,
            gasoline_gallons_equiv=round(gasoline_gallons, 1),
            tree_seedlings_grown_10yr=round(tree_seedlings, 0),
            passenger_vehicle_miles=round(vehicle_miles, 0),
            homes_electricity_year=round(homes_elec, 2),
            breakdown_by_month=json.dumps([m.model_dump() for m in monthly_items])
        )
        db.add(calc_record)
        db.commit()
        db.refresh(calc_record)
        
        return CarbonCalculationResponse(
            id=calc_record.id,
            dataset_id=dataset_id,
            emission_factor=emission_factor,
            factor_source=factor_source,
            total_energy_kwh=round(total_kwh, 2),
            total_emissions_kg_co2e=round(total_emissions_kg, 2),
            total_emissions_mt_co2e=round(total_emissions_mt, 3),
            period_start=start_time,
            period_end=end_time,
            gasoline_gallons_equiv=round(gasoline_gallons, 1),
            tree_seedlings_grown_10yr=round(tree_seedlings, 0),
            passenger_vehicle_miles=round(vehicle_miles, 0),
            homes_electricity_year=round(homes_elec, 2),
            breakdown_by_month=monthly_items,
            created_at=calc_record.created_at
        )
