from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class MasterProductMaterial(Base):
    """
    Model đại diện cho bảng 'master_product_materials' (Danh mục vật tư / nguyên liệu).
    """
    __tablename__ = "master_product_materials"

    id = Column(Integer, primary_key=True, index=True)
    master_product_id = Column(Integer, ForeignKey("master_products.id"), index=True)
    material_code = Column(NVARCHAR(50)) # Mã vật tư
    material_name = Column(NVARCHAR(255), nullable=False) # Tên vật tư
    quota = Column(Float, default=1.0) # Định mức tiêu hao
    unit = Column(NVARCHAR(50), default="Cái") # Đơn vị tính
    supplier = Column(NVARCHAR(150)) # Nhà cung cấp
    note = Column(NVARCHAR(255)) # Ghi chú
    created_at = Column(DateTime, default=get_vietnam_time)

    master_product = relationship("MasterProduct", back_populates="materials")
