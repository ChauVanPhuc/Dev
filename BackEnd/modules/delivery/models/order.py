from sqlalchemy import Column, Integer, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class Order(Base):
    """
    Model đại diện cho bảng 'orders' (Đơn hàng).
    Lưu trữ thông tin khách hàng và các mốc thời gian của đơn hàng.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(NVARCHAR(50), index=True, nullable=False) # Mã đơn hàng
    production_code = Column(NVARCHAR(50), index=True) # Lệnh SX
    partner_po = Column(NVARCHAR(100)) # Số PO đối tác
    customer_code = Column(NVARCHAR(100)) # Mã KH
    customer = Column(NVARCHAR(255)) # Tên khách hàng
    
    account_id = Column(Integer)     # ID tài khoản tạo đơn
    create_date = Column(DateTime, default=get_vietnam_time) # Ngày tạo
    
    voucher_date = Column(DateTime) # Ngày chứng từ
    delivery_date = Column(DateTime) # Ngày giao
    start_date = Column(DateTime) # Bắt đầu
    end_white_date = Column(DateTime) # K.thúc h.trắng
    finished_date = Column(DateTime)  # K.thúc (Ngày thực tế hoàn thành)
    estimated_date = Column(DateTime) # Ngày dự kiến hoàn thành
    
    order_status = Column(Integer, default=0) # Trạng thái đơn hàng
    note = Column(NVARCHAR(None)) # Ghi chú chi tiết (NVARCHAR(MAX))
    
    plan_id = Column(Integer, ForeignKey("product_plans.id")) # Liên kết KHSX
    product_id = Column(Integer)  # ID sản phẩm liên quan
    is_priority = Column(Integer, default=0) # 1: Ưu tiên, 0: Bình thường
    priority_score = Column(Integer, default=0) # Điểm ưu tiên để sắp xếp

    # Thêm ràng buộc duy nhất kết hợp
    __table_args__ = (
        UniqueConstraint('order_code', 'plan_id', name='ix_orders_order_code_plan'),
    )

    # Các quan hệ liên kết
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="order", cascade="all, delete-orphan")
    product_plan = relationship("ProductPlan", back_populates="orders")
