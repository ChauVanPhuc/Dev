# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base


class InspectionGuide(Base):
    """
    Hướng dẫn kiểm tra: master gồm nhiều bước lớn, mỗi bước có tối đa 10 ảnh.
    """
    __tablename__ = "inspection_guides"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    name = Column(NVARCHAR(250), nullable=False)
    description = Column(NVARCHAR(1000), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    steps = relationship(
        "InspectionGuideStep",
        back_populates="guide",
        cascade="all, delete-orphan",
        order_by="InspectionGuideStep.step_no",
        lazy="selectin"
    )
    assignments = relationship(
        "InspectionGuideAssignment",
        back_populates="guide",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class InspectionGuideStep(Base):
    """
    Bước lớn trong hướng dẫn.
    """
    __tablename__ = "inspection_guide_steps"
    __table_args__ = (
        UniqueConstraint('guide_id', 'step_no', name='uq_inspection_guide_step_no'),
    )

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("inspection_guides.id", ondelete="CASCADE"), nullable=False, index=True)
    step_no = Column(Integer, nullable=False)
    title = Column(NVARCHAR(250), nullable=False)
    content = Column(NVARCHAR(4000), nullable=True)

    guide = relationship("InspectionGuide", back_populates="steps")
    sub_steps = relationship(
        "InspectionGuideSubStep",
        back_populates="step",
        cascade="all, delete-orphan",
        order_by="InspectionGuideSubStep.sub_step_no",
        lazy="selectin"
    )
    images = relationship(
        "InspectionGuideStepImage",
        back_populates="step",
        cascade="all, delete-orphan",
        order_by="InspectionGuideStepImage.display_order",
        lazy="selectin"
    )


class InspectionGuideSubStep(Base):
    """
    Bước nhỏ trong bước lớn (Tiêu chí chi tiết hoặc Phân nhánh trường hợp).
    """
    __tablename__ = "inspection_guide_sub_steps"
    __table_args__ = (
        UniqueConstraint('step_id', 'sub_step_no', name='uq_inspection_guide_sub_step_no'),
    )

    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("inspection_guide_steps.id", ondelete="CASCADE"), nullable=False, index=True)
    sub_step_no = Column(Integer, nullable=False)
    title = Column(NVARCHAR(250), nullable=True)
    content = Column(NVARCHAR(4000), nullable=True)

    step = relationship("InspectionGuideStep", back_populates="sub_steps")


class InspectionGuideStepImage(Base):
    """
    Ảnh thuộc về bước lớn, lưu chung trong thư mục của Guide.
    """
    __tablename__ = "inspection_guide_step_images"

    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("inspection_guide_steps.id", ondelete="CASCADE"), nullable=False, index=True)
    guide_id = Column(Integer, nullable=False, index=True)
    file_name = Column(NVARCHAR(255), nullable=False)
    image_url = Column(NVARCHAR(500), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    step = relationship("InspectionGuideStep", back_populates="images")


class InspectionGuideAssignment(Base):
    """
    Gán hướng dẫn cho loại phiếu kiểm tra (và tùy chọn theo product/category/stage).
    """
    __tablename__ = "inspection_guide_assignments"

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("inspection_guides.id", ondelete="CASCADE"), nullable=False, index=True)
    inspection_type = Column(NVARCHAR(50), nullable=False)
    product_id = Column(Integer, nullable=True)
    category_id = Column(Integer, nullable=True)
    stage_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    guide = relationship("InspectionGuide", back_populates="assignments")
