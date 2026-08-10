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
    is_confirmed: Optional[bool] = False
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[int] = None

    class Config:
        from_attributes = True

class InspectionCreateV2Request(BaseModel):
    mode: Optional[str] = "input"
    stage: Optional[str] = None
    po: Optional[str] = None
    result: Optional[str] = "pass"
    product: Optional[str] = None
    spec: Optional[str] = None
    sampleQty: Optional[Any] = None
    errorQty: Optional[Any] = None
    note: Optional[str] = None
    errors: Optional[List[Dict[str, Any]]] = []
    images: Optional[List[str]] = []
    creator: Optional[str] = None
    palletCode: Optional[str] = None
    subLot: Optional[str] = None
    humidity: Optional[Any] = None
    machine: Optional[str] = None
    area: Optional[str] = None
    answers: Optional[Any] = None
    steps: Optional[List[Dict[str, Any]]] = None

