from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class BOMDetail(Base):
    """
    Model đại diện cho bảng 'bom_details' (Chi tiết BOM của sản phẩm thực tế).
    """
    __tablename__ = "bom_details"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(NVARCHAR(50), index=True) 
    name = Column(NVARCHAR(255), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id")) 
    parent_id = Column(Integer, ForeignKey("bom_details.id"), nullable=True) 
    
    length = Column(Float, default=0.0)
    width = Column(Float, default=0.0)
    height = Column(Float, default=0.0)
    
    unit = Column(NVARCHAR(50), default="Cái")
    specification = Column(NVARCHAR(255))
    material = Column(NVARCHAR(255))
    color = Column(NVARCHAR(100))
    weight = Column(Float, default=0.0)
    
    waste_ratio = Column(Float, default=0.0)
    is_raw_material = Column(Boolean, default=False)
    exclude_production = Column(Boolean, default=False)
    
    input_stage = Column(NVARCHAR(50), nullable=True)
    output_stage = Column(NVARCHAR(50), nullable=True)
    status = Column(NVARCHAR(50), default="Active")
    quantity = Column(Float, default=0.0) # Số lượng thực tế
    description = Column(NVARCHAR(500))
    created_at = Column(DateTime, default=get_vietnam_time)

    # Quan hệ liên kết
    product = relationship("Product", back_populates="bom_details")
    
    children = relationship(
        "BOMDetail",
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    parent = relationship("BOMDetail", back_populates="children", remote_side=[id])
