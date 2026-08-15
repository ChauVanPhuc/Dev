from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from modules.auth.models.permissions import Permission
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.production.models.stages import Stage
from modules.auth.schemas.permissions import PermissionCreate, PermissionUpdate

def get_permissions(
    db: Session, 
    include_inactive: bool = False,
    department_id: Optional[int] = None,
    role_id: Optional[int] = None
):
    """
    Lấy danh sách tất cả các chức vụ/quyền hạn (Permissions) kèm theo thông tin Bộ phận và Phòng ban.
    """
    query = db.query(Permission).options(
        joinedload(Permission.stages),
        joinedload(Permission.roles)
    )
    if not include_inactive:
        query = query.filter(Permission.is_active == True)
        
    if department_id is not None:
        query = query.filter(Permission.department_id == department_id)
        
    perms = query.all()
    
    # Caching department and role lookups
    dept_map = {d.id: d for d in db.query(Department).all()}
    role_map = {r.id: r for r in db.query(Role).all()}
    
    result = []
    for p in perms:
        # Resolve department & role
        p_dept = dept_map.get(p.department_id) if p.department_id else None
        p_dept_name = p_dept.name if p_dept else None
        p_role_id = p_dept.role_id if p_dept else (p.roles[0].id if (p.roles and len(p.roles) > 0) else None)
        p_role = role_map.get(p_role_id) if p_role_id else None
        p_role_name = (p_role.name or p_role.description) if p_role else None
        
        # Nếu có lọc theo role_id mà vị trí không khớp role_id thì bỏ qua
        if role_id is not None and p_role_id != role_id:
            continue
            
        p.department_name = p_dept_name
        p.role_id = p_role_id
        p.role_name = p_role_name
        result.append(p)
        
    return result

def get_stages_by_permission(db: Session, permission_id: int):
    """
    Lấy danh sách các công đoạn (Stage) mà một quyền hạn (Permission) cụ thể được phép truy cập.
    """
    permission = db.query(Permission).options(joinedload(Permission.stages)).filter(Permission.id == permission_id).first()
    if permission:
        return permission.stages
    return []

def create_permission(db: Session, permission_data: PermissionCreate):
    """
    Tạo mới một Chức vụ/Quyền hạn (Permission).
    """
    db_perm = Permission(
        name=permission_data.name,
        description=permission_data.description,
        is_active=permission_data.is_active if permission_data.is_active is not None else True,
        default_permissions=permission_data.default_permissions,
        department_id=permission_data.department_id
    )
    
    # Tự động gán tất cả công đoạn sản xuất cho các chức vụ khác Admin và Giám đốc
    if permission_data.name not in ["Admin", "Giám đốc"]:
        all_stages = db.query(Stage).all()
        db_perm.stages = all_stages
    elif permission_data.stage_ids:
        stages = db.query(Stage).filter(Stage.id.in_(permission_data.stage_ids)).all()
        db_perm.stages = stages
        
    # Gán vai trò / phòng ban
    target_role_ids = list(permission_data.role_ids or [])
    if permission_data.role_id and permission_data.role_id not in target_role_ids:
        target_role_ids.append(permission_data.role_id)
        
    if permission_data.department_id:
        dept = db.query(Department).filter(Department.id == permission_data.department_id).first()
        if dept and dept.role_id and dept.role_id not in target_role_ids:
            target_role_ids.append(dept.role_id)
            
    if target_role_ids:
        roles = db.query(Role).filter(Role.id.in_(target_role_ids)).all()
        db_perm.roles = roles
        
    db.add(db_perm)
    db.commit()
    db.refresh(db_perm)
    
    # Resolve names for output
    p_dept = db.query(Department).filter(Department.id == db_perm.department_id).first() if db_perm.department_id else None
    db_perm.department_name = p_dept.name if p_dept else None
    db_perm.role_id = p_dept.role_id if p_dept else (db_perm.roles[0].id if (db_perm.roles and len(db_perm.roles) > 0) else None)
    if db_perm.role_id:
        role = db.query(Role).filter(Role.id == db_perm.role_id).first()
        db_perm.role_name = (role.name or role.description) if role else None
                
    return db_perm

def update_permission(db: Session, permission_id: int, permission_data: PermissionUpdate):
    """
    Cập nhật thông tin Chức vụ/Quyền hạn (Permission).
    """
    db_perm = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_perm:
        return None
        
    if permission_data.name is not None:
        db_perm.name = permission_data.name
    if permission_data.description is not None:
        db_perm.description = permission_data.description
    if permission_data.is_active is not None:
        db_perm.is_active = permission_data.is_active
    if permission_data.default_permissions is not None:
        db_perm.default_permissions = permission_data.default_permissions
    if permission_data.department_id is not None:
        db_perm.department_id = permission_data.department_id
        
    if permission_data.stage_ids is not None:
        stages = db.query(Stage).filter(Stage.id.in_(permission_data.stage_ids)).all()
        db_perm.stages = stages
        
    target_role_ids = None
    if permission_data.role_ids is not None:
        target_role_ids = list(permission_data.role_ids)
    elif permission_data.role_id is not None:
        target_role_ids = [permission_data.role_id]
        
    if permission_data.department_id:
        dept = db.query(Department).filter(Department.id == permission_data.department_id).first()
        if dept and dept.role_id:
            if target_role_ids is None:
                target_role_ids = [dept.role_id]
            elif dept.role_id not in target_role_ids:
                target_role_ids.append(dept.role_id)
                
    if target_role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(target_role_ids)).all()
        db_perm.roles = roles
        
    db.commit()
    db.refresh(db_perm)
    
    # Resolve names for output
    p_dept = db.query(Department).filter(Department.id == db_perm.department_id).first() if db_perm.department_id else None
    db_perm.department_name = p_dept.name if p_dept else None
    db_perm.role_id = p_dept.role_id if p_dept else (db_perm.roles[0].id if (db_perm.roles and len(db_perm.roles) > 0) else None)
    if db_perm.role_id:
        role = db.query(Role).filter(Role.id == db_perm.role_id).first()
        db_perm.role_name = (role.name or role.description) if role else None
                
    return db_perm

def delete_permission(db: Session, permission_id: int):
    """
    Xóa hoàn toàn Chức vụ/Vị trí (Permission) khỏi hệ thống và dọn dẹp các liên kết liên quan.
    """
    db_perm = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_perm:
        return None
        
    try:
        from modules.auth.models.employees import Employee
        db.query(Employee).filter(Employee.permission_id == permission_id).update({"permission_id": None})
    except Exception:
        pass
        
    try:
        from modules.auth.models.accounts import Account
        db.query(Account).filter(Account.permission_id == permission_id).update({"permission_id": None})
    except Exception:
        pass
        
    try:
        from modules.hr.models.hr_models import HREmployee, HROrgNode, HRHierarchyNode
        db.query(HREmployee).filter(HREmployee.position_id == permission_id).update({"position_id": None})
        db.query(HROrgNode).filter(HROrgNode.position_id == permission_id).update({"position_id": None})
        db.query(HRHierarchyNode).filter(HRHierarchyNode.position_id == permission_id).update({"position_id": None})
    except Exception:
        pass
        
    try:
        from modules.auth.models.org_structures import OrgStructure
        db.query(OrgStructure).filter(OrgStructure.permission_id == permission_id).update({"permission_id": None})
    except Exception:
        pass

    # Clear many-to-many associations
    db_perm.stages = []
    db_perm.roles = []
    
    db.delete(db_perm)
    db.commit()
    return True
