from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class StageInspectionBase(BaseModel):
    inspection_type: str
    batch_no: Optional[str] = None
    product_sku: Optional[str] = None
    specification: Optional[str] = None
    inspector_name: Optional[str] = None
    conclusion: str = "pass"
    notes: Optional[str] = None
    data_json: Optional[str] = None
    images_json: Optional[str] = None

class StageInspectionCreate(StageInspectionBase):
    pass

class StageInspectionRead(StageInspectionBase):
    id: int
    inspection_date: datetime
    created_at: datetime
    image_path_1: Optional[str] = None
    image_path_2: Optional[str] = None
    image_path_3: Optional[str] = None

    class Config:
        from_attributes = True
