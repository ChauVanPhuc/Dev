# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base


class InspectionParameter(Base):
    """
    Master data: Danh sách thông số kiểm tra (Độ ẩm, Nhiệt độ, Ánh sáng...).
    Người dùng có thể tự thêm/sửa/xóa.
    """
    __tablename__ = "inspection_parameters"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    name = Column(NVARCHAR(100), nullable=False)
    unit = Column(NVARCHAR(30), nullable=True)
    default_min = Column(Float, nullable=True)
    default_max = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    guide_links = relationship(
        "InspectionGuideParameter",
        back_populates="parameter",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class InspectionGuideParameter(Base):
    """
    Bảng liên kết: Hướng dẫn kiểm tra ↔ Thông số đo.
    Chỉ áp dụng cho hướng dẫn có loại phiếu 'Kiểm tra thông số' (parameter).
    """
    __tablename__ = "inspection_guide_parameters"
    __table_args__ = (
        UniqueConstraint('guide_id', 'parameter_id', name='uq_guide_parameter'),
    )

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("inspection_guides.id", ondelete="CASCADE"), nullable=False, index=True)
    parameter_id = Column(Integer, ForeignKey("inspection_parameters.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    guide = relationship("InspectionGuide", back_populates="guide_parameters")
    parameter = relationship("InspectionParameter", back_populates="guide_links")
