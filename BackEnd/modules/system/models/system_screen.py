from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class SystemScreen(Base):
    """
    Model dai dien cho bang 'system_screens' trong SQL Server.
    Quan ly ma man hinh va thong tin hien thi dong thoi cua Web va Mobile.
    """
    __tablename__ = "system_screens"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(NVARCHAR(20), nullable=False) # 'Web' hoac 'Mobile'
    route_path = Column(NVARCHAR(150), nullable=False) # Vi du: '/admin/users'
    default_code = Column(NVARCHAR(20), nullable=False) # Vi du: 'AD3'
    current_code = Column(NVARCHAR(20), nullable=False) # Vi du: 'AD3' (co the sua)
    title = Column(NVARCHAR(100), nullable=False) # Vi du: 'Quan ly nguoi dung'
    subtitle = Column(NVARCHAR(150), nullable=True) # Vi du: 'Danh sach nguoi dung'
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(NVARCHAR(50), default=u"Mới thiết kế", nullable=False)
    target_date = Column(NVARCHAR(20), nullable=True)
    mockup_path = Column(NVARCHAR(1000), nullable=True)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)

    # Relationships
    components = relationship("SystemComponent", back_populates="screen", cascade="all, delete-orphan")
    guides = relationship("SystemGuide", back_populates="screen", cascade="all, delete-orphan")
    bugs = relationship("ScreenBug", back_populates="screen", cascade="all, delete-orphan")

