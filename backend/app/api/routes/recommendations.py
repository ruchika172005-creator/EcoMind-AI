from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.recommendation import Recommendation
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationUpdateRequest,
    RecommendationSummaryResponse
)
from app.services.recommendation_service import RecommendationEngine

router = APIRouter()

@router.post("/generate/{dataset_id}", response_model=RecommendationSummaryResponse)
def generate_recommendations(dataset_id: int, db: Session = Depends(get_db)):
    try:
        summary = RecommendationEngine.generate_recommendations(db, dataset_id)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")

@router.get("/{dataset_id}", response_model=RecommendationSummaryResponse)
def get_recommendations(dataset_id: int, db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(
        Recommendation.dataset_id == dataset_id
    ).order_by(Recommendation.id.asc()).all()
    
    if not recs:
        try:
            return RecommendationEngine.generate_recommendations(db, dataset_id)
        except Exception:
            return RecommendationSummaryResponse(
                total_recommendations=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                total_potential_kwh_savings=0.0,
                total_potential_cost_savings=0.0,
                total_potential_co2e_kg_savings=0.0,
                recommendations=[]
            )
            
    tot_kwh = sum(r.expected_savings_kwh or 0 for r in recs)
    tot_cost = sum(r.expected_savings_cost or 0 for r in recs)
    tot_co2 = sum(r.expected_savings_co2e_kg or 0 for r in recs)
    
    return RecommendationSummaryResponse(
        total_recommendations=len(recs),
        critical_count=sum(1 for r in recs if r.priority == "Critical"),
        high_count=sum(1 for r in recs if r.priority == "High"),
        medium_count=sum(1 for r in recs if r.priority == "Medium"),
        low_count=sum(1 for r in recs if r.priority == "Low"),
        total_potential_kwh_savings=round(tot_kwh, 1),
        total_potential_cost_savings=round(tot_cost, 2),
        total_potential_co2e_kg_savings=round(tot_co2, 1),
        recommendations=[
            RecommendationResponse(
                id=r.id,
                dataset_id=r.dataset_id,
                title=r.title,
                category=r.category,
                priority=r.priority,
                evidence=r.evidence,
                calculation_details=r.calculation_details,
                suggested_action=r.suggested_action,
                limitations=r.limitations,
                expected_savings_kwh=r.expected_savings_kwh,
                expected_savings_cost=r.expected_savings_cost,
                expected_savings_co2e_kg=r.expected_savings_co2e_kg,
                status=r.status,
                created_at=r.created_at
            )
            for r in recs
        ]
    )

@router.patch("/{recommendation_id}/status")
def update_recommendation_status(
    recommendation_id: int,
    req: RecommendationUpdateRequest,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
        
    rec.status = req.status
    db.commit()
    return {"status": "success", "recommendation_id": rec.id, "new_status": rec.status}
