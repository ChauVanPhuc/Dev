# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import os
import uuid
import openpyxl
from datetime import datetime

from config.database import get_db
from modules.hr.schemas import hr_schemas
from modules.hr.controllers import hr_controller
from modules.hr.models.hr_models import (
    HREmployee, HRDepartment, HRPosition, HRSection,
    HRHierarchyNode, HRPersonnelNode, HRFactoryStructure, HRFactoryDepartment
)
from modules.auth.models.associations import role_permission
from modules.auth.models.accounts import Account

router = APIRouter()

# --- EMPLOYEES ENDPOINTS ---

@router.post("/employees/upload-avatar")
async def upload_employee_avatar(file: UploadFile = File(...)):
    """
    Tải lên ảnh đại diện nhân viên.
    Lưu vào BackEnd/static/uploads/hr_avatars/
    """
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "static", "uploads", "hr_avatars"))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".png"
    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, new_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    return {"url": f"/static/uploads/hr_avatars/{new_filename}"}


@router.get("/employees", response_model=hr_schemas.PaginatedEmployeeResponse)
def list_employees(
    page: int = 1,
    size: int = 10,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    items, total, p, s, pages = hr_controller.get_employees(
        db, page, size, search, department_id, position_id, section_id
    )
    return {
        "items": items,
        "total": total,
        "page": p,
        "size": s,
        "pages": pages
    }

@router.post("/employees", response_model=hr_schemas.HREmployeeResponse)
def create_employee(employee: hr_schemas.HREmployeeCreate, db: Session = Depends(get_db)):
    # Check duplicate code
    existing = db.query(HREmployee).filter(HREmployee.employee_id == employee.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã nhân viên đã tồn tại")
    return hr_controller.create_employee(db, employee)

@router.put("/employees/{id}", response_model=hr_schemas.HREmployeeResponse)
def update_employee(id: int, employee: hr_schemas.HREmployeeUpdate, db: Session = Depends(get_db)):
    updated = hr_controller.update_employee(db, id, employee)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    return updated

@router.delete("/employees/{id}")
def delete_employee(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_employee(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    return {"message": "Xóa nhân viên thành công"}

@router.post("/employees/import")
def import_employees(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        wb = openpyxl.load_workbook(file.file, read_only=True)
        sheet = wb.active
        
        imported_count = 0
        skipped_count = 0
        
        # Expect headers on row 1
        # A: Mã NV, B: Họ tên, C: Số điện thoại, D: Ngày vào làm, E: Phòng ban (code), F: Vị trí (code), G: Bộ phận (code)
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:  # Skip empty rows
                continue
                
            emp_id = str(row[0]).strip()
            name = str(row[1]).strip() if row[1] else None
            phone = str(row[2]).strip() if row[2] else None
            hire_date = str(row[3]).strip() if row[3] else None
            dept_code = str(row[4]).strip() if row[4] else None
            pos_code = str(row[5]).strip() if row[5] else None
            sec_code = str(row[6]).strip() if row[6] else None
            
            if not emp_id or not name:
                skipped_count += 1
                continue
                
            # Check duplicate
            existing = db.query(HREmployee).filter(HREmployee.employee_id == emp_id).first()
            if existing:
                skipped_count += 1
                continue
                
            # Resolve relationships by code
            dept_id = None
            pos_id = None
            sec_id = None
            
            if dept_code:
                dept = db.query(HRDepartment).filter(HRDepartment.code == dept_code).first()
                if dept: dept_id = dept.id
            if pos_code:
                pos = db.query(HRPosition).filter(HRPosition.code == pos_code).first()
                if pos: pos_id = pos.id
            if sec_code:
                sec = db.query(HRSection).filter(HRSection.code == sec_code).first()
                if sec: sec_id = sec.id
                
            new_emp = HREmployee(
                employee_id=emp_id,
                full_name=name,
                phone=phone,
                hire_date=hire_date,
                department_id=dept_id,
                position_id=pos_id,
                section_id=sec_id
            )
            db.add(new_emp)
            imported_count += 1
            
        db.commit()
        return {"message": f"Import thành công {imported_count} nhân sự, bỏ qua {skipped_count} dòng trùng lặp/hợp lệ."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file excel: {str(e)}")

@router.get("/employees/export")
def export_employees(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Danh sach Nhan vien"
        
        # Set headers
        headers = ["Mã NV", "Họ tên", "Số điện thoại", "Ngày vào làm", "Mã Phòng ban", "Mã Vị trí", "Mã Bộ phận"]
        ws.append(headers)
        
        employees = db.query(HREmployee).all()
        for emp in employees:
            dept_code = ""
            pos_code = ""
            sec_code = ""
            
            if emp.department_id:
                dept = db.query(HRDepartment).filter(HRDepartment.id == emp.department_id).first()
                if dept: dept_code = dept.code
            if emp.position_id:
                pos = db.query(HRPosition).filter(HRPosition.id == emp.position_id).first()
                if pos: pos_code = pos.code
            if emp.section_id:
                sec = db.query(HRSection).filter(HRSection.id == emp.section_id).first()
                if sec: sec_code = sec.code
                
            ws.append([
                emp.employee_id,
                emp.full_name,
                emp.phone or "",
                emp.hire_date or "",
                dept_code,
                pos_code,
                sec_code
            ])
            
        temp_dir = "temp_exports"
        os.makedirs(temp_dir, exist_ok=True)
        temp_filename = f"employees_{uuid.uuid4().hex}.xlsx"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        wb.save(temp_path)
        
        def remove_file(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass
                
        background_tasks.add_task(remove_file, temp_path)
        
        return FileResponse(
            path=temp_path,
            filename="Danh_sach_nhan_su.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất file excel: {str(e)}")


# --- DEPARTMENTS ENDPOINTS ---

@router.get("/departments", response_model=List[hr_schemas.HRDepartmentResponse])
def list_departments(search: Optional[str] = None, db: Session = Depends(get_db)):
    return hr_controller.get_departments(db, search)

@router.post("/departments", response_model=hr_schemas.HRDepartmentResponse)
def create_department(dept: hr_schemas.HRDepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(HRDepartment).filter(HRDepartment.code == dept.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã phòng ban đã tồn tại")
    return hr_controller.create_department(db, dept)

@router.delete("/departments/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_department(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    return {"message": "Xóa phòng ban thành công"}

@router.put("/departments/{id}", response_model=hr_schemas.HRDepartmentResponse)
def update_existing_department(id: int, dept: hr_schemas.HRDepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(HRDepartment).filter(HRDepartment.code == dept.code, HRDepartment.id != id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã phòng ban đã được sử dụng")
    updated = hr_controller.update_department(db, id, dept)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    return updated


# --- POSITIONS ENDPOINTS ---

@router.get("/positions", response_model=List[hr_schemas.HRPositionResponse])
def list_positions(
    search: Optional[str] = None, 
    department_id: Optional[int] = None,
    role_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return hr_controller.get_positions(db, search=search, department_id=department_id, role_id=role_id)

@router.post("/positions", response_model=hr_schemas.HRPositionResponse)
def create_position(pos: hr_schemas.HRPositionCreate, db: Session = Depends(get_db)):
    existing = db.query(HRPosition).filter(HRPosition.code == pos.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã vị trí đã tồn tại")
    return hr_controller.create_position(db, pos)

@router.delete("/positions/{id}")
def delete_position(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_position(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí")
    return {"message": "Xóa vị trí thành công"}

@router.put("/positions/{id}", response_model=hr_schemas.HRPositionResponse)
def update_existing_position(id: int, pos: hr_schemas.HRPositionCreate, db: Session = Depends(get_db)):
    existing = db.query(HRPosition).filter(HRPosition.code == pos.code, HRPosition.id != id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã vị trí đã được sử dụng")
    updated = hr_controller.update_position(db, id, pos)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí")
    return updated

# --- SECTIONS ENDPOINTS ---

@router.get("/sections", response_model=List[hr_schemas.HRSectionResponse])
def list_sections(search: Optional[str] = None, role_id: Optional[int] = None, db: Session = Depends(get_db)):
    return hr_controller.get_sections(db, search, role_id)

@router.post("/sections", response_model=hr_schemas.HRSectionResponse)
def create_section(sec: hr_schemas.HRSectionCreate, db: Session = Depends(get_db)):
    existing = db.query(HRSection).filter(HRSection.code == sec.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã bộ phận đã tồn tại")
    return hr_controller.create_section(db, sec)

@router.delete("/sections/{id}")
def delete_section(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_section(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ phận")
    return {"message": "Xóa bộ phận thành công"}

@router.put("/sections/{id}", response_model=hr_schemas.HRSectionResponse)
def update_existing_section(id: int, sec: hr_schemas.HRSectionCreate, db: Session = Depends(get_db)):
    existing = db.query(HRSection).filter(HRSection.code == sec.code, HRSection.id != id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã bộ phận đã được sử dụng")
    updated = hr_controller.update_section(db, id, sec)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ phận")
    return updated


# --- ORG NODES ENDPOINTS ---

@router.get("/org-nodes", response_model=List[hr_schemas.HROrgNodeResponse])
def list_org_nodes(db: Session = Depends(get_db)):
    return hr_controller.get_org_nodes(db)

@router.post("/org-nodes/auto-generate")
def auto_generate_org_nodes(db: Session = Depends(get_db)):
    hr_controller.auto_generate_org_nodes(db)
    return hr_controller.get_org_nodes(db)

@router.post("/org-nodes", response_model=hr_schemas.HROrgNodeResponse)
def create_org_node(node: hr_schemas.HROrgNodeCreate, db: Session = Depends(get_db)):
    return hr_controller.create_org_node(db, node)

@router.put("/org-nodes/{id}", response_model=hr_schemas.HROrgNodeResponse)
def update_org_node(id: int, node: hr_schemas.HROrgNodeCreate, db: Session = Depends(get_db)):
    updated = hr_controller.update_org_node(db, id, node)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ")
    return updated

@router.delete("/org-nodes/{id}")
def delete_org_node(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_org_node(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ")
    return {"message": "Xóa nút sơ đồ thành công"}


# --- NODE ASSIGNMENTS ENDPOINTS ---

@router.post("/assignments")
def assign_employee(assignment: hr_schemas.HRNodeAssignmentCreate, db: Session = Depends(get_db)):
    return hr_controller.assign_employee_to_node(db, assignment)

@router.delete("/assignments/{id}")
def unassign_employee(id: int, db: Session = Depends(get_db)):
    success = hr_controller.unassign_employee_from_node(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên kết bổ nhiệm")
    return {"message": "Hủy nhiệm thành công"}


# --- HIERARCHY NODES ENDPOINTS ---

@router.get("/hierarchy-nodes", response_model=List[hr_schemas.HRHierarchyNodeResponse])
def list_hierarchy_nodes(db: Session = Depends(get_db)):
    return hr_controller.get_hierarchy_nodes(db)

@router.post("/hierarchy-nodes/auto-generate")
def auto_generate_hierarchy_nodes(db: Session = Depends(get_db)):
    hr_controller.auto_generate_hierarchy_nodes(db)
    return hr_controller.get_hierarchy_nodes(db)

@router.post("/hierarchy-nodes", response_model=hr_schemas.HRHierarchyNodeResponse)
def create_hierarchy_node(node: hr_schemas.HRHierarchyNodeCreate, db: Session = Depends(get_db)):
    return hr_controller.create_hierarchy_node(db, node)

@router.put("/hierarchy-nodes/{id}", response_model=hr_schemas.HRHierarchyNodeResponse)
def update_hierarchy_node(id: int, node: hr_schemas.HRHierarchyNodeCreate, db: Session = Depends(get_db)):
    updated = hr_controller.update_hierarchy_node(db, id, node)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ cấp bậc")
    return updated

@router.delete("/hierarchy-nodes/{id}")
def delete_hierarchy_node(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_hierarchy_node(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ cấp bậc")
    return {"message": "Xóa nút sơ đồ cấp bậc thành công"}


# --- PERSONNEL NODES ENDPOINTS ---

@router.get("/personnel-nodes", response_model=List[hr_schemas.HRPersonnelNodeResponse])
def list_personnel_nodes(db: Session = Depends(get_db)):
    return hr_controller.get_personnel_nodes(db)

@router.post("/personnel-nodes/auto-generate")
def auto_generate_personnel_nodes(db: Session = Depends(get_db)):
    hr_controller.auto_generate_personnel_nodes(db)
    return hr_controller.get_personnel_nodes(db)

@router.post("/personnel-nodes", response_model=hr_schemas.HRPersonnelNodeResponse)
def create_personnel_node(node: hr_schemas.HRPersonnelNodeCreate, db: Session = Depends(get_db)):
    return hr_controller.create_personnel_node(db, node)

@router.put("/personnel-nodes/{id}", response_model=hr_schemas.HRPersonnelNodeResponse)
def update_personnel_node(id: int, node: hr_schemas.HRPersonnelNodeCreate, db: Session = Depends(get_db)):
    updated = hr_controller.update_personnel_node(db, id, node)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ nhân sự")
    return updated

@router.delete("/personnel-nodes/{id}")
def delete_personnel_node(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_personnel_node(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nút sơ đồ nhân sự")
    return {"message": "Xóa nút sơ đồ nhân sự thành công"}


# --- FACTORY STRUCTURES ENDPOINTS ---

@router.get("/factory-structures", response_model=List[hr_schemas.HRFactoryStructureResponse])
def list_factory_structures(db: Session = Depends(get_db)):
    return hr_controller.get_factory_structures(db)

@router.post("/factory-structures", response_model=hr_schemas.HRFactoryStructureResponse)
def create_factory_structure(structure: hr_schemas.HRFactoryStructureCreate, db: Session = Depends(get_db)):
    existing = db.query(HRFactoryStructure).filter(HRFactoryStructure.structure_code == structure.structure_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã cấu trúc nhà máy đã tồn tại")
    return hr_controller.create_factory_structure(db, structure)

@router.put("/factory-structures/{id}", response_model=hr_schemas.HRFactoryStructureResponse)
def update_factory_structure(id: int, structure: hr_schemas.HRFactoryStructureCreate, db: Session = Depends(get_db)):
    updated = hr_controller.update_factory_structure(db, id, structure)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu trúc nhà máy")
    return updated

@router.put("/factory-structures/upsert/{code}", response_model=hr_schemas.HRFactoryStructureResponse)
def upsert_factory_structure_by_code(code: str, structure: hr_schemas.HRFactoryStructureCreate, db: Session = Depends(get_db)):
    existing = db.query(HRFactoryStructure).filter(HRFactoryStructure.structure_code == code).first()
    if existing:
        for key, val in structure.model_dump().items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_struct = HRFactoryStructure(**structure.model_dump())
        db.add(new_struct)
        db.commit()
        db.refresh(new_struct)
        return new_struct

@router.post("/factory-structures/sync-from-bom", response_model=List[hr_schemas.HRFactoryStructureResponse])
def sync_factory_structures_from_bom(db: Session = Depends(get_db)):
    return hr_controller.sync_factory_structures_from_bom(db)

@router.delete("/factory-structures/{id}")
def delete_factory_structure(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_factory_structure(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu trúc nhà máy")
    return {"message": "Xóa cấu trúc nhà máy thành công"}


# --- SUB-TABLES ENDPOINTS ---

# 1. Factory Structure Sub-tables
@router.get("/factory-structures/{id}/departments")
def get_factory_departments(id: int, db: Session = Depends(get_db)):
    links = db.query(HRFactoryDepartment).filter(HRFactoryDepartment.factory_structure_id == id).all()
    dept_ids = [l.department_id for l in links]
    struct = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == id).first()
    if struct and struct.department_id and struct.department_id not in dept_ids:
        dept_ids.append(struct.department_id)
        
    if not dept_ids:
        return []
    depts = db.query(HRDepartment).filter(HRDepartment.id.in_(dept_ids)).all()
    link_map = {l.department_id: l.id for l in links}
    return [
        {
            "link_id": link_map.get(d.id, d.id),
            "department_id": d.id,
            "code": getattr(d, 'code', None) or f"PB{d.id:02d}",
            "name": d.name,
            "description": d.description or "---",
            "created_at": getattr(d, 'created_at', None)
        }
        for d in depts
    ]

@router.post("/factory-structures/{id}/departments")
def add_factory_department(id: int, payload: dict, db: Session = Depends(get_db)):
    dept_id = payload.get("department_id")
    if not dept_id:
        raise HTTPException(status_code=400, detail="Thiếu department_id")
    existing = db.query(HRFactoryDepartment).filter(
        HRFactoryDepartment.factory_structure_id == id,
        HRFactoryDepartment.department_id == dept_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phòng ban này đã liên kết với nhà máy!")
    link = HRFactoryDepartment(factory_structure_id=id, department_id=dept_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@router.delete("/factory-structures/{id}/departments/{dept_id}")
def remove_factory_department(id: int, dept_id: int, db: Session = Depends(get_db)):
    link = db.query(HRFactoryDepartment).filter(
        HRFactoryDepartment.factory_structure_id == id,
        HRFactoryDepartment.department_id == dept_id
    ).first()
    if link:
        db.delete(link)
        db.commit()
    struct = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == id, HRFactoryStructure.department_id == dept_id).first()
    if struct:
        struct.department_id = None
        db.commit()
    return {"message": "Đã xóa liên kết phòng ban"}

@router.get("/factory-structures/{id}/children")
def get_factory_children(id: int, db: Session = Depends(get_db)):
    children = db.query(HRFactoryStructure).filter(HRFactoryStructure.parent_id == id).all()
    return children


# 2. Department Sub-tables
@router.get("/departments/{id}/employees")
def get_department_employees(id: int, db: Session = Depends(get_db)):
    employees = db.query(HREmployee).filter(
        or_(HREmployee.section_id == id, HREmployee.department_id == id)
    ).all()
    return [
        {
            "id": e.id,
            "employee_id": e.employee_id,
            "name": e.full_name,
            "full_name": e.full_name,
            "phone": e.phone or "---",
            "hire_date": e.hire_date or "---",
            "description": f"Mã NV: {e.employee_id} | ĐT: {e.phone or '---'}"
        }
        for e in employees
    ]

@router.get("/departments/{id}/positions")
def get_department_positions(id: int, db: Session = Depends(get_db)):
    positions = db.query(HRPosition).filter(HRPosition.department_id == id).all()
    return [
        {
            "link_id": p.id,
            "position_id": p.id,
            "code": getattr(p, 'code', None) or f"VT{p.id:02d}",
            "name": p.name,
            "description": p.description or "---",
            "created_at": getattr(p, 'created_at', None)
        }
        for p in positions
    ]

@router.post("/departments/{id}/positions")
def add_department_position(id: int, payload: dict, db: Session = Depends(get_db)):
    pos_id = payload.get("position_id")
    if not pos_id:
        raise HTTPException(status_code=400, detail="Thiếu position_id")
    pos = db.query(HRPosition).filter(HRPosition.id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí")
    pos.department_id = id
    db.commit()
    db.refresh(pos)
    return {"message": "Đã liên kết vị trí vào bộ phận", "position_id": pos.id}

@router.delete("/departments/{id}/positions/{pos_id}")
def remove_department_position(id: int, pos_id: int, db: Session = Depends(get_db)):
    pos = db.query(HRPosition).filter(HRPosition.id == pos_id, HRPosition.department_id == id).first()
    if pos:
        pos.department_id = None
        db.commit()
    return {"message": "Đã xóa liên kết vị trí"}


# 3. Position Sub-tables
@router.get("/positions/{id}/employees")
def get_position_employees(id: int, db: Session = Depends(get_db)):
    employees = db.query(HREmployee).filter(HREmployee.position_id == id).all()
    return [
        {
            "id": e.id,
            "employee_id": e.employee_id,
            "name": e.full_name,
            "full_name": e.full_name,
            "phone": e.phone or "---",
            "hire_date": e.hire_date or "---",
            "description": f"Mã NV: {e.employee_id} | ĐT: {e.phone or '---'}"
        }
        for e in employees
    ]

@router.get("/positions/{id}/departments")
def get_position_departments(id: int, db: Session = Depends(get_db)):
    res = []
    # Direct Department (Bộ phận)
    pos = db.query(HRPosition).filter(HRPosition.id == id).first()
    if pos and pos.department_id:
        sec = db.query(HRSection).filter(HRSection.id == pos.department_id).first()
        if sec:
            res.append({
                "link_id": sec.id,
                "department_id": sec.id,
                "code": sec.code or f"BP{sec.id:02d}",
                "name": sec.name,
                "description": f"Bộ phận trực tiếp ({sec.code or ''})",
                "created_at": getattr(sec, 'created_at', None)
            })
    # Linked Roles (Phòng ban) via role_permission
    role_links = db.query(role_permission).filter(role_permission.c.permission_id == id).all()
    role_ids = [r.role_id for r in role_links]
    if role_ids:
        roles = db.query(HRDepartment).filter(HRDepartment.id.in_(role_ids)).all()
        for r in roles:
            if not any(x.get("department_id") == r.id and x.get("type") == "role" for x in res):
                res.append({
                    "link_id": r.id,
                    "department_id": r.id,
                    "type": "role",
                    "code": getattr(r, 'code', None) or f"PB{r.id:02d}",
                    "name": r.name,
                    "description": f"Phòng ban: {r.description or r.name}",
                    "created_at": getattr(r, 'created_at', None)
                })
    return res


# 4. Role Sub-tables
@router.get("/roles/{id}/employees")
def get_role_employees(id: int, db: Session = Depends(get_db)):
    res = []
    seen_names = set()
    # 1. HREmployees
    hr_emps = db.query(HREmployee).filter(HREmployee.department_id == id).all()
    for e in hr_emps:
        seen_names.add(e.full_name)
        res.append({
            "id": e.id,
            "employee_id": e.employee_id,
            "name": e.full_name,
            "full_name": e.full_name,
            "description": f"Mã NV: {e.employee_id} | ĐT: {e.phone or '---'}",
            "email": "---"
        })
    # 2. Accounts
    dept_mappings = db.query(HRSection).filter(HRSection.role_id == id).all()
    account_ids = [d.account_id for d in dept_mappings if d.account_id]
    if account_ids:
        accounts = db.query(Account).filter(Account.id.in_(account_ids)).all()
        for acc in accounts:
            name = acc.full_name or acc.username
            if name not in seen_names:
                res.append({
                    "id": acc.id,
                    "employee_id": acc.username,
                    "name": name,
                    "full_name": name,
                    "description": f"Tài khoản: {acc.username}",
                    "email": getattr(acc, 'email', '---')
                })
    return res

