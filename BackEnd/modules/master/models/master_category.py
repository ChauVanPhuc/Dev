from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class MasterCategory(Base):
    """
    Model danh mục dành cho hệ thống BOM Master.
    Dùng để quản lý các nhóm sản phẩm mẫu trong catalog.
    """
    __tablename__ = "master_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(100), nullable=False, unique=True) # Tên danh mục mẫu
    description = Column(NVARCHAR(255)) # Mô tả danh mục
    main_category = Column(NVARCHAR(50)) # Dòng hàng chính (Vanity hoặc Furniture)
    status = Column(Integer, default=1)   # Trạng thái (1: Active, 0: Inactive)
    created_at = Column(DateTime, default=get_vietnam_time) # Ngày tạo

    # Danh sách các sản phẩm mẫu thuộc danh mục này
    master_products = relationship("MasterProduct", back_populates="master_category")
