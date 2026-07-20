# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.auth.models.employees import Employee
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.kpi.models.kpi_management import KPIChecklist, KPIEmployeeItem
from modules.auth.schemas.employees import EmployeeCreate, EmployeeUpdate, EmployeeResponse, PaginatedEmployeeResponse
import math

router = APIRouter()

def resolve_employee_names_and_kpis(db: Session, emp: Employee) -> EmployeeResponse:
    # Resolve names
    role_name = emp.role.description if emp.role else emp.department
    permission_name = emp.permission.description if emp.permission else emp.position
    
    # Resolve KPIs and Checklists
    kpis = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == emp.employee_id).all()
    checklists = db.query(KPIChecklist).filter(KPIChecklist.employee_id == emp.employee_id).all()
    
    res = EmployeeResponse.model_validate(emp)
    res.role_name = role_name
    res.permission_name = permission_name
    res.kpis = kpis
    res.checklists = checklists
    return res

@router.get("/", response_model=PaginatedEmployeeResponse)
def list_employees(
    page: int = 1, 
    size: int = 10,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Employee)
    
    # Search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Employee.employee_id.like(search_filter)) |
            (Employee.full_name.like(search_filter)) |
            (Employee.phone.like(search_filter)) |
            (Employee.email.like(search_filter)) |
            (Employee.department.like(search_filter)) |
            (Employee.position.like(search_filter))
        )
        
    # Status filter
    if status:
        query = query.filter(Employee.status == status)
        
    total = query.count()
    pages = math.ceil(total / size)
    
    items = query.order_by(Employee.employee_id.asc()).offset((page - 1) * size).limit(size).all()
    
    resolved_items = [resolve_employee_names_and_kpis(db, item) for item in items]
    
    return {
        "items": resolved_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/by-code/{employee_id}", response_model=EmployeeResponse)
def get_employee_by_code(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên với mã cung cấp")
    return resolve_employee_names_and_kpis(db, employee)

@router.get("/{id}", response_model=EmployeeResponse)
def get_employee(id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Nhân viên không tồn tại")
    return resolve_employee_names_and_kpis(db, employee)

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    # Check duplicate employee_id
    existing = db.query(Employee).filter(Employee.employee_id == data.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã nhân viên đã tồn tại trên hệ thống")
        
    # Extract kpis and checklists
    kpis_data = data.kpis or []
    checklists_data = data.checklists or []
    
    # Exclude nested lists from Employee creation
    emp_dict = data.model_dump()
    emp_dict.pop('kpis', None)
    emp_dict.pop('checklists', None)
    
    # Auto-resolve text fields fallback
    if data.role_id:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if role:
            emp_dict['department'] = role.description or role.name
            
    if data.permission_id:
        perm = db.query(Permission).filter(Permission.id == data.permission_id).first()
        if perm:
            emp_dict['position'] = perm.description or perm.name
            
    employee = Employee(**emp_dict)
    db.add(employee)
    db.flush()
    
    # Add KPIs
    for kpi in kpis_data:
        db_kpi = KPIEmployeeItem(
            employee_id=employee.employee_id,
            kpi_code=kpi.kpi_code,
            content=kpi.content,
            score=kpi.score,
            calc_method=kpi.calc_method,
            target=kpi.target,
            actual=kpi.actual,
            status=kpi.status,
            icon=kpi.icon
        )
        db.add(db_kpi)
        
    # Add Checklists
    for check in checklists_data:
        db_check = KPIChecklist(
            employee_id=employee.employee_id,
            task_code=check.task_code,
            content=check.content,
            frequency=check.frequency,
            status_today=check.status_today or "Chưa hoàn thành",
            perform_count=check.perform_count or 0,
            last_performed=check.last_performed,
            result=check.result
        )
        db.add(db_check)
        
    db.commit()
    db.refresh(employee)
    return resolve_employee_names_and_kpis(db, employee)

@router.put("/{id}", response_model=EmployeeResponse)
def update_employee(id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Nhân viên không tồn tại")
        
    # Check duplicate employee_id if changed
    old_employee_id = employee.employee_id
    if old_employee_id != data.employee_id:
        existing = db.query(Employee).filter(Employee.employee_id == data.employee_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Mã nhân viên mới đã tồn tại trên hệ thống")
            
    # Extract nested lists
    kpis_data = data.kpis or []
    checklists_data = data.checklists or []
    
    # Update main properties
    emp_dict = data.model_dump()
    emp_dict.pop('kpis', None)
    emp_dict.pop('checklists', None)
    
    # Auto-resolve text fields fallback
    if data.role_id:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if role:
            emp_dict['department'] = role.description or role.name
            
    if data.permission_id:
        perm = db.query(Permission).filter(Permission.id == data.permission_id).first()
        if perm:
            emp_dict['position'] = perm.description or perm.name
            
    for key, value in emp_dict.items():
        setattr(employee, key, value)
        
    # Sync KPIs (delete old ones associated with the OLD employee_id, and create new ones with the NEW employee_id)
    db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == old_employee_id).delete()
    for kpi in kpis_data:
        db_kpi = KPIEmployeeItem(
            employee_id=data.employee_id,
            kpi_code=kpi.kpi_code,
            content=kpi.content,
            score=kpi.score,
            calc_method=kpi.calc_method,
            target=kpi.target,
            actual=kpi.actual,
            status=kpi.status,
            icon=kpi.icon
        )
        db.add(db_kpi)
        
    # Sync Checklists
    db.query(KPIChecklist).filter(KPIChecklist.employee_id == old_employee_id).delete()
    for check in checklists_data:
        db_check = KPIChecklist(
            employee_id=data.employee_id,
            task_code=check.task_code,
            content=check.content,
            frequency=check.frequency,
            status_today=check.status_today or "Chưa hoàn thành",
            perform_count=check.perform_count or 0,
            last_performed=check.last_performed,
            result=check.result
        )
        db.add(db_check)
        
    db.commit()
    db.refresh(employee)
    return resolve_employee_names_and_kpis(db, employee)

@router.delete("/{id}")
def delete_employee(id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Nhân viên không tồn tại")
        
    # Also delete associated KPIs and checklists
    db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == employee.employee_id).delete()
    db.query(KPIChecklist).filter(KPIChecklist.employee_id == employee.employee_id).delete()
    
    db.delete(employee)
    db.commit()
    return {"message": "Xóa nhân viên thành công"}
