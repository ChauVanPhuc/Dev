from pydantic import BaseModel
from typing import Optional
from datetime import date

class EquipmentBase(BaseModel):
    name:              str
    code:              str
    type:              Optional[str] = None
    status:            Optional[str] = None
    purchase_date:     Optional[date] = None
    maintenance_cycle: Optional[int] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(EquipmentBase):
    name: Optional[str] = None
    code: Optional[str] = None

class Equipment(EquipmentBase):
    id: int

    class Config:
        from_attributes = True
