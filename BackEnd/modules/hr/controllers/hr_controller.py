# -*- coding: utf-8 -*-
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime
from modules.hr.models.hr_models import (
    HREmployee, HRDepartment, HRPosition, HRSection, HROrgNode, HRNodeAssignment,
    HRHierarchyNode, HRPersonnelNode, HRFactoryStructure
)
from modules.hr.schemas.hr_schemas import (
    HREmployeeCreate, HREmployeeUpdate,
    HRDepartmentCreate, HRPositionCreate, HRSectionCreate,
    HROrgNodeCreate, HRNodeAssignmentCreate,
    HRHierarchyNodeCreate, HRPersonnelNodeCreate, HRFactoryStructureCreate
)
from modules.production.models.bom_detail import BOMDetail
from modules.master.models.master_bom_detail import MasterBOMDetail

# --- EMPLOYEES CONTROLLER ---
def get_employees(db: Session, page: int = 1, size: int = 10, search: str = None, 
                  department_id: int = None, position_id: int = None, section_id: int = None):
    skip = (page - 1) * size
    query = db.query(HREmployee)
    
    if search:
        search_pat = f"%{search}%"
        query = query.filter(
            or_(
                HREmployee.full_name.ilike(search_pat),
                HREmployee.employee_id.ilike(search_pat),
                HREmployee.phone.ilike(search_pat)
            )
        )
    
    if department_id:
        query = query.filter(HREmployee.department_id == department_id)
    if position_id:
        query = query.filter(HREmployee.position_id == position_id)
    if section_id:
        query = query.filter(HREmployee.section_id == section_id)
        
    total = query.count()
    employees = query.order_by(HREmployee.employee_id.asc()).offset(skip).limit(size).all()
    
    items = []
    for emp in employees:
        dept_name = None
        pos_name = None
        sec_name = None
        
        if emp.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == emp.department_id).first()
            if dept: dept_name = dept.name
            
        if emp.position_id:
            pos = db.query(HRPosition).filter(HRPosition.id == emp.position_id).first()
            if pos: pos_name = pos.name
            
        if emp.section_id:
            sec = db.query(HRSection).filter(HRSection.id == emp.section_id).first()
            if sec: sec_name = sec.name
            
        items.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "full_name": emp.full_name,
            "phone": emp.phone,
            "hire_date": emp.hire_date,
            "avatar_path": emp.avatar_path,
            "department_id": emp.department_id,
            "position_id": emp.position_id,
            "section_id": emp.section_id,
            "department_name": dept_name,
            "position_name": pos_name,
            "section_name": sec_name
        })
        
    pages = (total + size - 1) // size
    return items, total, page, size, pages

def create_employee(db: Session, employee: HREmployeeCreate):
    db_employee = HREmployee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee_data: HREmployeeUpdate):
    db_employee = db.query(HREmployee).filter(HREmployee.id == employee_id).first()
    if not db_employee:
        return None
    for key, val in employee_data.model_dump(exclude_unset=True).items():
        setattr(db_employee, key, val)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = db.query(HREmployee).filter(HREmployee.id == employee_id).first()
    if not db_employee:
        return False
    # Clear assignments
    db.query(HRNodeAssignment).filter(HRNodeAssignment.employee_id == employee_id).delete()
    db.delete(db_employee)
    db.commit()
    return True


# --- DEPARTMENTS CONTROLLER ---
def get_departments(db: Session, search: str = None):
    query = db.query(HRDepartment)
    if search:
        query = query.filter(HRDepartment.name.ilike(f"%{search}%"))
    return query.order_by(HRDepartment.name.asc()).all()

def create_department(db: Session, department: HRDepartmentCreate):
    db_dept = HRDepartment(**department.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def delete_department(db: Session, dept_id: int):
    from modules.auth.controllers import role_controller
    res = role_controller.delete_role(db, dept_id)
    return bool(res)


# --- POSITIONS CONTROLLER ---
def get_positions(db: Session, search: str = None, department_id: int = None, role_id: int = None):
    query = db.query(HRPosition).filter(HRPosition.is_active == True)
    if department_id is not None:
        query = query.filter(HRPosition.department_id == department_id)
    if search:
        query = query.filter(HRPosition.name.ilike(f"%{search}%"))
        
    positions = query.order_by(HRPosition.name.asc()).all()
    
    # Caching section and role maps
    sec_map = {s.id: s for s in db.query(HRSection).all()}
    role_map = {r.id: r for r in db.query(HRDepartment).all()}
    
    result = []
    for p in positions:
        p_sec = sec_map.get(p.department_id) if p.department_id else None
        p_sec_name = p_sec.name if p_sec else None
        p_role_id = p_sec.role_id if p_sec else None
        p_role = role_map.get(p_role_id) if p_role_id else None
        p_role_name = (p_role.name or p_role.description) if p_role else None
        
        if role_id is not None and p_role_id != role_id:
            continue
            
        p.department_name = p_sec_name
        p.role_id = p_role_id
        p.role_name = p_role_name
        result.append(p)
        
    return result

def create_position(db: Session, position: HRPositionCreate):
    db_pos = HRPosition(**position.model_dump())
    db.add(db_pos)
    db.commit()
    db.refresh(db_pos)
    return db_pos

def update_position(db: Session, pos_id: int, position: HRPositionCreate):
    db_pos = db.query(HRPosition).filter(HRPosition.id == pos_id).first()
    if not db_pos:
        return None
    for key, value in position.model_dump(exclude_unset=True).items():
        setattr(db_pos, key, value)
    db.commit()
    db.refresh(db_pos)
    return db_pos

def delete_position(db: Session, pos_id: int):
    from modules.auth.controllers import permission_controller
    res = permission_controller.delete_permission(db, pos_id)
    return bool(res)


# --- SECTIONS CONTROLLER ---
def get_sections(db: Session, search: str = None, role_id: int = None):
    query = db.query(HRSection).filter(
        HRSection.name.isnot(None),
        HRSection.account_id.is_(None)
    )
    if role_id is not None:
        query = query.filter(HRSection.role_id == role_id)
    if search:
        query = query.filter(
            or_(
                HRSection.name.ilike(f"%{search}%"),
                HRSection.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(HRSection.id.asc()).all()

def create_section(db: Session, section: HRSectionCreate):
    db_sec = HRSection(**section.model_dump())
    db.add(db_sec)
    db.commit()
    db.refresh(db_sec)
    return db_sec

def delete_section(db: Session, sec_id: int):
    db_sec = db.query(HRSection).filter(HRSection.id == sec_id).first()
    if not db_sec:
        return False
    # Clear employee links
    db.query(HREmployee).filter(HREmployee.section_id == sec_id).update({"section_id": None})
    db.query(HROrgNode).filter(HROrgNode.section_id == sec_id).update({"section_id": None})
    db.delete(db_sec)
    db.commit()
    return True


# --- ORG CHART NODES CONTROLLER ---
# --- ORG CHART NODES CONTROLLER ---
def auto_generate_org_nodes(db: Session):
    """
    Tự động khởi tạo cây sơ đồ tổ chức 4 tầng chuẩn hóa:
    - Level 1: Ban Giám Đốc / Ban Điều Hành (Nút Gốc)
    - Level 2: Các Phòng Ban (Phòng QLCL, Phòng IT, Ban Giám Đốc, Khối Sản Xuất...)
    - Level 3: Các Bộ Phận / Tổ thuộc Phòng Ban (IQC, QA, PQC1, PQC2, FQC...)
    - Level 4: Chức Danh & Danh Sách Nhân Sự Đương Nhiệm
    """
    # 1. Clear legacy org nodes & assignments
    db.query(HRNodeAssignment).delete()
    db.query(HROrgNode).delete()
    db.commit()

    # 2. Get master catalogs
    depts = db.query(HRDepartment).all()
    sections = db.query(HRSection).filter(HRSection.name.isnot(None), HRSection.account_id.is_(None)).all()
    positions = db.query(HRPosition).all()
    employees = db.query(HREmployee).all()

    # 3. Create Root Node (Level 1)
    root_node = HROrgNode(
        level_name="Cấp 1",
        parent_id=None,
        department_id=None,
        position_id=None,
        section_id=None,
        note="Ban Giám Đốc / Điều Hành Chất Lượng"
    )
    db.add(root_node)
    db.commit()
    db.refresh(root_node)

    # 4. Create Level 2 Nodes (Phòng Ban)
    dept_node_map = {}
    if depts:
        for dept in depts:
            d_name = dept.name or dept.description or "Bộ phận"
            if not d_name.startswith("Phòng") and not d_name.startswith("Ban") and not d_name.startswith("Khối"):
                d_name = f"Phòng {d_name}"
            node = HROrgNode(
                level_name="Cấp 2",
                parent_id=root_node.id,
                department_id=dept.id,
                position_id=None,
                section_id=None,
                note=d_name
            )
            db.add(node)
            db.commit()
            db.refresh(node)
            dept_node_map[dept.id] = node

    # 5. Create Level 3 Nodes (Bộ Phận / Tổ Công Đoạn)
    sec_node_map = {}
    
    # Group sections by department / role_id
    for sec in sections:
        p_dept_id = sec.role_id or (list(dept_node_map.keys())[0] if dept_node_map else None)
        parent_n = dept_node_map.get(p_dept_id, root_node)
        
        node = HROrgNode(
            level_name="Cấp 3",
            parent_id=parent_n.id,
            department_id=p_dept_id if isinstance(p_dept_id, int) else None,
            position_id=None,
            section_id=sec.id,
            note=sec.name or f"Tổ {sec.code}"
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        sec_node_map[sec.id] = node

    # Ensure every department has at least one Level 3 node for positions/employees
    for d_id, d_node in dept_node_map.items():
        children = db.query(HROrgNode).filter(HROrgNode.parent_id == d_node.id).all()
        if not children:
            gen_node = HROrgNode(
                level_name="Cấp 3",
                parent_id=d_node.id,
                department_id=d_id,
                position_id=None,
                section_id=None,
                note=f"Bộ phận {d_node.note}"
            )
            db.add(gen_node)
            db.commit()
            db.refresh(gen_node)
            sec_node_map[f"dept_gen_{d_id}"] = gen_node

    # 6. Create Level 4 Nodes (Vị Trí & Chức Danh)
    pos_node_map = {}
    pos_by_name = {p.name.lower(): p for p in positions} if positions else {}

    # Define standard position roles
    standard_roles = [
        ("Trưởng Phòng", "Cấp 4 - Trưởng Phòng / Quản Đốc"),
        ("Tổ Trưởng / Lead", "Cấp 4 - Tổ Trưởng / QC Lead"),
        ("Nhân Viên", "Cấp 4 - QC Staff / Chuyên Viên")
    ]

    for sec_key, sec_node in sec_node_map.items():
        for role_name, level_label in standard_roles:
            p_obj = pos_by_name.get(role_name.lower())
            p_id = p_obj.id if p_obj else None
            
            node = HROrgNode(
                level_name="Cấp 4",
                parent_id=sec_node.id,
                department_id=sec_node.department_id,
                position_id=p_id,
                section_id=sec_node.section_id,
                note=role_name
            )
            db.add(node)
            db.commit()
            db.refresh(node)
            pos_node_map[f"{sec_key}_{role_name}"] = node

    # 7. Assign employees to Level 4 Org Nodes
    today_str = datetime.now().strftime("%Y-%m-%d")
    assigned_emp_ids = set()

    for emp in employees:
        target_node_id = None
        
        # Match section first
        sec_key = emp.section_id if emp.section_id and emp.section_id in sec_node_map else None
        if not sec_key and emp.department_id and f"dept_gen_{emp.department_id}" in sec_node_map:
            sec_key = f"dept_gen_{emp.department_id}"

        if not sec_key:
            sec_key = list(sec_node_map.keys())[0] if sec_node_map else None

        if sec_key:
            pos_obj = db.query(HRPosition).filter(HRPosition.id == emp.position_id).first() if emp.position_id else None
            pos_title = pos_obj.name if pos_obj else ""

            if "Trưởng" in pos_title or "Quản Đốc" in pos_title:
                role_slot = "Trưởng Phòng"
            elif "Lead" in pos_title or "Tổ Trưởng" in pos_title or "QA" in pos_title:
                role_slot = "Tổ Trưởng / Lead"
            else:
                role_slot = "Nhân Viên"

            slot_key = f"{sec_key}_{role_slot}"
            if slot_key in pos_node_map:
                target_node_id = pos_node_map[slot_key].id
            elif f"{sec_key}_Nhân Viên" in pos_node_map:
                target_node_id = pos_node_map[f"{sec_key}_Nhân Viên"].id

        if not target_node_id and sec_key and isinstance(sec_key, int) and sec_key in sec_node_map:
            target_node_id = sec_node_map[sec_key].id

        if target_node_id and emp.id not in assigned_emp_ids:
            ass = HRNodeAssignment(
                node_id=target_node_id,
                employee_id=emp.id,
                assigned_date=today_str
            )
            db.add(ass)
            assigned_emp_ids.add(emp.id)

    db.commit()

def get_org_nodes(db: Session):
    nodes = db.query(HROrgNode).order_by(HROrgNode.id.asc()).all()
    if not nodes:
        auto_generate_org_nodes(db)
        nodes = db.query(HROrgNode).order_by(HROrgNode.id.asc()).all()

    res = []
    for node in nodes:
        dept_name = None
        pos_name = None
        sec_name = None
        parent_level = None
        
        if node.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == node.department_id).first()
            if dept: dept_name = dept.name or dept.description
        if node.position_id:
            pos = db.query(HRPosition).filter(HRPosition.id == node.position_id).first()
            if pos: pos_name = pos.name
        if node.section_id:
            sec = db.query(HRSection).filter(HRSection.id == node.section_id).first()
            if sec: sec_name = sec.name
        if node.parent_id:
            parent = db.query(HROrgNode).filter(HROrgNode.id == node.parent_id).first()
            if parent: parent_level = parent.level_name
            
        # Get occupants (nhân sự đương nhiệm)
        assignments = db.query(HRNodeAssignment).filter(HRNodeAssignment.node_id == node.id).all()
        occupants = []
        for ass in assignments:
            emp = db.query(HREmployee).filter(HREmployee.id == ass.employee_id).first()
            if emp:
                occupants.append({
                    "assignment_id": ass.id,
                    "id": emp.id,
                    "employee_id": emp.employee_id,
                    "full_name": emp.full_name,
                    "assigned_date": ass.assigned_date
                })
                
        res.append({
            "id": node.id,
            "level_name": node.level_name,
            "parent_id": node.parent_id,
            "department_id": node.department_id,
            "position_id": node.position_id,
            "section_id": node.section_id,
            "note": node.note,
            "created_at": node.created_at,
            "department_name": dept_name,
            "position_name": pos_name or node.note,
            "section_name": sec_name,
            "parent_level_name": parent_level,
            "occupants": occupants
        })
    return res

def create_org_node(db: Session, node: HROrgNodeCreate):
    db_node = HROrgNode(**node.model_dump())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

def update_org_node(db: Session, node_id: int, node_data: HROrgNodeCreate):
    db_node = db.query(HROrgNode).filter(HROrgNode.id == node_id).first()
    if not db_node:
        return None
    for key, val in node_data.model_dump().items():
        setattr(db_node, key, val)
    db.commit()
    db.refresh(db_node)
    return db_node

def delete_org_node(db: Session, node_id: int):
    db_node = db.query(HROrgNode).filter(HROrgNode.id == node_id).first()
    if not db_node:
        return False
    # Clear assignments for this node
    db.query(HRNodeAssignment).filter(HRNodeAssignment.node_id == node_id).delete()
    # Reset children parent_id links
    db.query(HROrgNode).filter(HROrgNode.parent_id == node_id).update({"parent_id": None})
    db.delete(db_node)
    db.commit()
    return True


# --- NODE ASSIGNMENTS CONTROLLER ---
def assign_employee_to_node(db: Session, assignment: HRNodeAssignmentCreate):
    # Check if duplicate assignment
    existing = db.query(HRNodeAssignment).filter(
        and_(
            HRNodeAssignment.node_id == assignment.node_id,
            HRNodeAssignment.employee_id == assignment.employee_id
        )
    ).first()
    
    if existing:
        return existing
        
    db_ass = HRNodeAssignment(**assignment.model_dump())
    db.add(db_ass)
    db.commit()
    db.refresh(db_ass)
    return db_ass

def unassign_employee_from_node(db: Session, assignment_id: int):
    db_ass = db.query(HRNodeAssignment).filter(HRNodeAssignment.id == assignment_id).first()
    if not db_ass:
        return False
    db.delete(db_ass)
    db.commit()
    return True


# --- HIERARCHY NODES CONTROLLER ---
def auto_generate_hierarchy_nodes(db: Session):
    """
    Tự động sinh phân cấp sơ đồ cấp bậc (NS03):
    - Level 1: Ban Giám Đốc / Ban Điều Hành
    - Level 2: Trưởng Phòng / Quản Đốc
    - Level 3: Phó Phòng / Tổ Trưởng / QC Lead
    - Level 4: Chuyên Viên / QC Staff / Công Nhân
    """
    db.query(HRHierarchyNode).delete()
    db.commit()

    positions = db.query(HRPosition).all()
    pos_map = {p.name.lower(): p for p in positions} if positions else {}

    # Level 1 Node
    l1 = HRHierarchyNode(
        rank_level="Cấp 1",
        parent_id=None,
        position_id=pos_map.get("vp").id if pos_map.get("vp") else None,
        description="Ban Giám Đốc & Tổng Giám Đốc Điều Hành"
    )
    db.add(l1)
    db.commit()
    db.refresh(l1)

    # Level 2 Node
    l2 = HRHierarchyNode(
        rank_level="Cấp 2",
        parent_id=l1.id,
        position_id=pos_map.get("trưởng phòng").id if pos_map.get("trưởng phòng") else None,
        description="Quản Lý Các Phòng Ban & Quản Đốc Sản Xuất"
    )
    db.add(l2)
    db.commit()
    db.refresh(l2)

    # Level 3 Node
    l3 = HRHierarchyNode(
        rank_level="Cấp 3",
        parent_id=l2.id,
        position_id=pos_map.get("nhân viên qa").id if pos_map.get("nhân viên qa") else None,
        description="Phó Phòng, Tổ Trưởng & Trưởng Ca QC"
    )
    db.add(l3)
    db.commit()
    db.refresh(l3)

    # Level 4 Node
    l4 = HRHierarchyNode(
        rank_level="Cấp 4",
        parent_id=l3.id,
        position_id=pos_map.get("nhân viên").id if pos_map.get("nhân viên") else None,
        description="Chuyên Viên, QC Staff & Nhân Sự Sản Xuất"
    )
    db.add(l4)
    db.commit()

def get_hierarchy_nodes(db: Session):
    nodes = db.query(HRHierarchyNode).order_by(HRHierarchyNode.id.asc()).all()
    if not nodes:
        auto_generate_hierarchy_nodes(db)
        nodes = db.query(HRHierarchyNode).order_by(HRHierarchyNode.id.asc()).all()

    res = []
    for node in nodes:
        pos_name = None
        parent_rank = None
        
        if node.position_id:
            pos = db.query(HRPosition).filter(HRPosition.id == node.position_id).first()
            if pos: pos_name = pos.name
        if node.parent_id:
            parent = db.query(HRHierarchyNode).filter(HRHierarchyNode.id == node.parent_id).first()
            if parent: parent_rank = parent.rank_level
                
        res.append({
            "id": node.id,
            "rank_level": node.rank_level,
            "parent_id": node.parent_id,
            "position_id": node.position_id,
            "description": node.description,
            "created_at": node.created_at,
            "position_name": pos_name or node.description,
            "parent_rank_level": parent_rank
        })
    return res

def create_hierarchy_node(db: Session, node: HRHierarchyNodeCreate):
    db_node = HRHierarchyNode(**node.model_dump())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

def update_hierarchy_node(db: Session, node_id: int, node_data: HRHierarchyNodeCreate):
    db_node = db.query(HRHierarchyNode).filter(HRHierarchyNode.id == node_id).first()
    if not db_node:
        return None
    for key, val in node_data.model_dump().items():
        setattr(db_node, key, val)
    db.commit()
    db.refresh(db_node)
    return db_node

def delete_hierarchy_node(db: Session, node_id: int):
    db_node = db.query(HRHierarchyNode).filter(HRHierarchyNode.id == node_id).first()
    if not db_node:
        return False
    db.query(HRHierarchyNode).filter(HRHierarchyNode.parent_id == node_id).update({"parent_id": None})
    db.delete(db_node)
    db.commit()
    return True


# --- PERSONNEL NODES CONTROLLER ---
def auto_generate_personnel_nodes(db: Session):
    """
    Tự động tính toán & sinh cây phân bổ nhân sự (NS04) theo Phòng ban & Bộ phận/Tổ công đoạn
    """
    db.query(HRPersonnelNode).delete()
    db.commit()

    total_emps = db.query(HREmployee).count()
    depts = db.query(HRDepartment).all()
    sections = db.query(HRSection).filter(HRSection.name.isnot(None), HRSection.account_id.is_(None)).all()

    # Root Node
    root_node = HRPersonnelNode(
        node_name="Tổng Nhân Sự Công Ty",
        parent_id=None,
        department_id=None,
        section_id=None,
        employee_count=total_emps,
        description=f"Tổng hợp toàn bộ {total_emps} nhân sự đang làm việc"
    )
    db.add(root_node)
    db.commit()
    db.refresh(root_node)

    # Department Nodes (Level 2)
    dept_pnode_map = {}
    for dept in depts:
        d_count = db.query(HREmployee).filter(HREmployee.department_id == dept.id).count()
        d_name = dept.name or dept.description or "Bộ phận"
        if not d_name.startswith("Phòng") and not d_name.startswith("Ban") and not d_name.startswith("Khối"):
            d_name = f"Phòng {d_name}"

        node = HRPersonnelNode(
            node_name=d_name,
            parent_id=root_node.id,
            department_id=dept.id,
            section_id=None,
            employee_count=d_count,
            description=f"Quân số hiện tại: {d_count} người"
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        dept_pnode_map[dept.id] = node

    # Section Nodes (Level 3)
    for sec in sections:
        s_count = db.query(HREmployee).filter(HREmployee.section_id == sec.id).count()
        p_dept_id = sec.role_id or (list(dept_pnode_map.keys())[0] if dept_pnode_map else None)
        parent_node = dept_pnode_map.get(p_dept_id, root_node)

        node = HRPersonnelNode(
            node_name=sec.name or f"Tổ {sec.code}",
            parent_id=parent_node.id,
            department_id=p_dept_id if isinstance(p_dept_id, int) else None,
            section_id=sec.id,
            employee_count=s_count,
            description=f"Phân bổ {s_count} lao động"
        )
        db.add(node)
        db.commit()

def get_personnel_nodes(db: Session):
    nodes = db.query(HRPersonnelNode).order_by(HRPersonnelNode.id.asc()).all()
    if not nodes:
        auto_generate_personnel_nodes(db)
        nodes = db.query(HRPersonnelNode).order_by(HRPersonnelNode.id.asc()).all()

    res = []
    for node in nodes:
        dept_name = None
        sec_name = None
        parent_name = None
        
        if node.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == node.department_id).first()
            if dept: dept_name = dept.name or dept.description
        if node.section_id:
            sec = db.query(HRSection).filter(HRSection.id == node.section_id).first()
            if sec: sec_name = sec.name
        if node.parent_id:
            parent = db.query(HRPersonnelNode).filter(HRPersonnelNode.id == node.parent_id).first()
            if parent: parent_name = parent.node_name
                
        res.append({
            "id": node.id,
            "node_name": node.node_name,
            "parent_id": node.parent_id,
            "department_id": node.department_id,
            "section_id": node.section_id,
            "employee_count": node.employee_count,
            "description": node.description,
            "created_at": node.created_at,
            "department_name": dept_name,
            "section_name": sec_name,
            "parent_node_name": parent_name
        })
    return res

def create_personnel_node(db: Session, node: HRPersonnelNodeCreate):
    db_node = HRPersonnelNode(**node.model_dump())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

def update_personnel_node(db: Session, node_id: int, node_data: HRPersonnelNodeCreate):
    db_node = db.query(HRPersonnelNode).filter(HRPersonnelNode.id == node_id).first()
    if not db_node:
        return None
    for key, val in node_data.model_dump().items():
        setattr(db_node, key, val)
    db.commit()
    db.refresh(db_node)
    return db_node

def delete_personnel_node(db: Session, node_id: int):
    db_node = db.query(HRPersonnelNode).filter(HRPersonnelNode.id == node_id).first()
    if not db_node:
        return False
    db.query(HRPersonnelNode).filter(HRPersonnelNode.parent_id == node_id).update({"parent_id": None})
    db.delete(db_node)
    db.commit()
    return True


# --- FACTORY STRUCTURES CONTROLLER ---
def get_factory_structures(db: Session):
    # 1. Scan factory codes (NM\d+) from BOM details and master BOM details
    bom_stages = set()
    
    bom_details_stages = db.query(BOMDetail.input_stage, BOMDetail.output_stage).all()
    for row in bom_details_stages:
        if row[0]: bom_stages.add(row[0])
        if row[1]: bom_stages.add(row[1])
        
    master_stages = db.query(MasterBOMDetail.input_stage, MasterBOMDetail.output_stage).all()
    for row in master_stages:
        if row[0]: bom_stages.add(row[0])
        if row[1]: bom_stages.add(row[1])
        
    bom_factory_codes = set()
    for stage in bom_stages:
        match = re.search(r'(NM\d+)', stage)
        if match:
            bom_factory_codes.add(match.group(1))

    # 2. Get saved factory structures from database
    db_structures = db.query(HRFactoryStructure).all()
    mapped_codes = {s.structure_code for s in db_structures}
    
    res = []
    
    # 3. Add existing database structures
    for struct in db_structures:
        dept_name = None
        parent_name = None
        
        if struct.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == struct.department_id).first()
            if dept: dept_name = dept.name
        if struct.parent_id:
            parent = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == struct.parent_id).first()
            if parent: parent_name = parent.structure_name
                
        res.append({
            "id": struct.id,
            "structure_code": struct.structure_code,
            "structure_name": struct.structure_name,
            "structure_type": struct.structure_type,
            "parent_id": struct.parent_id,
            "department_id": struct.department_id,
            "description": struct.description,
            "created_at": struct.created_at,
            "department_name": dept_name,
            "parent_structure_name": parent_name
        })
        
    # 4. Add BOM detected codes as placeholder structure rows if not already mapped
    for code in bom_factory_codes:
        if code not in mapped_codes:
            res.append({
                "id": None,
                "structure_code": code,
                "structure_name": f"Nhà máy {code} (Chưa cấu hình)",
                "structure_type": "Nhà máy",
                "parent_id": None,
                "department_id": None,
                "description": "Tự động phát hiện từ dữ liệu BOM. Nhấn 'Sửa' để cấu hình chi tiết.",
                "created_at": None,
                "department_name": None,
                "parent_structure_name": None
            })
            
    # Sort logically by structure_code
    res.sort(key=lambda x: x["structure_code"])
    return res

def create_factory_structure(db: Session, structure: HRFactoryStructureCreate):
    db_struct = HRFactoryStructure(**structure.model_dump())
    db.add(db_struct)
    db.commit()
    db.refresh(db_struct)
    return db_struct

def update_factory_structure(db: Session, struct_id: int, struct_data: HRFactoryStructureCreate):
    db_struct = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == struct_id).first()
    if not db_struct:
        return None
    for key, val in struct_data.model_dump().items():
        setattr(db_struct, key, val)
    db.commit()
    db.refresh(db_struct)
    return db_struct

def delete_factory_structure(db: Session, struct_id: int):
    db_struct = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == struct_id).first()
    if not db_struct:
        return False
    db.query(HRFactoryStructure).filter(HRFactoryStructure.parent_id == struct_id).update({"parent_id": None})
    db.delete(db_struct)
    db.commit()
    return True

def update_department(db: Session, dept_id: int, department_data: HRDepartmentCreate):
    db_dept = db.query(HRDepartment).filter(HRDepartment.id == dept_id).first()
    if not db_dept:
        return None
    for key, val in department_data.model_dump().items():
        setattr(db_dept, key, val)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def update_position(db: Session, pos_id: int, position_data: HRPositionCreate):
    db_pos = db.query(HRPosition).filter(HRPosition.id == pos_id).first()
    if not db_pos:
        return None
    for key, val in position_data.model_dump().items():
        setattr(db_pos, key, val)
    db.commit()
    db.refresh(db_pos)
    return db_pos

def update_section(db: Session, sec_id: int, section_data: HRSectionCreate):
    db_sec = db.query(HRSection).filter(HRSection.id == sec_id).first()
    if not db_sec:
        return None
    for key, val in section_data.model_dump().items():
        setattr(db_sec, key, val)
    db.commit()
    db.refresh(db_sec)
    return db_sec

def sync_factory_structures_from_bom(db: Session):
    # 1. Scan BOM stages
    bom_stages = set()
    bom_details_stages = db.query(BOMDetail.input_stage, BOMDetail.output_stage).all()
    for row in bom_details_stages:
        if row[0]: bom_stages.add(row[0])
        if row[1]: bom_stages.add(row[1])
        
    master_stages = db.query(MasterBOMDetail.input_stage, MasterBOMDetail.output_stage).all()
    for row in master_stages:
        if row[0]: bom_stages.add(row[0])
        if row[1]: bom_stages.add(row[1])
        
    bom_factory_codes = set()
    for stage in bom_stages:
        match = re.search(r'(NM\d+)', stage)
        if match:
            bom_factory_codes.add(match.group(1))

    # 2. Get existing database codes
    db_structures = db.query(HRFactoryStructure).all()
    mapped_codes = {s.structure_code for s in db_structures}
    
    # 3. Create records for new codes
    added_count = 0
    for code in bom_factory_codes:
        if code not in mapped_codes:
            new_struct = HRFactoryStructure(
                structure_code=code,
                structure_name=f"Nhà máy {code}",
                structure_type="Nhà máy",
                parent_id=None,
                department_id=None,
                description="Đồng bộ tự động từ dữ liệu BOM"
            )
            db.add(new_struct)
            added_count += 1
            
    if added_count > 0:
        db.commit()
        
    return get_factory_structures(db)

