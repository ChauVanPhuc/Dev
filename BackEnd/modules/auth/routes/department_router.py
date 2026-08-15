# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from config.database import get_db
from modules.auth.models.departments import Department
from modules.auth.models.role import Role

router = APIRouter()

class DepartmentItemResponse(BaseModel):
    id: int
    name: Optional[str] = None
    code: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None

    class Config:
        from_attributes = True

class DepartmentItemCreate(BaseModel):
    name: str
    code: Optional[str] = None
    role_id: int

@router.get("/", response_model=List[DepartmentItemResponse])
def get_departments(
    role_id: Optional[int] = None,
    role_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách Bộ Phận (từ bảng departments), hỗ trợ lọc theo Phòng Ban (role_id hoặc role_name).
    """
    query = db.query(Department).filter(Department.name.isnot(None), Department.account_id.is_(None))
    if role_id is not None:
        query = query.filter(Department.role_id == role_id)
    if role_name is not None and role_name.strip():
        search_role = role_name.strip().lower()
        target_role = db.query(Role).filter(func.lower(Role.name) == search_role).first()
        if target_role:
            query = query.filter(Department.role_id == target_role.id)
        else:
            # Tìm gần đúng nếu không khớp chính xác
            matching_roles = db.query(Role).filter(func.lower(Role.name).like(f"%{search_role}%")).all()
            if matching_roles:
                query = query.filter(Department.role_id.in_([r.id for r in matching_roles]))
            else:
                return []
        
    depts = query.order_by(Department.id.asc()).all()
    
    # Map role_name
    roles_map = {r.id: r.name for r in db.query(Role).all()}
    
    result = []
    for d in depts:
        result.append(DepartmentItemResponse(
            id=d.id,
            name=d.name,
            code=d.code,
            role_id=d.role_id,
            role_name=roles_map.get(d.role_id)
        ))
    return result

@router.post("/", response_model=DepartmentItemResponse)
def create_department(
    dept_data: DepartmentItemCreate,
    db: Session = Depends(get_db)
):
    """
    [POST] Tạo mới một Bộ Phận thuộc về Phòng Ban (role_id).
    """
    new_dept = Department(
        name=dept_data.name,
        code=dept_data.code,
        role_id=dept_data.role_id
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return DepartmentItemResponse(
        id=new_dept.id,
        name=new_dept.name,
        code=new_dept.code,
        role_id=new_dept.role_id
    )

@router.put("/{id}", response_model=DepartmentItemResponse)
def update_department(id: int, dept_data: DepartmentItemCreate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.name = dept_data.name
    dept.code = dept_data.code
    dept.role_id = dept_data.role_id
    db.commit()
    db.refresh(dept)

    roles_map = {r.id: r.name for r in db.query(Role).all()}
    return DepartmentItemResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        role_id=dept.role_id,
        role_name=roles_map.get(dept.role_id)
    )

@router.delete("/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
