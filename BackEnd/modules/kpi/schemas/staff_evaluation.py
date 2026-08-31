from pydantic import BaseModel
from typing import Optional

class StaffEvaluationBase(BaseModel):
    employee_id: Optional[str] = None
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
    eval_date: Optional[str] = None
    achievements: Optional[str] = None
    limitations: Optional[str] = None
    improvement_plan: Optional[str] = None
    proposals: Optional[str] = None

class StaffEvaluationCreate(StaffEvaluationBase):
    pass

class StaffEvaluationUpdate(BaseModel):
    employee_id: Optional[str] = None
    staff_name: Optional[str] = None
    stage: Optional[str] = None
    level: Optional[str] = None
    department: Optional[str] = None
    goal_score: Optional[float] = None
    actual_score: Optional[float] = None
    rating: Optional[str] = None
    manager_note: Optional[str] = None
    proposed_action: Optional[str] = None
    status: Optional[str] = None
    eval_date: Optional[str] = None
    achievements: Optional[str] = None
    limitations: Optional[str] = None
    improvement_plan: Optional[str] = None
    proposals: Optional[str] = None

class StaffEvaluation(StaffEvaluationBase):
    id: int

    class Config:
        from_attributes = True
