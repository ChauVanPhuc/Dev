from sqlalchemy.orm import Session, joinedload
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.auth.schemas.role import RoleCreate, RoleUpdate

def get_roles(db: Session, include_inactive: bool = False):
    """
    Lấy danh sách tất cả các vai trò (Roles) hiện có trong hệ thống.
    Eager load các permissions và stages tương ứng.
    """
    query = db.query(Role).options(
        joinedload(Role.permissions).joinedload(Permission.stages)
    )
    if not include_inactive:
        query = query.filter(Role.is_active == True)
    return query.all()

def get_permissions_by_role(db: Session, role_id: int):
    """
    Lấy danh sách các quyền hạn (Permissions) được gán cho một vai trò cụ thể.
    """
    role = db.query(Role).options(
        joinedload(Role.permissions).joinedload(Permission.stages)
    ).filter(Role.id == role_id).first()
    if role:
        return role.permissions
    return []

def create_role(db: Session, role_data: RoleCreate):
    """
    Tạo mới một Vai trò (Role/Bộ phận).
    """
    db_role = Role(
        name=role_data.name,
        description=role_data.description,
        is_active=role_data.is_active,
        default_permissions=role_data.default_permissions
    )
    if role_data.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_data.permission_ids)).all()
        db_role.permissions = perms
        
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_role(db: Session, role_id: int, role_data: RoleUpdate):
    """
    Cập nhật thông tin Vai trò.
    """
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        return None
        
    if role_data.name is not None:
        db_role.name = role_data.name
    if role_data.description is not None:
        db_role.description = role_data.description
    if role_data.is_active is not None:
        db_role.is_active = role_data.is_active
    if role_data.default_permissions is not None:
        db_role.default_permissions = role_data.default_permissions
        
    if role_data.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_data.permission_ids)).all()
        db_role.permissions = perms
        
    db.commit()
    db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int):
    """
    Dừng sử dụng (soft delete) Vai trò.
    """
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        return None
        
    db_role.is_active = False
    db.commit()
    db.refresh(db_role)
    return db_role
