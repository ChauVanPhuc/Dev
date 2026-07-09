from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class MasterBOMDetail(Base):
    """
    Model đại diện cho bảng 'master_bom_details' (Chi tiết BOM mẫu).
    Cấu trúc đệ quy (parent_id) cho phép tạo BOM nhiều cấp.
    """
    __tablename__ = "master_bom_details"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(NVARCHAR(50), index=True) # Mã định danh
    name = Column(NVARCHAR(255), nullable=False) # Tên chi tiết/vật tư
    master_product_id = Column(Integer, ForeignKey("master_products.id")) # Liên kết Sản phẩm mẫu
    parent_id = Column(Integer, ForeignKey("master_bom_details.id"), nullable=True) # ID của BOM cha (nếu có)
    
    length = Column(Float, default=0.0)
    width = Column(Float, default=0.0)
    height = Column(Float, default=0.0)
    
    unit = Column(NVARCHAR(50), default="Cái") # Đơn vị tính
    specification = Column(NVARCHAR(255))      # Quy cách
    material = Column(NVARCHAR(255))           # Chất liệu
    color = Column(NVARCHAR(100))              # Màu sắc
    weight = Column(Float, default=0.0)        # Trọng lượng
    
    waste_ratio = Column(Float, default=0.0)   # Tỷ lệ hao hụt (%)
    is_raw_material = Column(Boolean, default=False) # Là vật tư thô/mua ngoài
    exclude_production = Column(Boolean, default=False) # Loại trừ khỏi lệnh sản xuất
    
    input_stage = Column(NVARCHAR(50), nullable=True)  # Công đoạn vào
    output_stage = Column(NVARCHAR(50), nullable=True) # Công đoạn ra
    status = Column(NVARCHAR(50), default="Active")
    quantity = Column(Float, default=1.0) # Định mức số lượng
    description = Column(NVARCHAR(500))
    created_at = Column(DateTime, default=get_vietnam_time)

    # Quan hệ liên kết
    master_product = relationship("MasterProduct", back_populates="master_bom_details")
    
    # Quan hệ đệ quy: Một chi tiết có thể có nhiều chi tiết con
    children = relationship(
        "MasterBOMDetail",
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    parent = relationship("MasterBOMDetail", back_populates="children", remote_side=[id])
