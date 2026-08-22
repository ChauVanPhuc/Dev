from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InputInspectionBase(BaseModel):
    plan_id:         Optional[int] = None
    part_name:       Optional[str] = None
    specification:   Optional[str] = None
    cont_name:       Optional[str] = None
    stage:           Optional[str] = None
    inspector_id:    Optional[int] = None
    measured_length: Optional[float] = None
    measured_width:  Optional[float] = None
    measured_height: Optional[float] = None
    result:          Optional[str] = "pass"   # 'Đạt' | 'Không đạt' | 'pass'
    note:            Optional[str] = None

class InputInspectionCreate(InputInspectionBase):
    pass

class InputInspection(InputInspectionBase):
    id:           int
    inspected_at: Optional[datetime] = None
    image_path_1: Optional[str] = None
    image_path_2: Optional[str] = None
    image_path_3: Optional[str] = None
    inspection_type: Optional[str] = None
    is_confirmed: Optional[bool] = False
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[int] = None

    class Config:
        from_attributes = True

class InputInspectionRead(InputInspection):
    inspector_name: Optional[str] = None
    ticket_code: Optional[str] = None
    pallet_code: Optional[str] = None
    batch_no: Optional[str] = None
    product_sku: Optional[str] = None
    required_qty: Optional[int] = None
    sample_qty: Optional[int] = None
    error_qty: Optional[int] = None
    conclusion: Optional[str] = "pass"
    notes: Optional[str] = None
    stage_name: Optional[str] = None
    data_json: Optional[str] = None
    images_json: Optional[str] = None
    inspection_date: Optional[datetime] = None
    created_at: Optional[datetime] = None


