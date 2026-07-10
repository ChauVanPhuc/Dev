# -*- coding: utf-8 -*-
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Union
import json

# --- CUSTOMER CLAIM SCHEMAS ---
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
    image_paths: Optional[Union[str, list]] = None # Union because it might be sent as list or stored as string
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
    id: int # Changed to int only since we won't have JSON IDs (strings)
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- CABINET PRICE SCHEMAS ---
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


# --- CONTAINER SHIPMENT SCHEMAS ---
class ContainerShipmentBase(BaseModel):
    shipment_code: str
    container_number: str
    seal_number: Optional[str] = None
    destination_port: str
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    status: Optional[str] = "Draft"
    total_value: Optional[float] = 0.0

class ContainerShipmentCreate(ContainerShipmentBase):
    pass

class ContainerShipmentUpdate(BaseModel):
    container_number: Optional[str] = None
    seal_number: Optional[str] = None
    destination_port: Optional[str] = None
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    status: Optional[str] = None
    total_value: Optional[float] = None

class ContainerShipmentResponse(ContainerShipmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ClaimDefect schemas removed - using ClientDefect from inspection module instead
