from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class CAPABase(BaseModel):
    code: Optional[str] = None
    created_at_time: Optional[str] = None
    creator_name: Optional[str] = None
    handler_name: Optional[str] = None
    urgency: Optional[str] = "Bình thường"
    scope: Optional[str] = "Sản phẩm lỗi"
    issue_description: Optional[str] = None
    images: Optional[str] = "[]"
    evaluator_name: Optional[str] = None
    evaluation_time: Optional[str] = None
    ticket_status: Optional[str] = "Vừa tạo"
    tab_status: Optional[str] = "tracking"
    causes_json: Optional[str] = "[]"
    corrective_actions_json: Optional[str] = "[]"
    preventive_plans_json: Optional[str] = "[]"
    evaluations_json: Optional[str] = "[]"

class CAPACreate(CAPABase):
    pass

class CAPAUpdate(CAPABase):
    pass

class CAPAResponse(CAPABase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
