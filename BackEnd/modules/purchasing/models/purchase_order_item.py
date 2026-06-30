from sqlalchemy import Column, Integer, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time


class PurchaseOrderItem(Base):
    """
    Model đại diện cho bảng 'purchase_order_items' (Chi tiết đơn mua hàng theo mặt hàng).
    Lưu trữ thông tin chi tiết từng mặt hàng trong mỗi đơn mua.
    Quan hệ N:1 với PurchaseRequisition (đơn đặt mua).
    """
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    requisition_id = Column(Integer, ForeignKey("purchase_requisitions.id", ondelete="CASCADE"), index=True)

    # Thông tin PO header (lặp lại từ requisition, NULL ở detail rows trong Excel)
    po_date = Column(DateTime)  # Ngày PO
    po_code = Column(NVARCHAR(100), index=True)  # Mã PO
    supplier_code = Column(NVARCHAR(50))  # Mã NCC
    supplier_name = Column(NVARCHAR(255))  # Tên NCC

    # Thông tin mặt hàng
    item_code = Column(NVARCHAR(50), index=True)  # Mã mặt hàng
    item_name = Column(NVARCHAR(255))  # Tên mặt hàng
    order_code = Column(NVARCHAR(100))  # Mã đơn hàng liên kết (PO nội bộ)

    # Đơn vị tính
    unit = Column(NVARCHAR(50))  # ĐVT
    converted_unit = Column(NVARCHAR(50))  # ĐVCĐ (Đơn vị chuyển đổi)

    # Số lượng & Giá
    quantity = Column(Float, default=0)  # Số lượng
    converted_quantity = Column(Float, default=0)  # SL ĐVCĐ
    unit_price = Column(Float, default=0)  # Đơn giá
    converted_unit_price = Column(Float, default=0)  # ĐG ĐVCĐ
    currency = Column(NVARCHAR(10))  # Loại tiền

    # Tiền VND
    subtotal_vnd = Column(Float, default=0)  # Thành tiền VND
    tax_vnd = Column(Float, default=0)  # Thuế VND
    total_after_tax_vnd = Column(Float, default=0)  # Thành tiền sau thuế VND
    shipping_fee_vnd = Column(Float, default=0)  # Phí vận chuyển VND
    other_costs_vnd = Column(Float, default=0)  # Chi phí khác VND
    discount_vnd = Column(Float, default=0)  # Giảm giá VND
    grand_total_vnd = Column(Float, default=0)  # Tổng tiền VND

    # Tiền ngoại tệ
    subtotal_foreign = Column(Float, default=0)  # Thành tiền ngoại tệ
    tax_foreign = Column(Float, default=0)  # Thuế ngoại tệ
    total_after_tax_foreign = Column(Float, default=0)  # Thành tiền sau thuế NT
    shipping_fee_foreign = Column(Float, default=0)  # Phí vận chuyển NT
    other_costs_foreign = Column(Float, default=0)  # Chi phí khác NT
    discount_foreign = Column(Float, default=0)  # Giảm giá NT
    grand_total_foreign = Column(Float, default=0)  # Tổng tiền NT

    # Thông tin bổ sung
    requested_delivery_date = Column(DateTime)  # Ngày yêu cầu giao hàng
    content = Column(NVARCHAR(None))  # Nội dung (NVARCHAR(MAX))
    status = Column(NVARCHAR(50), index=True)  # Trạng thái (Đã duyệt, Đã kiểm tra, Chưa duyệt)
    manager = Column(NVARCHAR(100))  # Người quản lý
    creator = Column(NVARCHAR(100))  # Người tạo PO
    type = Column(NVARCHAR(50))  # Loại

    created_at = Column(DateTime, default=get_vietnam_time)  # Ngày tạo record

    # Quan hệ
    requisition = relationship("PurchaseRequisition", back_populates="items")

    __table_args__ = (
        Index('ix_poi_po_code_item_code', 'po_code', 'item_code'),
    )
