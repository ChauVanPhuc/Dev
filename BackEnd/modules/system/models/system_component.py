from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class SystemComponent(Base):
    """
    Model dai dien cho bang 'system_components' trong database.
    Luu tru danh sach cac components, endpoints, hooks cua moi man hinh.
    """
    __tablename__ = "system_components"

    id = Column(Integer, primary_key=True, index=True)
    screen_id = Column(Integer, ForeignKey("system_screens.id", ondelete="CASCADE"), nullable=False)
    name = Column(NVARCHAR(150), nullable=False)
    type = Column(NVARCHAR(50), nullable=False, default="UI Component") # 'UI Component', 'Business Logic', 'Native API', 'API Endpoint'
    description = Column(NVARCHAR(500), nullable=True)
    technical_details = Column(NVARCHAR(1000), nullable=True)
    file_path = Column(NVARCHAR(250), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)

    # Relationships
    screen = relationship("SystemScreen", back_populates="components")
