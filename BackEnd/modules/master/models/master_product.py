from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class MasterProduct(Base):
    """
    Model đại diện cho bảng 'master_products' (Sản phẩm mẫu / BOM Master).
    Dùng làm thiết kế khuôn mẫu để tự động phân rã ra các sản phẩm thực tế khi có đơn hàng.
    """
    __tablename__ = "master_products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(NVARCHAR(50), unique=True, index=True) # Mã định danh mẫu
    name = Column(NVARCHAR(255), nullable=False)       # Tên sản phẩm mẫu
    category_id = Column(Integer, ForeignKey("master_categories.id")) # Thuộc danh mục mẫu nào
    price = Column(Float, default=0.0)    # Giá dự kiến
    material = Column(NVARCHAR(255))      # Chất liệu chính
    color = Column(NVARCHAR(100))         # Màu sắc quy chuẩn
    length = Column(Float, default=0.0)   # Chiều dài
    width = Column(Float, default=0.0)    # Chiều rộng
    height = Column(Float, default=0.0)   # Chiều cao
    weight = Column(Float, default=0.0)   # Trọng lượng
    status = Column(NVARCHAR(50), default="Active") # Trạng thái (Hoạt động, Ngừng kinh doanh...)
    quantity = Column(Float, default=1.0) # Định mức mặc định
    unit = Column(NVARCHAR(50), default="Bộ") # Đơn vị tính
    specification = Column(NVARCHAR(255)) # Quy cách
    description = Column(NVARCHAR(500))   # Mô tả kỹ thuật tổng quát
    created_at = Column(DateTime, default=get_vietnam_time) # Thời gian tạo

    # Các quan hệ liên kết trong cấu trúc BOM
    master_category = relationship("MasterCategory", back_populates="master_products")
    master_bom_details = relationship("MasterBOMDetail", back_populates="master_product", cascade="all, delete-orphan")
