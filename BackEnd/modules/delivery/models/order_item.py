"""
Model đại diện cho bảng 'order_items' (Hạng mục đơn hàng).
Mỗi đơn hàng có thể bao gồm nhiều sản phẩm mẫu (MasterProduct) với số lượng khác nhau.
"""
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from config.database import Base


class OrderItem(Base):
    """
    Model chi tiết từng mặt hàng trong một đơn hàng.
    Kết nối Đơn hàng (Order) với Sản phẩm mẫu (MasterProduct).
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False) # ID đơn hàng cha
    master_product_id = Column(Integer, ForeignKey("master_products.id"), nullable=False) # ID sản phẩm mẫu
    quantity = Column(Integer, default=1, nullable=False) # Số lượng đặt hàng

    # Quan hệ liên kết
    order = relationship("Order", back_populates="items")
    master_product = relationship("MasterProduct")
