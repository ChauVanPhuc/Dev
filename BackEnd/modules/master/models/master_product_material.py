from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class MasterProductMaterial(Base):
    """
    Model đại diện cho bảng 'master_product_materials' (Danh mục vật tư / nguyên liệu BOM).
    """
    __tablename__ = "master_product_materials"

    id = Column(Integer, primary_key=True, index=True)
    master_product_id = Column(Integer, ForeignKey("master_products.id"), nullable=True, index=True)
    product_sku = Column(NVARCHAR(100), nullable=True, index=True) # SKU sản phẩm áp dụng (độc lập)
    product_name = Column(NVARCHAR(255), nullable=True, index=True) # Tên sản phẩm áp dụng (độc lập)
    stt = Column(Integer, default=1) # Thứ tự sắp xếp trong nhóm
    group_type = Column(NVARCHAR(100), default="VẬT TƯ HÀNG TRẮNG") # Nhóm: VẬT TƯ HÀNG TRẮNG, VẬT TƯ SAU SƠN, VẬT TƯ PHỤ SƠN, VẬT TƯ ĐÓNG GÓI
    material_code = Column(NVARCHAR(50)) # Mã vật tư
    material_name = Column(NVARCHAR(255), nullable=False) # Tên vật tư
    color = Column(NVARCHAR(100)) # Màu sắc vật tư
    quota = Column(Float, default=1.0) # Định mức tiêu hao / Số lượng
    unit = Column(NVARCHAR(50), default="Cái") # Đơn vị tính
    supplier = Column(NVARCHAR(150)) # Nhà cung cấp
    note = Column(NVARCHAR(255)) # Ghi chú
    created_at = Column(DateTime, default=get_vietnam_time)

    master_product = relationship("MasterProduct", back_populates="materials")

