from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductBase(BaseModel):
    sku: Optional[str] = None
    name: str
    unit: Optional[str] = None
    specification: Optional[str] = None
    length: Optional[float] = 0.0
    width: Optional[float] = 0.0
    height: Optional[float] = 0.0
    order_qty: Optional[float] = 0.0
    production_qty: Optional[float] = 0.0
    loss_qty: Optional[float] = 0.0
    total_qty: Optional[float] = 0.0
    net_weight: Optional[float] = 0.0
    unit_price: Optional[float] = 0.0
    total_foreign_currency: Optional[float] = 0.0
    total_vnd: Optional[float] = 0.0

class ProductOut(ProductBase):
    id: int
    order_id: int

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_code: str
    production_code: Optional[str] = None
    partner_po: Optional[str] = None
    customer_code: Optional[str] = None
    customer: Optional[str] = None
    voucher_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_white_date: Optional[datetime] = None
    finished_date: Optional[datetime] = None
    estimated_date: Optional[datetime] = None
    order_status: Optional[int] = 0
    note: Optional[str] = None

class OrderOut(OrderBase):
    id: int
    plan_id: Optional[int] = None
    products: List[ProductOut] = []

    class Config:
        from_attributes = True

class ProductPlanBase(BaseModel):
    code: Optional[str] = None
    name: str
    month: Optional[int] = None
    year: Optional[int] = None
    estimated_date: Optional[datetime] = None
    finished_date: Optional[datetime] = None
    status: Optional[int] = 0

class ProductPlanCreate(ProductPlanBase):
    pass

class ProductPlanUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[int] = None
    estimated_date: Optional[datetime] = None
    finished_date: Optional[datetime] = None

class ProductPlan(ProductPlanBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    estimated_date: Optional[datetime] = None
    finished_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProductPlanDetailOut(ProductPlan):
    orders: List[OrderOut] = []
