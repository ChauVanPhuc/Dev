# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách Bộ Phận (từ bảng departments), hỗ trợ lọc theo Phòng Ban (role_id).
    """
    query = db.query(Department).filter(Department.name.isnot(None))
    if role_id is not None:
        query = query.filter(Department.role_id == role_id)
        
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
