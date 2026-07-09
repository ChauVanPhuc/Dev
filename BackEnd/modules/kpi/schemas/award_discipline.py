from pydantic import BaseModel
from typing import Optional

class AwardDisciplineBase(BaseModel):
    staff_name: str
    issue: str
    note: Optional[str] = None
    impact: str
    points: int
    date: str
    evidence_images: Optional[str] = None

class AwardDisciplineCreate(AwardDisciplineBase):
    pass

class AwardDisciplineUpdate(BaseModel):
    staff_name: Optional[str] = None
    issue: Optional[str] = None
    note: Optional[str] = None
    impact: Optional[str] = None
    points: Optional[int] = None
    date: Optional[str] = None
    evidence_images: Optional[str] = None

class AwardDiscipline(AwardDisciplineBase):
    id: int

    class Config:
        from_attributes = True
