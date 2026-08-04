from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class ProductionTeam(Base):
    """
    Model đại diện cho bảng 'production_teams' (Danh sách Tổ sản xuất).
    """
    __tablename__ = "production_teams"

    id = Column(Integer, primary_key=True, index=True)
    team_code = Column(NVARCHAR(50), nullable=False, unique=True, index=True)
    team_name = Column(NVARCHAR(100), nullable=False)
    factory = Column(NVARCHAR(100), nullable=False, index=True)
    members_count = Column(Integer, default=10)
    description = Column(NVARCHAR(500), nullable=True)
    color = Column(NVARCHAR(20), default='#2D1A12')
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    nodes = relationship("ProductionRoutingNode", back_populates="team", cascade="all, delete-orphan")
