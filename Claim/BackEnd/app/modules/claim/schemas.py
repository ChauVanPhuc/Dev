# -*- coding: utf-8 -*-
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Union
import json

class CustomerClaimBase(BaseModel):
    claim_code: str
    customer_name: Optional[str] = None
    product_name: str
    order_code: Optional[str] = None
    company_error_code: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = "Medium"
    status: Optional[str] = "Received"
    lpn: Optional[str] = None
    container_no: Optional[str] = None
    action: Optional[str] = None
    period: Optional[str] = None
    image_paths: Optional[Union[str, list]] = None
    image_captions: Optional[Union[str, list]] = None

    @field_validator('image_paths', 'image_captions', mode='before')
    @classmethod
    def parse_json_string(cls, v):
        if isinstance(v, str) and v.strip():
            if v.strip() in ("", "[]"):
                return []
            try:
                return json.loads(v)
            except Exception:
                return []
        if v is None:
            return []
        return v

class CustomerClaimCreate(CustomerClaimBase):
    pass

class CustomerClaimUpdate(BaseModel):
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    order_code: Optional[str] = None
    company_error_code: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    lpn: Optional[str] = None
    container_no: Optional[str] = None
    action: Optional[str] = None
    period: Optional[str] = None
    image_paths: Optional[Union[str, list]] = None
    image_captions: Optional[Union[str, list]] = None
    resolved_at: Optional[datetime] = None

class CustomerClaimResponse(CustomerClaimBase):
    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    loai_hang: Optional[str] = None
    lpn_container_number: Optional[str] = None
    lpn_container_id: Optional[int] = None
    date_loading: Optional[str] = None
    date_loading_raw: Optional[str] = None

    class Config:
        from_attributes = True
