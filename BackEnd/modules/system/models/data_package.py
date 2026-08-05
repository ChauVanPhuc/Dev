from sqlalchemy import Column, Integer, DateTime, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class DataPackage(Base):
    """
    Model đại diện cho bảng 'data_packages'.
    Quản lý các gói dữ liệu đóng gói và đồng bộ QR code với server biên.
    """
    __tablename__ = "data_packages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(100), unique=True, index=True, nullable=False)
    product_name = Column(NVARCHAR(250), nullable=True)
    qr_start = Column(NVARCHAR(100), nullable=True)
    qr_end = Column(NVARCHAR(100), nullable=True)
    quantity = Column(Integer, default=100, nullable=False)
    status = Column(NVARCHAR(50), default="Pending", nullable=False) # 'Synced', 'Pending', 'Error'
    creator = Column(NVARCHAR(150), nullable=True)
    sync_error_msg = Column(NVARCHAR(500), nullable=True)
    notes = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)
