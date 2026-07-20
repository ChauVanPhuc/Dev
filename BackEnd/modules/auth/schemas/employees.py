# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import List, Optional

# --- EMPLOYEE KPI SCHEMAS ---
class EmployeeKPIBase(BaseModel):
    kpi_code: str
    content: str
    score: int
    calc_method: str
    target: str
    actual: Optional[str] = None
    status: Optional[str] = None
    icon: Optional[str] = None

class EmployeeKPICreate(EmployeeKPIBase):
    pass

class EmployeeKPIResponse(EmployeeKPIBase):
    id: int
    employee_id: str

    class Config:
        from_attributes = True


# --- EMPLOYEE CHECKLIST SCHEMAS ---
class EmployeeChecklistBase(BaseModel):
    task_code: str
    content: str
    frequency: str
    status_today: Optional[str] = "Chưa hoàn thành"
    perform_count: Optional[int] = 0
    last_performed: Optional[str] = None
    result: Optional[str] = None

class EmployeeChecklistCreate(EmployeeChecklistBase):
    pass

class EmployeeChecklistResponse(EmployeeChecklistBase):
    id: int
    employee_id: str

    class Config:
        from_attributes = True


# --- MAIN EMPLOYEE SCHEMAS ---
class EmployeeBase(BaseModel):
    employee_id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    permission_id: Optional[int] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = "Đang làm việc"
    note: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    kpis: Optional[List[EmployeeKPICreate]] = []
    checklists: Optional[List[EmployeeChecklistCreate]] = []

class EmployeeUpdate(EmployeeBase):
    kpis: Optional[List[EmployeeKPICreate]] = []
    checklists: Optional[List[EmployeeChecklistCreate]] = []

class EmployeeResponse(EmployeeBase):
    id: int
    role_name: Optional[str] = None
    permission_name: Optional[str] = None
    kpis: List[EmployeeKPIResponse] = []
    checklists: List[EmployeeChecklistResponse] = []

    class Config:
        from_attributes = True

class PaginatedEmployeeResponse(BaseModel):
    items: List[EmployeeResponse]
    total: int
    page: int
    size: int
    pages: int
