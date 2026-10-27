from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.carbon import CarbonCalculation
from app.schemas.carbon import (
    CarbonCalculateRequest,
    CarbonCalculationResponse,
    EmissionFactorOption,
    MonthlyCarbonItem
)
from app.services.carbon_service import CarbonService
import json

router = APIRouter()

@router.get("/factors", response_model=List[EmissionFactorOption])
def get_standard_emission_factors():
    return CarbonService.get_emission_factor_catalog()

@router.post("/calculate", response_model=CarbonCalculationResponse)
def calculate_carbon(req: CarbonCalculateRequest, db: Session = Depends(get_db)):
    try:
        response = CarbonService.calculate_emissions(
            db=db,
            dataset_id=req.dataset_id,
            custom_factor=req.emission_factor,
            custom_source=req.factor_source
        )
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Carbon calculation error: {str(e)}")

@router.get("/summary/{dataset_id}", response_model=Optional[CarbonCalculationResponse])
def get_carbon_summary(dataset_id: int, db: Session = Depends(get_db)):
    calc = db.query(CarbonCalculation).filter(
        CarbonCalculation.dataset_id == dataset_id
    ).order_by(CarbonCalculation.id.desc()).first()
    
    if not calc:
        try:
            return CarbonService.calculate_emissions(db, dataset_id)
        except Exception:
            return None
            
    monthly_items = []
    if calc.breakdown_by_month:
        try:
            raw = json.loads(calc.breakdown_by_month)
            monthly_items = [MonthlyCarbonItem(**m) for m in raw]
        except Exception:
            pass

    return CarbonCalculationResponse(
        id=calc.id,
        dataset_id=calc.dataset_id,
        emission_factor=calc.emission_factor,
        factor_source=calc.factor_source,
        total_energy_kwh=calc.total_energy_kwh,
        total_emissions_kg_co2e=calc.total_emissions_kg_co2e,
        total_emissions_mt_co2e=calc.total_emissions_mt_co2e,
        period_start=calc.period_start,
        period_end=calc.period_end,
        gasoline_gallons_equiv=calc.gasoline_gallons_equiv or 0.0,
        tree_seedlings_grown_10yr=calc.tree_seedlings_grown_10yr or 0.0,
        passenger_vehicle_miles=calc.passenger_vehicle_miles or 0.0,
        homes_electricity_year=calc.homes_electricity_year or 0.0,
        breakdown_by_month=monthly_items,
        created_at=calc.created_at
    )
