from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class Product(Base):
    """
    Model đại diện cho bảng 'products' (Sản phẩm thực tế).
    Lưu trữ thông tin chi tiết của từng sản phẩm được tạo ra từ đơn hàng.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(NVARCHAR(50), index=True) # Mã định danh sản phẩm (SKU)
    name = Column(NVARCHAR(255), nullable=False) # Tên sản phẩm
    order_id = Column(Integer, ForeignKey("orders.id")) # Liên kết với đơn hàng
    category_id = Column(Integer, ForeignKey("categories.id")) # Thuộc danh mục nào
    price = Column(Float, default=0.0)    # Giá bán
    material = Column(NVARCHAR(255))      # Chất liệu
    color = Column(NVARCHAR(100))         # Màu sắc
    length = Column(Float, default=0.0)   # Chiều dài
    width = Column(Float, default=0.0)    # Chiều rộng
    height = Column(Float, default=0.0)   # Chiều cao
    weight = Column(Float, default=0.0)   # Trọng lượng
    status = Column(NVARCHAR(50), default="Active") # Trạng thái sản xuất/kho
    quantity = Column(Float, default=0.0) # Số lượng thực tế
    
    order_qty = Column(Float, default=0.0) # S.lg đ.hàng
    production_qty = Column(Float, default=0.0) # Vào lệnh
    loss_qty = Column(Float, default=0.0) # Bù hao
    total_qty = Column(Float, default=0.0) # Tổng s.lg
    net_weight = Column(Float, default=0.0) # Tổng KL tinh
    
    total_foreign_currency = Column(Float, default=0.0) # T.tiền n.tệ
    total_vnd = Column(Float, default=0.0) # T.tiền VNĐ
    
    unit = Column(NVARCHAR(50), default="Bộ") # Đơn vị tính
    specification = Column(NVARCHAR(255)) # Quy cách
    description = Column(NVARCHAR(500))   # Mô tả chi tiết
    created_at = Column(DateTime, default=get_vietnam_time) # Thời gian khởi tạo

    # Các quan hệ liên kết
    category = relationship("Category", back_populates="products")
    order = relationship("Order", back_populates="products")
    bom_details = relationship("BOMDetail", back_populates="product", cascade="all, delete-orphan")

    @property
    def factory(self):
        if self.description and any(fac in self.description for fac in ['NM1', 'NM2', 'NM3', 'Vanity 1', 'Vanity 2', 'Furniture']):
            for fac in ['NM1', 'NM2', 'NM3']:
                if fac in self.description:
                    return fac
            if 'Vanity 1' in self.description: return 'NM1'
            if 'Vanity 2' in self.description: return 'NM2'
            if 'Furniture' in self.description: return 'NM3'
            return self.description
        if self.bom_details:
            for b in self.bom_details:
                for stg in [b.input_stage, b.output_stage]:
                    if stg and 'NM' in stg:
                        for fac in ['NM1', 'NM2', 'NM3']:
                            if fac in stg:
                                return fac
        return None

