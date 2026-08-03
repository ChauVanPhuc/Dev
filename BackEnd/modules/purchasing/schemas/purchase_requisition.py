from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PurchaseRequisitionCreate(BaseModel):
    """Schema tạo mới Đơn hàng."""
    po_code: str
    creator: Optional[str] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    branch: Optional[str] = None
    inspector: Optional[str] = None
    inspection_date: Optional[datetime] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approver: Optional[str] = None
    approval_date: Optional[datetime] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = 0
    order_type: Optional[str] = None
    priority: Optional[str] = "Bình thường"
    material_type: Optional[str] = None
    est_completion_date: Optional[datetime] = None
    real_completion_date: Optional[datetime] = None
    status: Optional[str] = None
    processing_status: Optional[str] = None
    warehouse_status: Optional[str] = None
    note: Optional[str] = None
    items: Optional[List[dict]] = None


class PurchaseRequisitionUpdate(BaseModel):
    """Schema cập nhật Đơn hàng."""
    po_code: Optional[str] = None
    creator: Optional[str] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    branch: Optional[str] = None
    inspector: Optional[str] = None
    inspection_date: Optional[datetime] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approver: Optional[str] = None
    approval_date: Optional[datetime] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = None
    order_type: Optional[str] = None
    priority: Optional[str] = None
    material_type: Optional[str] = None
    est_completion_date: Optional[datetime] = None
    real_completion_date: Optional[datetime] = None
    status: Optional[str] = None
    processing_status: Optional[str] = None
    warehouse_status: Optional[str] = None
    note: Optional[str] = None
    items: Optional[List[dict]] = None


class PurchaseOrderItemInRequisition(BaseModel):
    """Schema hiển thị mặt hàng trong đơn hàng."""
    id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = 0
    unit_price: Optional[float] = 0
    subtotal_vnd: Optional[float] = 0
    tax_vnd: Optional[float] = 0
    grand_total_vnd: Optional[float] = 0
    status: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseRequisitionResponse(BaseModel):
    """Schema hiển thị Đơn hàng đầy đủ."""
    id: int
    po_code: str
    creator: Optional[str] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    branch: Optional[str] = None
    inspector: Optional[str] = None
    inspection_date: Optional[datetime] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approver: Optional[str] = None
    approval_date: Optional[datetime] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = 0
    order_type: Optional[str] = None
    priority: Optional[str] = None
    material_type: Optional[str] = None
    est_completion_date: Optional[datetime] = None
    real_completion_date: Optional[datetime] = None
    production_date: Optional[datetime] = None
    warehouse_in_date: Optional[datetime] = None
    storage_date: Optional[datetime] = None
    warehouse_out_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    status: Optional[str] = None
    processing_status: Optional[str] = None
    warehouse_status: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[PurchaseOrderItemInRequisition] = []

    class Config:
        from_attributes = True


class PurchaseRequisitionListResponse(BaseModel):
    """Schema hiển thị Đơn hàng rút gọn (cho danh sách)."""
    id: int
    po_code: str
    creator: Optional[str] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = 0
    order_type: Optional[str] = None
    priority: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approver: Optional[str] = None
    approval_date: Optional[datetime] = None
    est_completion_date: Optional[datetime] = None
    real_completion_date: Optional[datetime] = None
    status: Optional[str] = None
    processing_status: Optional[str] = None
    warehouse_status: Optional[str] = None
    inspector: Optional[str] = None
    item_count: Optional[int] = 0
    note: Optional[str] = None

    class Config:
        from_attributes = True
