from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship

from config.database import Base

class DeliveryDetails(Base):
    """
    Model đại diện cho bảng 'delivery_details' (Chi tiết bàn giao).
    Lưu trữ thông tin chi tiết về từng mặt hàng hoặc linh kiện được bàn giao trong một phiếu giao.
    """
    __tablename__ = "delivery_details"

    id = Column(Integer, primary_key=True, index=True)
    part_name = Column(NVARCHAR(50))      # Tên linh kiện/chi tiết bàn giao
    quantity = Column(Integer, default=0)    # Số lượng bàn giao thực tế
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True) # ID đơn hàng liên kết
    element_name = Column(NVARCHAR(100), nullable=True) # Tên bộ phận/Element

    # Liên kết với bảng Deliveries (Khóa ngoại)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    
    delivery = relationship("Delivery", back_populates="details")
    order = relationship("Order")

    @property
    def order_code(self):
        return self.order.order_code if self.order else "Dư"

    @property
    def partner_po(self):
        return self.order.partner_po if self.order else ""

    @property
    def production_code(self):
        return self.order.production_code if self.order else ""

    @property
    def customer(self):
        return self.order.customer if self.order else ""

    @property
    def product_names(self):
        if not self.order or not self.order.products:
            return ""
        return ", ".join([p.name for p in self.order.products])

