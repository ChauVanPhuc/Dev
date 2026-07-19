# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
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
    HRHierarchyNode, HRPersonnelNode, HRFactoryStructure
)

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


# --- POSITIONS ENDPOINTS ---

@router.get("/positions", response_model=List[hr_schemas.HRPositionResponse])
def list_positions(search: Optional[str] = None, db: Session = Depends(get_db)):
    return hr_controller.get_positions(db, search)

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


# --- SECTIONS ENDPOINTS ---

@router.get("/sections", response_model=List[hr_schemas.HRSectionResponse])
def list_sections(search: Optional[str] = None, db: Session = Depends(get_db)):
    return hr_controller.get_sections(db, search)

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


# --- ORG NODES ENDPOINTS ---

@router.get("/org-nodes", response_model=List[hr_schemas.HROrgNodeResponse])
def list_org_nodes(db: Session = Depends(get_db)):
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

@router.delete("/factory-structures/{id}")
def delete_factory_structure(id: int, db: Session = Depends(get_db)):
    success = hr_controller.delete_factory_structure(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu trúc nhà máy")
    return {"message": "Xóa cấu trúc nhà máy thành công"}
