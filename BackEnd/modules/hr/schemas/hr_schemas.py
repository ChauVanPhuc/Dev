# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- DEPARTMENT SCHEMAS ---
class HRDepartmentBase(BaseModel):
    code: Optional[str] = None
    name: str
    description: Optional[str] = None

class HRDepartmentCreate(HRDepartmentBase):
    pass

class HRDepartmentResponse(HRDepartmentBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- POSITION SCHEMAS ---
class HRPositionBase(BaseModel):
    code: Optional[str] = None
    name: str
    description: Optional[str] = None

class HRPositionCreate(HRPositionBase):
    pass

class HRPositionResponse(HRPositionBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- SECTION SCHEMAS ---
class HRSectionBase(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

class HRSectionCreate(HRSectionBase):
    pass

class HRSectionResponse(HRSectionBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- EMPLOYEE SCHEMAS ---
class HREmployeeBase(BaseModel):
    employee_id: str
    full_name: str
    phone: Optional[str] = None
    hire_date: Optional[str] = None
    avatar_path: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    section_id: Optional[int] = None

class HREmployeeCreate(HREmployeeBase):
    pass

class HREmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    hire_date: Optional[str] = None
    avatar_path: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    section_id: Optional[int] = None

class HREmployeeResponse(HREmployeeBase):
    id: int
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    section_name: Optional[str] = None

    class Config:
        from_attributes = True

class PaginatedEmployeeResponse(BaseModel):
    items: List[HREmployeeResponse]
    total: int
    page: int
    size: int
    pages: int

# --- ORG NODE SCHEMAS ---
class HROrgNodeBase(BaseModel):
    level_name: str
    parent_id: Optional[int] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    section_id: Optional[int] = None
    note: Optional[str] = None

class HROrgNodeCreate(HROrgNodeBase):
    pass

class HROrgNodeResponse(HROrgNodeBase):
    id: int
    created_at: datetime
    
    # Expanded descriptive names
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    section_name: Optional[str] = None
    parent_level_name: Optional[str] = None
    
    # Assigned employees info
    occupants: List[dict] = []

    class Config:
        from_attributes = True

# --- NODE ASSIGNMENT SCHEMAS ---
class HRNodeAssignmentCreate(BaseModel):
    node_id: int
    employee_id: int
    assigned_date: Optional[str] = None

# --- HIERARCHY NODE SCHEMAS ---
class HRHierarchyNodeBase(BaseModel):
    rank_level: str
    parent_id: Optional[int] = None
    position_id: Optional[int] = None
    description: Optional[str] = None

class HRHierarchyNodeCreate(HRHierarchyNodeBase):
    pass

class HRHierarchyNodeResponse(HRHierarchyNodeBase):
    id: int
    created_at: datetime
    position_name: Optional[str] = None
    parent_rank_level: Optional[str] = None

    class Config:
        from_attributes = True

# --- PERSONNEL NODE SCHEMAS ---
class HRPersonnelNodeBase(BaseModel):
    node_name: str
    parent_id: Optional[int] = None
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    employee_count: Optional[int] = 0
    description: Optional[str] = None

class HRPersonnelNodeCreate(HRPersonnelNodeBase):
    pass

class HRPersonnelNodeResponse(HRPersonnelNodeBase):
    id: int
    created_at: datetime
    department_name: Optional[str] = None
    section_name: Optional[str] = None
    parent_node_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- FACTORY STRUCTURE SCHEMAS ---
class HRFactoryStructureBase(BaseModel):
    structure_code: str
    structure_name: str
    structure_type: str
    parent_id: Optional[int] = None
    department_id: Optional[int] = None
    description: Optional[str] = None

class HRFactoryStructureCreate(HRFactoryStructureBase):
    pass

class HRFactoryStructureResponse(HRFactoryStructureBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    department_name: Optional[str] = None
    parent_structure_name: Optional[str] = None

    class Config:
        from_attributes = True
