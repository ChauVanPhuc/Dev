# -*- coding: utf-8 -*-
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
        query = query.filter(
            or_(
                HRDepartment.name.ilike(f"%{search}%"),
                HRDepartment.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(HRDepartment.code.asc()).all()

def create_department(db: Session, department: HRDepartmentCreate):
    db_dept = HRDepartment(**department.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def delete_department(db: Session, dept_id: int):
    db_dept = db.query(HRDepartment).filter(HRDepartment.id == dept_id).first()
    if not db_dept:
        return False
    # Clear employee links
    db.query(HREmployee).filter(HREmployee.department_id == dept_id).update({"department_id": None})
    db.query(HROrgNode).filter(HROrgNode.department_id == dept_id).update({"department_id": None})
    db.delete(db_dept)
    db.commit()
    return True


# --- POSITIONS CONTROLLER ---
def get_positions(db: Session, search: str = None):
    query = db.query(HRPosition)
    if search:
        query = query.filter(
            or_(
                HRPosition.name.ilike(f"%{search}%"),
                HRPosition.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(HRPosition.code.asc()).all()

def create_position(db: Session, position: HRPositionCreate):
    db_pos = HRPosition(**position.model_dump())
    db.add(db_pos)
    db.commit()
    db.refresh(db_pos)
    return db_pos

def delete_position(db: Session, pos_id: int):
    db_pos = db.query(HRPosition).filter(HRPosition.id == pos_id).first()
    if not db_pos:
        return False
    # Clear employee links
    db.query(HREmployee).filter(HREmployee.position_id == pos_id).update({"position_id": None})
    db.query(HROrgNode).filter(HROrgNode.position_id == pos_id).update({"position_id": None})
    db.delete(db_pos)
    db.commit()
    return True


# --- SECTIONS CONTROLLER ---
def get_sections(db: Session, search: str = None):
    query = db.query(HRSection)
    if search:
        query = query.filter(
            or_(
                HRSection.name.ilike(f"%{search}%"),
                HRSection.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(HRSection.code.asc()).all()

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
def get_org_nodes(db: Session):
    nodes = db.query(HROrgNode).order_by(HROrgNode.id.asc()).all()
    res = []
    for node in nodes:
        dept_name = None
        pos_name = None
        sec_name = None
        parent_level = None
        
        if node.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == node.department_id).first()
            if dept: dept_name = dept.name
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
            "position_name": pos_name,
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
def get_hierarchy_nodes(db: Session):
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
            "position_name": pos_name,
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
def get_personnel_nodes(db: Session):
    nodes = db.query(HRPersonnelNode).order_by(HRPersonnelNode.id.asc()).all()
    res = []
    for node in nodes:
        dept_name = None
        sec_name = None
        parent_name = None
        
        if node.department_id:
            dept = db.query(HRDepartment).filter(HRDepartment.id == node.department_id).first()
            if dept: dept_name = dept.name
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
    structures = db.query(HRFactoryStructure).order_by(HRFactoryStructure.id.asc()).all()
    res = []
    for struct in structures:
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
