# -*- coding: utf-8 -*-
from datetime import date, datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field


# ==========================================
# UNIT OF MEASURE SCHEMAS
# ==========================================
class UnitOfMeasureBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    full_name: Optional[str] = ""
    precision: int = Field(0, ge=0, le=6)
    status: str = "ACTIVE"


class UnitOfMeasureCreate(UnitOfMeasureBase):
    pass


class UnitOfMeasureUpdate(BaseModel):
    code: Optional[str] = None
    full_name: Optional[str] = None
    precision: Optional[int] = Field(None, ge=0, le=6)
    status: Optional[str] = None


class UnitOfMeasureResponse(UnitOfMeasureBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UnitOfMeasureBatchImport(BaseModel):
    items: List[UnitOfMeasureCreate]


# ==========================================
# WAREHOUSE & MATERIALS SCHEMAS
# ==========================================
class WarehouseResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class WarehouseMaterialBase(BaseModel):
    warehouse_code: str
    warehouse_name: Optional[str] = None
    item_code: str
    item_name: str
    category: Optional[str] = "OTHER"
    unit_main: str = "Cái"
    unit_conversion: Optional[str] = None
    conversion_rate: float = 1.0
    opening_main: float = 0.0
    initial_receipt_date: Optional[date] = None
    image_url: Optional[str] = None


class WarehouseMaterialCreate(WarehouseMaterialBase):
    pass


class WarehouseMaterialResponse(WarehouseMaterialBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


# ==========================================
# GOODS RECEIPT SCHEMAS
# ==========================================
class GoodsReceiptItemSchema(BaseModel):
    id: Optional[int] = None
    line_id: Optional[int] = None
    line_no: int = 1
    item_code: Optional[str] = ""
    item_name: str
    image_url: Optional[str] = None
    image: Optional[str] = None
    unit1: Optional[str] = None
    unit: Optional[str] = None
    quantity1: Optional[float] = None
    quantity: Optional[float] = None
    quantity_main: Optional[float] = None
    unit2: Optional[str] = None
    quantity2: Optional[float] = 0.0
    conversion_rate: float = 1.0
    lsx: Optional[str] = None
    package_split: Optional[str] = None
    notes: Optional[str] = None


class GoodsReceiptCreate(BaseModel):
    voucher_no: Optional[str] = None
    warehouse_code: Optional[str] = None
    warehouse_name: str
    receipt_date: date
    deliverer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_name: Optional[str] = None
    department_name: Optional[str] = None
    content: Optional[str] = None
    receipt_type: Optional[str] = "Nhập mua hàng"
    status: str = "PENDING"
    ctgs: Optional[str] = None
    created_by: Optional[str] = None
    created_channel: Optional[str] = "Web"
    images: Optional[List[str]] = None
    items: List[GoodsReceiptItemSchema]


class GoodsReceiptUpdate(BaseModel):
    voucher_no: Optional[str] = None
    warehouse_code: Optional[str] = None
    warehouse_name: Optional[str] = None
    receipt_date: Optional[date] = None
    deliverer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_name: Optional[str] = None
    department_name: Optional[str] = None
    content: Optional[str] = None
    receipt_type: Optional[str] = None
    status: Optional[str] = None
    ctgs: Optional[str] = None
    created_channel: Optional[str] = None
    images: Optional[List[str]] = None
    items: Optional[List[GoodsReceiptItemSchema]] = None


class GoodsReceiptConfirmRequest(BaseModel):
    notes: Optional[str] = None
    images: Optional[List[str]] = None


class GoodsReceiptBatchDelete(BaseModel):
    ids: List[int]


# ==========================================
# GOODS ISSUE SCHEMAS
# ==========================================
class GoodsIssueItemSchema(BaseModel):
    id: Optional[int] = None
    line_id: Optional[int] = None
    line_no: int = 1
    item_code: str
    item_name: str
    image_url: Optional[str] = None
    image: Optional[str] = None
    unit1: Optional[str] = None
    unit: Optional[str] = None
    quantity1: Optional[float] = None
    quantity: Optional[float] = None
    quantity_main: Optional[float] = None
    unit2: Optional[str] = None
    quantity2: Optional[float] = 0.0
    conversion_rate: float = 1.0
    unit_price: Optional[float] = 0.0
    amount: Optional[float] = 0.0
    lsx: Optional[str] = None
    package_split: Optional[str] = None
    notes: Optional[str] = None


class GoodsIssueCreate(BaseModel):
    voucher_no: Optional[str] = None
    warehouse_code: Optional[str] = None
    warehouse_name: str
    issue_date: date
    deliverer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_name: Optional[str] = None
    department_name: Optional[str] = None
    factory_id: Optional[int] = None
    factory_name: Optional[str] = None
    content: Optional[str] = None
    issue_type: Optional[str] = "Xuất sản xuất"
    status: str = "PENDING"
    ctgs: Optional[str] = None
    created_by: Optional[str] = None
    created_channel: Optional[str] = "Web"
    receiver_name: Optional[str] = None
    images: Optional[List[str]] = None
    items: List[GoodsIssueItemSchema]


class GoodsIssueUpdate(BaseModel):
    voucher_no: Optional[str] = None
    warehouse_code: Optional[str] = None
    warehouse_name: Optional[str] = None
    issue_date: Optional[date] = None
    deliverer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_name: Optional[str] = None
    department_name: Optional[str] = None
    factory_id: Optional[int] = None
    factory_name: Optional[str] = None
    content: Optional[str] = None
    issue_type: Optional[str] = None
    status: Optional[str] = None
    ctgs: Optional[str] = None
    created_channel: Optional[str] = None
    receiver_name: Optional[str] = None
    images: Optional[List[str]] = None
    items: Optional[List[GoodsIssueItemSchema]] = None


class GoodsIssueConfirmRequest(BaseModel):
    receiver_name: Optional[str] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = None


class GoodsIssueBatchDelete(BaseModel):
    ids: List[int]


# ==========================================
# REJECTED GOODS SCHEMAS
# ==========================================
class RejectedGoodsCreate(BaseModel):
    voucher_no: Optional[str] = None
    created_date: Optional[date] = None
    source_type: str = "QC_INCOMING"
    origin_voucher_id: Optional[int] = None
    origin_voucher_no: Optional[str] = None
    origin_line_id: Optional[int] = None
    warehouse_code: Optional[str] = None
    warehouse_name: Optional[str] = None
    item_code: str
    item_name: str
    unit_main: Optional[str] = "Cái"
    unit_conversion: Optional[str] = None
    conversion_rate: float = 1.0
    quantity_main: float = Field(..., gt=0)
    quantity_conv: Optional[float] = None
    defect_category: Optional[str] = None
    defect_reason: Optional[str] = None
    resolution: str = "PENDING"
    status: str = "PENDING"
    created_by: Optional[str] = None
    created_channel: Optional[str] = "Web"
    department_name: Optional[str] = None
    factory_id: Optional[int] = None
    factory_name: Optional[str] = None
    return_mode: Optional[str] = "DEFECTIVE"
    returned_by: Optional[str] = None
    images: Optional[List[str]] = None


class RejectedGoodsUpdate(BaseModel):
    created_date: Optional[date] = None
    source_type: Optional[str] = None
    origin_voucher_no: Optional[str] = None
    warehouse_code: Optional[str] = None
    warehouse_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    quantity_main: Optional[float] = None
    defect_category: Optional[str] = None
    defect_reason: Optional[str] = None
    resolution: Optional[str] = None
    status: Optional[str] = None
    resolution_notes: Optional[str] = None
    department_name: Optional[str] = None
    factory_id: Optional[int] = None
    factory_name: Optional[str] = None
    return_mode: Optional[str] = None
    returned_by: Optional[str] = None
    images: Optional[List[str]] = None


class RejectedGoodsResolveRequest(BaseModel):
    resolution: str
    notes: Optional[str] = ""
    resolution_date: Optional[date] = None
    images: Optional[List[str]] = None


class RejectedGoodsCancelRequest(BaseModel):
    reason: Optional[str] = ""

