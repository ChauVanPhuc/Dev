# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, text, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

# Reuse auth catalog tables for HR concepts
from modules.auth.models.role import Role as HRDepartment
from modules.auth.models.departments import Department as HRSection
from modules.auth.models.permissions import Permission as HRPosition

class HREmployee(Base):
    """
    Bảng thông tin hồ sơ Nhân viên (Độc lập với account)
    """
    __tablename__ = "hr_employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # Mã NV (NV0001...)
    full_name = Column(NVARCHAR(100), nullable=False) # Họ và tên
    phone = Column(NVARCHAR(20), nullable=True) # Số điện thoại
    hire_date = Column(NVARCHAR(50), nullable=True) # Ngày vào làm
    avatar_path = Column(NVARCHAR(None), nullable=True) # Đường dẫn ảnh đại diện

    department_id = Column(Integer, nullable=True) # -> roles.id (Phòng ban)
    position_id = Column(Integer, nullable=True)   # -> permissions.id (Vị trí)
    section_id = Column(Integer, nullable=True)    # -> departments.id (Bộ phận)

class HROrgNode(Base):
    """
    Bảng cấu trúc các nút trên sơ đồ tổ chức (Org Chart Nodes)
    """
    __tablename__ = "hr_org_nodes"

    id = Column(Integer, primary_key=True, index=True)
    level_name = Column(NVARCHAR(50), nullable=False) # Cấp 1, Cấp 2, Cấp 3...
    parent_id = Column(Integer, nullable=True) # ID nút cha (HROrgNode)
    
    department_id = Column(Integer, nullable=True) # -> roles.id
    position_id = Column(Integer, nullable=True)   # -> permissions.id
    section_id = Column(Integer, nullable=True)    # -> departments.id
    
    note = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class HRNodeAssignment(Base):
    """
    Bảng liên kết bổ nhiệm nhân sự đương nhiệm cho mỗi nút sơ đồ
    """
    __tablename__ = "hr_node_assignments"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    assigned_date = Column(NVARCHAR(50), nullable=True) # Ngày bắt đầu đảm nhiệm
    created_at = Column(DateTime, default=datetime.utcnow)

class HRHierarchyNode(Base):
    """
    Bảng cấu trúc sơ đồ cấp bậc chức danh
    """
    __tablename__ = "hr_hierarchy_nodes"

    id = Column(Integer, primary_key=True, index=True)
    rank_level = Column(NVARCHAR(50), nullable=False) # Cấp 1, Cấp 2, Cấp 3...
    parent_id = Column(Integer, nullable=True) # ID nút cha
    position_id = Column(Integer, nullable=True) # -> permissions.id
    description = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class HRPersonnelNode(Base):
    """
    Bảng cấu trúc sơ đồ nhân sự - phân bổ nhân sự theo bộ phận
    """
    __tablename__ = "hr_personnel_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_name = Column(NVARCHAR(100), nullable=False)
    parent_id = Column(Integer, nullable=True) # ID nút cha
    department_id = Column(Integer, nullable=True) # -> roles.id
    section_id = Column(Integer, nullable=True)    # -> departments.id
    employee_count = Column(Integer, default=0)
    description = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class HRFactoryStructure(Base):
    """
    Bảng cấu trúc vật lý nhà máy
    """
    __tablename__ = "hr_factory_structures"

    id = Column(Integer, primary_key=True, index=True)
    structure_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    structure_name = Column(NVARCHAR(100), nullable=False)
    structure_type = Column(NVARCHAR(50), nullable=False) # Nhà máy / Phân xưởng / Tổ sản xuất
    parent_id = Column(Integer, nullable=True) # ID cấu trúc cha
    department_id = Column(Integer, nullable=True) # -> roles.id
    description = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class HRFactoryDepartment(Base):
    """
    Bảng liên kết Nhà máy và Phòng ban (roles)
    """
    __tablename__ = "hr_factory_departments"

    id = Column(Integer, primary_key=True, index=True)
    factory_structure_id = Column(Integer, nullable=False, index=True)
    department_id = Column(Integer, nullable=False, index=True) # -> roles.id
    created_at = Column(DateTime, default=datetime.utcnow)

