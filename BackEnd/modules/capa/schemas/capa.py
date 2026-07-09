from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==================== CAPA EVALUATION SCHEMAS ====================
class CAPAEvaluationBase(BaseModel):
    content: str
    execution_date: Optional[str] = None
    executor: Optional[str] = None
    result: Optional[str] = None # Pass, Fail, Chưa đg
    notes: Optional[str] = None
    images: Optional[str] = None

class CAPAEvaluationCreate(CAPAEvaluationBase):
    pass

class CAPAEvaluation(CAPAEvaluationBase):
    id: int
    occurrence_id: int

    class Config:
        from_attributes = True

# ==================== CAPA OCCURRENCE SCHEMAS ====================
class CAPAOccurrenceBase(BaseModel):
    occurrence_number: int
    occurrence_date: Optional[str] = None
    container_code: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    issue_detail: Optional[str] = None
    inspector_name: Optional[str] = None
    status: Optional[str] = None
    main_cause: Optional[str] = None
    corrective_action: Optional[str] = None

class CAPAOccurrenceCreate(CAPAOccurrenceBase):
    pass

class CAPAOccurrenceUpdate(BaseModel):
    main_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    status: Optional[str] = None

class CAPAOccurrence(CAPAOccurrenceBase):
    id: int
    capa_id: int
    evaluations: List[CAPAEvaluation] = []

    class Config:
        from_attributes = True

# ==================== CAPA MASTER SCHEMAS ====================
class CAPABase(BaseModel):
    error_name: str
    description: Optional[str] = None
    severity: Optional[str] = None
    assigned_person: Optional[str] = None
    images: Optional[str] = None

class CAPACreate(CAPABase):
    pass

class CAPA(CAPABase):
    id: int
    created_at: datetime
    occurrences: List[CAPAOccurrence] = []

    class Config:
        from_attributes = True
