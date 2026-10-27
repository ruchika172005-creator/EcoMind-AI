import os
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.dataset import Dataset
from app.models.energy_record import EnergyRecord
from app.schemas.dataset import (
    DatasetResponse,
    DatasetDetailResponse,
    CSVPreviewResponse,
    ColumnMappingRequest
)
from app.services.data_service import DataService

router = APIRouter()

@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    return datasets

@router.post("/upload-preview", response_model=CSVPreviewResponse)
async def upload_csv_preview(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")
        
    content = await file.read()
    if len(content) > 100 * 1024 * 1024: # 100MB max
        raise HTTPException(status_code=400, detail="File size exceeds limit of 100MB.")
        
    try:
        preview = DataService.inspect_csv(content, file.filename)
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/process", response_model=DatasetResponse)
def process_and_save(req: ColumnMappingRequest, db: Session = Depends(get_db)):
    try:
        dataset = DataService.process_and_save_dataset(
            db=db,
            temp_file_id=req.temp_file_id,
            name=req.name,
            ts_col=req.timestamp_column,
            energy_col=req.energy_column,
            building_col=req.building_column,
            temp_col=req.temperature_column,
            occ_col=req.occupancy_column,
            missing_strategy=req.missing_value_strategy,
            is_demo=False
        )
        return dataset
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/demo", response_model=DatasetResponse)
def load_demo(db: Session = Depends(get_db)):
    try:
        demo_ds = DataService.load_demo_dataset(db)
        return demo_ds
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {str(e)}")

@router.get("/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
        
    # Sample records
    sample_recs = db.query(EnergyRecord).filter(
        EnergyRecord.dataset_id == dataset_id
    ).order_by(EnergyRecord.timestamp.asc()).limit(20).all()
    
    samples = [{
        "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "consumption_kwh": r.consumption_kwh,
        "building_id": r.building_id,
        "temperature_c": r.temperature_c,
        "occupancy_pct": r.occupancy_pct,
        "is_weekend": r.is_weekend
    } for r in sample_recs]
    
    resp = DatasetDetailResponse.model_validate(ds)
    resp.sample_records = samples
    return resp

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    success = DataService.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return {"status": "success", "message": f"Dataset {dataset_id} deleted successfully."}
