from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PalletCardBase(BaseModel):
    pallet_code: str
    khsx_code: Optional[str] = None
    po_code: Optional[str] = None
    customer_name: Optional[str] = None
    product_code: Optional[str] = None
    detail_name: Optional[str] = None
    specification: Optional[str] = None
    quantity_plan: Optional[int] = 0
    quantity_actual: Optional[int] = 0
    wood_standard: Optional[str] = None
    wood_supplier: Optional[str] = None
    sheet_data: Optional[str] = None # JSON string

class PalletCardCreate(PalletCardBase):
    pass

class PalletCardUpdate(PalletCardBase):
    pallet_code: Optional[str] = None

class PalletCard(PalletCardBase):
    id: int
    created_at: datetime
    updated_at: datetime
    status: int
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class PalletCardListResponse(BaseModel):
    items: List[PalletCard]
    total: int
