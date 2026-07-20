# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.auth.models.org_structures import OrgStructure, OrgStructureKPI, OrgStructureTask
from modules.auth.models.employees import Employee
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.auth.schemas.org_structures import OrgStructureCreate, OrgStructureUpdate, OrgStructureResponse

router = APIRouter()

@router.get("/", response_model=List[OrgStructureResponse])
def get_all_org_structures(db: Session = Depends(get_db)):
    nodes = db.query(OrgStructure).all()
    response = []
    for node in nodes:
        # Resolve related entity names for simplified display
        employee_name = node.employee.full_name if node.employee else None
        role_name = node.role.description if node.role else None
        permission_name = node.permission.description if node.permission else None
        parent_name = node.parent.name if node.parent else None
        
        # Build responses
        res = OrgStructureResponse.model_validate(node)
        res.employee_name = employee_name
        res.role_name = role_name
        res.permission_name = permission_name
        res.parent_name = parent_name
        response.append(res)
        
    return response

@router.get("/{id}", response_model=OrgStructureResponse)
def get_org_structure(id: int, db: Session = Depends(get_db)):
    node = db.query(OrgStructure).filter(OrgStructure.id == id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin sơ đồ tổ chức")
        
    employee_name = node.employee.full_name if node.employee else None
    role_name = node.role.description if node.role else None
    permission_name = node.permission.description if node.permission else None
    parent_name = node.parent.name if node.parent else None
    
    res = OrgStructureResponse.model_validate(node)
    res.employee_name = employee_name
    res.role_name = role_name
    res.permission_name = permission_name
    res.parent_name = parent_name
    return res

@router.post("/", response_model=OrgStructureResponse)
def create_org_structure(data: OrgStructureCreate, db: Session = Depends(get_db)):
    # Create the main org structure node
    node = OrgStructure(
        name=data.name,
        level=data.level,
        parent_id=data.parent_id,
        description=data.description,
        employee_id=data.employee_id,
        role_id=data.role_id,
        permission_id=data.permission_id,
        note=data.note
    )
    db.add(node)
    db.flush() # Populate node.id

    # Create associated KPIs
    for kpi_data in data.kpis:
        kpi = OrgStructureKPI(
            org_structure_id=node.id,
            kpi_objective=kpi_data.kpi_objective,
            calculation=kpi_data.calculation,
            acceptance_threshold=kpi_data.acceptance_threshold,
            weight=kpi_data.weight,
            average_score=kpi_data.average_score
        )
        db.add(kpi)

    # Create associated Tasks
    for task_data in data.tasks:
        task = OrgStructureTask(
            org_structure_id=node.id,
            task_name=task_data.task_name,
            tracking_method=task_data.tracking_method,
            status=task_data.status,
            note=task_data.note
        )
        db.add(task)

    db.commit()
    db.refresh(node)
    
    # Resolve names
    employee_name = node.employee.full_name if node.employee else None
    role_name = node.role.description if node.role else None
    permission_name = node.permission.description if node.permission else None
    parent_name = node.parent.name if node.parent else None
    
    res = OrgStructureResponse.model_validate(node)
    res.employee_name = employee_name
    res.role_name = role_name
    res.permission_name = permission_name
    res.parent_name = parent_name
    return res

@router.put("/{id}", response_model=OrgStructureResponse)
def update_org_structure(id: int, data: OrgStructureUpdate, db: Session = Depends(get_db)):
    node = db.query(OrgStructure).filter(OrgStructure.id == id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Không tìm thấy sơ đồ tổ chức để cập nhật")
        
    # Update main properties
    node.name = data.name
    node.level = data.level
    node.parent_id = data.parent_id
    node.description = data.description
    node.employee_id = data.employee_id
    node.role_id = data.role_id
    node.permission_id = data.permission_id
    node.note = data.note

    # Update KPIs (Sync: remove old ones, create new ones)
    db.query(OrgStructureKPI).filter(OrgStructureKPI.org_structure_id == id).delete()
    for kpi_data in data.kpis:
        kpi = OrgStructureKPI(
            org_structure_id=id,
            kpi_objective=kpi_data.kpi_objective,
            calculation=kpi_data.calculation,
            acceptance_threshold=kpi_data.acceptance_threshold,
            weight=kpi_data.weight,
            average_score=kpi_data.average_score
        )
        db.add(kpi)

    # Update Tasks (Sync)
    db.query(OrgStructureTask).filter(OrgStructureTask.org_structure_id == id).delete()
    for task_data in data.tasks:
        task = OrgStructureTask(
            org_structure_id=id,
            task_name=task_data.task_name,
            tracking_method=task_data.tracking_method,
            status=task_data.status,
            note=task_data.note
        )
        db.add(task)

    db.commit()
    db.refresh(node)
    
    # Resolve names
    employee_name = node.employee.full_name if node.employee else None
    role_name = node.role.description if node.role else None
    permission_name = node.permission.description if node.permission else None
    parent_name = node.parent.name if node.parent else None
    
    res = OrgStructureResponse.model_validate(node)
    res.employee_name = employee_name
    res.role_name = role_name
    res.permission_name = permission_name
    res.parent_name = parent_name
    return res

@router.delete("/{id}")
def delete_org_structure(id: int, db: Session = Depends(get_db)):
    node = db.query(OrgStructure).filter(OrgStructure.id == id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Không tìm thấy sơ đồ tổ chức để xóa")
        
    # Requirements: "Khi xóa, các cấp tiếp theo mặc định nối lên cấp trên của này, những vẫn giữ nguyên cấp"
    # Find direct children of this node
    children = db.query(OrgStructure).filter(OrgStructure.parent_id == id).all()
    for child in children:
        child.parent_id = node.parent_id # link to grandfather
        # child.level remains unchanged

    db.delete(node)
    db.commit()
    return {"message": "Xóa sơ đồ tổ chức và điều chỉnh sơ đồ phân cấp thành công"}
