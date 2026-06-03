from sqlalchemy import Column, Integer, DateTime, Date
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class Equipment(Base):
    """
    Model quản lý Thiết bị (Máy móc).
    """
    __tablename__ = "equipments"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(NVARCHAR(255), nullable=False)
    code             = Column(NVARCHAR(100), nullable=False, unique=True)
    type             = Column(NVARCHAR(100), nullable=True)
    status           = Column(NVARCHAR(50), nullable=True) # Hoạt động, Bảo trì, v.v.
    purchase_date    = Column(Date, nullable=True)
    maintenance_cycle = Column(Integer, nullable=True) # Số ngày
