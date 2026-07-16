# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class SystemGuide(Base):
    """
    Model đại diện cho bảng 'system_guides' trong SQL Server.
    Quản lý các bước hướng dẫn sử dụng/đặc tả luồng xử lý tương tác của mỗi màn hình.
    """
    __tablename__ = "system_guides"

    id = Column(Integer, primary_key=True, index=True)
    screen_id = Column(Integer, ForeignKey("system_screens.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False) # e.g. 1, 2, 3...
    title = Column(NVARCHAR(150), nullable=False) # e.g. "Chọn Đơn Hàng PO"
    related_components = Column(NVARCHAR(500), nullable=True) # comma-separated list of component names, e.g., "POSelector, StageInspectionForm"
    description = Column(NVARCHAR(None), nullable=True) # Detailed description (NVARCHAR(MAX) in SQL Server)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)

    # Relationships
    screen = relationship("SystemScreen", back_populates="guides")
