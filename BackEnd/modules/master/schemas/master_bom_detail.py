from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MasterBOMDetailBase(BaseModel):
    sku: Optional[str] = None
    name: str
    master_product_id: Optional[int] = None
    parent_id: Optional[int] = None
    length: Optional[float] = 0.0
    width: Optional[float] = 0.0
    height: Optional[float] = 0.0
    unit: Optional[str] = "Cái"
    specification: Optional[str] = None
    material: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[float] = 0.0
    waste_ratio: Optional[float] = 0.0
    is_raw_material: Optional[bool] = False
    exclude_production: Optional[bool] = False
    input_stage: Optional[str] = None
    output_stage: Optional[str] = None
    status: Optional[str] = "Active"
    quantity: Optional[float] = 1.0
    description: Optional[str] = None

class MasterBOMDetailCreate(MasterBOMDetailBase):
    children: List["MasterBOMDetailCreate"] = []

MasterBOMDetailCreate.model_rebuild()

class MasterBOMDetailUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[float] = None
    status: Optional[str] = None

class MasterBOMDetail(MasterBOMDetailBase):
    id: int
    created_at: Optional[datetime] = None
    children: List["MasterBOMDetail"] = []

    class Config:
        from_attributes = True

MasterBOMDetail.model_rebuild()
