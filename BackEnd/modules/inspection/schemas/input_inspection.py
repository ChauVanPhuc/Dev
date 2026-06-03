from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InputInspectionBase(BaseModel):
    plan_id:         int
    part_name:       str
    stage:           Optional[str] = None
    inspector_id:    Optional[int] = None
    measured_length: Optional[float] = None
    measured_width:  Optional[float] = None
    measured_height: Optional[float] = None
    result:          str   # 'Đạt' | 'Không đạt'
    note:            Optional[str] = None

class InputInspectionCreate(InputInspectionBase):
    pass

class InputInspection(InputInspectionBase):
    id:           int
    inspected_at: Optional[datetime] = None
    image_path_1: Optional[str] = None
    image_path_2: Optional[str] = None
    image_path_3: Optional[str] = None

    class Config:
        from_attributes = True
