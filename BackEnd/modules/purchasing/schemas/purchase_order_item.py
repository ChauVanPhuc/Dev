from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PurchaseOrderItemCreate(BaseModel):
    """Schema tạo mới chi tiết mặt hàng trong đơn mua."""
    requisition_id: Optional[int] = None
    po_date: Optional[datetime] = None
    po_code: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    order_code: Optional[str] = None
    unit: Optional[str] = None
    converted_unit: Optional[str] = None
    quantity: Optional[float] = 0
    converted_quantity: Optional[float] = 0
    unit_price: Optional[float] = 0
    converted_unit_price: Optional[float] = 0
    currency: Optional[str] = None
    subtotal_vnd: Optional[float] = 0
    tax_vnd: Optional[float] = 0
    total_after_tax_vnd: Optional[float] = 0
    shipping_fee_vnd: Optional[float] = 0
    other_costs_vnd: Optional[float] = 0
    discount_vnd: Optional[float] = 0
    grand_total_vnd: Optional[float] = 0
    subtotal_foreign: Optional[float] = 0
    tax_foreign: Optional[float] = 0
    total_after_tax_foreign: Optional[float] = 0
    shipping_fee_foreign: Optional[float] = 0
    other_costs_foreign: Optional[float] = 0
    discount_foreign: Optional[float] = 0
    grand_total_foreign: Optional[float] = 0
    requested_delivery_date: Optional[datetime] = None
    content: Optional[str] = None
    status: Optional[str] = None
    manager: Optional[str] = None
    creator: Optional[str] = None
    type: Optional[str] = None


class PurchaseOrderItemUpdate(BaseModel):
    """Schema cập nhật chi tiết mặt hàng."""
    requisition_id: Optional[int] = None
    po_date: Optional[datetime] = None
    po_code: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    order_code: Optional[str] = None
    unit: Optional[str] = None
    converted_unit: Optional[str] = None
    quantity: Optional[float] = None
    converted_quantity: Optional[float] = None
    unit_price: Optional[float] = None
    converted_unit_price: Optional[float] = None
    currency: Optional[str] = None
    subtotal_vnd: Optional[float] = None
    tax_vnd: Optional[float] = None
    total_after_tax_vnd: Optional[float] = None
    shipping_fee_vnd: Optional[float] = None
    other_costs_vnd: Optional[float] = None
    discount_vnd: Optional[float] = None
    grand_total_vnd: Optional[float] = None
    subtotal_foreign: Optional[float] = None
    tax_foreign: Optional[float] = None
    total_after_tax_foreign: Optional[float] = None
    shipping_fee_foreign: Optional[float] = None
    other_costs_foreign: Optional[float] = None
    discount_foreign: Optional[float] = None
    grand_total_foreign: Optional[float] = None
    requested_delivery_date: Optional[datetime] = None
    content: Optional[str] = None
    status: Optional[str] = None
    manager: Optional[str] = None
    creator: Optional[str] = None
    type: Optional[str] = None


class PurchaseOrderItemResponse(BaseModel):
    """Schema hiển thị chi tiết mặt hàng đầy đủ."""
    id: int
    requisition_id: Optional[int] = None
    po_date: Optional[datetime] = None
    po_code: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    order_code: Optional[str] = None
    unit: Optional[str] = None
    converted_unit: Optional[str] = None
    quantity: Optional[float] = 0
    converted_quantity: Optional[float] = 0
    unit_price: Optional[float] = 0
    converted_unit_price: Optional[float] = 0
    currency: Optional[str] = None
    subtotal_vnd: Optional[float] = 0
    tax_vnd: Optional[float] = 0
    total_after_tax_vnd: Optional[float] = 0
    shipping_fee_vnd: Optional[float] = 0
    other_costs_vnd: Optional[float] = 0
    discount_vnd: Optional[float] = 0
    grand_total_vnd: Optional[float] = 0
    subtotal_foreign: Optional[float] = 0
    tax_foreign: Optional[float] = 0
    total_after_tax_foreign: Optional[float] = 0
    shipping_fee_foreign: Optional[float] = 0
    other_costs_foreign: Optional[float] = 0
    discount_foreign: Optional[float] = 0
    grand_total_foreign: Optional[float] = 0
    requested_delivery_date: Optional[datetime] = None
    content: Optional[str] = None
    status: Optional[str] = None
    manager: Optional[str] = None
    creator: Optional[str] = None
    type: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PurchaseOrderItemListResponse(BaseModel):
    """Schema hiển thị chi tiết mặt hàng rút gọn (cho danh sách)."""
    id: int
    requisition_id: Optional[int] = None
    po_date: Optional[datetime] = None
    po_code: Optional[str] = None
    supplier_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = 0
    unit_price: Optional[float] = 0
    subtotal_vnd: Optional[float] = 0
    tax_vnd: Optional[float] = 0
    grand_total_vnd: Optional[float] = 0
    status: Optional[str] = None
    requested_delivery_date: Optional[datetime] = None
    creator: Optional[str] = None

    class Config:
        from_attributes = True
