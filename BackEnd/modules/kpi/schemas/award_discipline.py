from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AwardDisciplineBase(BaseModel):
    staff_name: str
    issue: str
    note: Optional[str] = None
    impact: str
    points: int
    date: str
    evidence_images: Optional[str] = None
    rule_code: Optional[str] = None
    rule_name: Optional[str] = None
    severity: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    section: Optional[str] = None
    violation_time: Optional[str] = None
    reporter_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "pending"

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
    rule_code: Optional[str] = None
    rule_name: Optional[str] = None
    severity: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    section: Optional[str] = None
    violation_time: Optional[str] = None
    reporter_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class AwardDisciplineStatusUpdate(BaseModel):
    status: str  # pending, tracking, approved, rejected

class AwardDiscipline(AwardDisciplineBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
