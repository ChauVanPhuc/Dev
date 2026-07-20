# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import List, Optional

# --- ORG STRUCTURE KPI SCHEMAS ---
class OrgStructureKPIBase(BaseModel):
    kpi_objective: str
    calculation: Optional[str] = None
    acceptance_threshold: Optional[str] = None
    weight: Optional[float] = 0.0
    average_score: Optional[float] = 0.0

class OrgStructureKPICreate(OrgStructureKPIBase):
    pass

class OrgStructureKPIResponse(OrgStructureKPIBase):
    id: int
    org_structure_id: int

    class Config:
        from_attributes = True


# --- ORG STRUCTURE TASK (CHECKLIST) SCHEMAS ---
class OrgStructureTaskBase(BaseModel):
    task_name: str
    tracking_method: Optional[str] = None
    status: Optional[str] = "Chưa bắt đầu"
    note: Optional[str] = None

class OrgStructureTaskCreate(OrgStructureTaskBase):
    pass

class OrgStructureTaskResponse(OrgStructureTaskBase):
    id: int
    org_structure_id: int

    class Config:
        from_attributes = True


# --- ORG STRUCTURE MAIN SCHEMAS ---
class OrgStructureBase(BaseModel):
    name: str
    level: int = 1
    parent_id: Optional[int] = None
    description: Optional[str] = None
    employee_id: Optional[int] = None
    role_id: Optional[int] = None
    permission_id: Optional[int] = None
    note: Optional[str] = None

class OrgStructureCreate(OrgStructureBase):
    kpis: Optional[List[OrgStructureKPICreate]] = []
    tasks: Optional[List[OrgStructureTaskCreate]] = []

class OrgStructureUpdate(OrgStructureBase):
    kpis: Optional[List[OrgStructureKPICreate]] = []
    tasks: Optional[List[OrgStructureTaskCreate]] = []

# For shallow/list presentation
class OrgStructureResponse(OrgStructureBase):
    id: int
    
    # Resolved details
    employee_name: Optional[str] = None
    role_name: Optional[str] = None
    permission_name: Optional[str] = None
    parent_name: Optional[str] = None
    
    kpis: List[OrgStructureKPIResponse] = []
    tasks: List[OrgStructureTaskResponse] = []

    class Config:
        from_attributes = True
