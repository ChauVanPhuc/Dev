from pydantic import BaseModel
from typing import Optional

class DefectTypeBase(BaseModel):
    name: str
    category: str
    needs_tracking: bool = False
    is_active: bool = True

class DefectTypeCreate(DefectTypeBase):
    pass

class DefectType(DefectTypeBase):
    id: int

    class Config:
        from_attributes = True
