from sqlalchemy import Column, Integer
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class Category(Base):
    """
    Model đại diện cho bảng 'categories' (Danh mục sản phẩm).
    Dùng để phân loại các sản phẩm trong hệ thống.
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(100), nullable=False, unique=True) # Tên danh mục
    description = Column(NVARCHAR(255)) # Mô tả chi tiết

    # Quan hệ một-nhiều với bảng Product
    products = relationship("Product", back_populates="category")
