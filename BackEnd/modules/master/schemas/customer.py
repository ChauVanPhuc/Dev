from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    code: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = 1

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = None

class CustomerResponse(CustomerBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
