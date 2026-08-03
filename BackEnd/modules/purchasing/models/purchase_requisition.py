from sqlalchemy import Column, Integer, DateTime, Float, Index
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time


class PurchaseRequisition(Base):
    """
    Model đại diện cho bảng 'purchase_requisitions' (Đơn đặt mua).
    Lưu trữ thông tin tổng hợp cấp đơn đặt mua từ hệ thống ERP.
    Quan hệ 1:N với PurchaseOrderItem (chi tiết mặt hàng).
    """
    __tablename__ = "purchase_requisitions"

    id = Column(Integer, primary_key=True, index=True)
    po_code = Column(NVARCHAR(100), unique=True, index=True, nullable=False)  # Mã đơn mua
    creator = Column(NVARCHAR(100))  # Người tạo
    order_date = Column(DateTime)  # Ngày đặt hàng
    delivery_date = Column(DateTime)  # Ngày giao hàng
    branch = Column(NVARCHAR(100))  # Chi nhánh

    inspector = Column(NVARCHAR(100))  # Người kiểm tra
    inspection_date = Column(DateTime)  # Ngày kiểm tra
    approver = Column(NVARCHAR(100))  # Người duyệt
    approval_date = Column(DateTime)  # Ngày duyệt

    supplier_code = Column(NVARCHAR(50), index=True)  # Mã nhà cung cấp
    supplier_name = Column(NVARCHAR(255))  # Tên nhà cung cấp
    total_amount = Column(Float, default=0)  # Tổng tiền

    order_type = Column(NVARCHAR(50))  # Loại đơn hàng (Đơn mua hàng, Đơn bán hàng, Đơn mua lẻ)
    priority = Column(NVARCHAR(50), default="Bình thường")  # Mức độ ưu tiên (Cao, Bình thường, Thấp)
    reviewer = Column(NVARCHAR(100))  # Người xem xét
    reviewed_at = Column(DateTime)  # Ngày xem xét
    material_type = Column(NVARCHAR(100))  # Loại vật tư (Gỗ & Phụ kiện, ...)
    est_completion_date = Column(DateTime)  # Ngày hoàn thành dự kiến
    real_completion_date = Column(DateTime)  # Ngày hoàn thành thực tế

    # Mốc thời gian vận chuyển / tiến độ đơn hàng
    production_date = Column(DateTime)  # Ngày bắt đầu/hoàn thành sản xuất
    warehouse_in_date = Column(DateTime)  # Ngày nhập kho
    storage_date = Column(DateTime)  # Ngày lưu kho
    warehouse_out_date = Column(DateTime)  # Ngày xuất kho
    completed_date = Column(DateTime)  # Ngày hoàn thành giao nhận

    status = Column(NVARCHAR(50), index=True)  # Trạng thái (Duyệt thành công, K.tra thành công, Nháp, Đã hoàn thành, Đang sản xuất, Chưa duyệt, Đã xuất kho...)
    processing_status = Column(NVARCHAR(50))  # Tình trạng xử lý
    warehouse_status = Column(NVARCHAR(50), index=True)  # Tình trạng nhập kho (Đã nhập kho, Chưa nhập kho, Nhập chưa hết)
    note = Column(NVARCHAR(None))  # Ghi chú (NVARCHAR(MAX))

    created_at = Column(DateTime, default=get_vietnam_time)  # Ngày tạo record trong hệ thống

    # Quan hệ với chi tiết mặt hàng
    items = relationship("PurchaseOrderItem", back_populates="requisition", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_purchase_requisitions_status_warehouse', 'status', 'warehouse_status'),
    )
