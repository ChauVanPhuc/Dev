# -*- coding: utf-8 -*-
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CabinetPriceBase(BaseModel):
    cabinet_code: str
    cabinet_name: str
    material: Optional[str] = None
    dimensions: Optional[str] = None
    base_price: float
    sale_price: float
    status: Optional[str] = "Active"

class CabinetPriceCreate(CabinetPriceBase):
    pass

class CabinetPriceUpdate(BaseModel):
    cabinet_name: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    base_price: Optional[float] = None
    sale_price: Optional[float] = None
    status: Optional[str] = None

class CabinetPriceResponse(CabinetPriceBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True
