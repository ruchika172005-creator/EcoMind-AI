from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.setting import SystemSetting
from app.schemas.setting import SettingResponse, SettingUpdateRequest

router = APIRouter()

@router.get("", response_model=List[SettingResponse])
def get_settings(db: Session = Depends(get_db)):
    settings_list = db.query(SystemSetting).all()
    return settings_list

@router.put("", response_model=SettingResponse)
def update_setting(req: SettingUpdateRequest, db: Session = Depends(get_db)):
    setting_obj = db.query(SystemSetting).filter_by(key=req.key).first()
    if not setting_obj:
        setting_obj = SystemSetting(key=req.key, value=req.value)
        db.add(setting_obj)
    else:
        setting_obj.value = req.value
        
    db.commit()
    db.refresh(setting_obj)
    return setting_obj
