from pydantic import BaseModel
from typing import Optional

class StaffEvaluationBase(BaseModel):
    staff_name: str
    stage: Optional[str] = None
    level: Optional[str] = None
    department: Optional[str] = None
    goal_score: Optional[float] = None
    actual_score: Optional[float] = None
    status: Optional[str] = None
    rating: Optional[str] = None
    manager_note: Optional[str] = None
    proposed_action: Optional[str] = None
    kpi_details: Optional[str] = None

class StaffEvaluationCreate(StaffEvaluationBase):
    pass

class StaffEvaluationUpdate(BaseModel):
    rating: Optional[str] = None
    manager_note: Optional[str] = None
    proposed_action: Optional[str] = None
    status: Optional[str] = None

class StaffEvaluation(StaffEvaluationBase):
    id: int

    class Config:
        from_attributes = True
