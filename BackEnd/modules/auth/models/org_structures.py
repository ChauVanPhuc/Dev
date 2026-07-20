# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from modules.auth.models.employees import Employee

class OrgStructure(Base):
    """
    Model quản lý Sơ đồ tổ chức (Màn hình CL01)
    """
    __tablename__ = "org_structures"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(NVARCHAR(250), nullable=False) # Tên sơ đồ
    level       = Column(Integer, nullable=False, default=1) # Cấp hiện tại (1, 2, 3...)
    parent_id   = Column(Integer, ForeignKey("org_structures.id"), nullable=True) # Cấp trên trực tiếp
    description = Column(NVARCHAR(500), nullable=True) # Diễn giải
    
    employee_id   = Column(Integer, ForeignKey("employees.id"), nullable=True) # Nhân sự chịu trách nhiệm
    role_id       = Column(Integer, ForeignKey("roles.id"), nullable=True) # Bộ phận liên kết (Roles)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=True) # Vị trí / Chức vụ (Permissions)
    note          = Column(NVARCHAR(1000), nullable=True) # Ghi chú

    # Relationships
    parent     = relationship("OrgStructure", remote_side=[id], backref="children_nodes")
    employee   = relationship("Employee")
    role       = relationship("Role")
    permission = relationship("Permission")

    kpis  = relationship("OrgStructureKPI", back_populates="org_structure", cascade="all, delete-orphan")
    tasks = relationship("OrgStructureTask", back_populates="org_structure", cascade="all, delete-orphan")

class OrgStructureKPI(Base):
    """
    Model lưu trữ các mục tiêu KPI liên kết với từng node trong Sơ đồ tổ chức
    """
    __tablename__ = "org_structure_kpis"

    id               = Column(Integer, primary_key=True, index=True)
    org_structure_id = Column(Integer, ForeignKey("org_structures.id", ondelete="CASCADE"), nullable=False)
    kpi_objective    = Column(NVARCHAR(500), nullable=False) # Mục tiêu KPI
    calculation      = Column(NVARCHAR(500), nullable=True) # Cách tính
    acceptance_threshold = Column(NVARCHAR(250), nullable=True) # Ngưỡng chấp nhận
    weight           = Column(Float, nullable=True, default=0.0) # Trọng số
    average_score    = Column(Float, nullable=True, default=0.0) # Điểm trung bình

    org_structure = relationship("OrgStructure", back_populates="kpis")

class OrgStructureTask(Base):
    """
    Model lưu trữ checklist công việc chi tiết liên kết với từng node trong Sơ đồ tổ chức
    """
    __tablename__ = "org_structure_tasks"

    id               = Column(Integer, primary_key=True, index=True)
    org_structure_id = Column(Integer, ForeignKey("org_structures.id", ondelete="CASCADE"), nullable=False)
    task_name        = Column(NVARCHAR(500), nullable=False) # Nhiệm vụ
    tracking_method  = Column(NVARCHAR(500), nullable=True) # Cách theo dõi
    status           = Column(NVARCHAR(50), nullable=True, default="Chưa bắt đầu") # Trạng thái công việc
    note             = Column(NVARCHAR(1000), nullable=True) # Ghi chú

    org_structure = relationship("OrgStructure", back_populates="tasks")
