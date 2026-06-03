from sqlalchemy import Column, Integer
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class CheckList(Base):
    """
    Model quản lý danh mục kiểm tra (CheckList).
    """
    __tablename__ = "checklists"

    id      = Column(Integer, primary_key=True, index=True)
    content = Column(NVARCHAR(500), nullable=False)
    status  = Column(NVARCHAR(50), nullable=True) # Hoàn thành, Chưa hoàn thành
