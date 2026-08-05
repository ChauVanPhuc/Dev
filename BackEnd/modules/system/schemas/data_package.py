from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DataPackageCreate(BaseModel):
    product_name: Optional[str] = "Carton 5 lớp chuẩn"
    quantity: int = 100
    notes: Optional[str] = None
    creator: Optional[str] = "Quản trị hệ thống"

class DataPackageUpdate(BaseModel):
    status: Optional[str] = None
    sync_error_msg: Optional[str] = None
    notes: Optional[str] = None

class DataPackageResponse(BaseModel):
    id: int
    code: str
    product_name: Optional[str] = None
    qr_start: Optional[str] = None
    qr_end: Optional[str] = None
    quantity: int
    status: str
    creator: Optional[str] = None
    sync_error_msg: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
