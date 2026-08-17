from pydantic import BaseModel
from typing import Optional

class DefectCategoryBase(BaseModel):
    code: str
    name: str
    prefix: str
    default_departments: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = 0
    is_active: bool = True

class DefectCategoryCreate(DefectCategoryBase):
    pass

class DefectCategoryUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    prefix: Optional[str] = None
    default_departments: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class DefectCategoryResponse(DefectCategoryBase):
    id: int
    defect_count: Optional[int] = 0

    class Config:
        from_attributes = True
