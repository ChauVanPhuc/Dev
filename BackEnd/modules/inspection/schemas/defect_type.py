from pydantic import BaseModel
from typing import Optional

class DefectTypeBase(BaseModel):
    name: str
    category: str
    stage: Optional[str] = None
    description: Optional[str] = None
    needs_tracking: bool = False # QA tracking
    qc_tracking: bool = False    # QC tracking
    is_active: bool = True

class DefectTypeCreate(DefectTypeBase):
    pass

class DefectType(DefectTypeBase):
    id: int
    is_tracked_by_me: bool = False # Personalized QC tracking status

    class Config:
        from_attributes = True
