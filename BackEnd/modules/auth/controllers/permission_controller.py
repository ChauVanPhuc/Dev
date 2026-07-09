from sqlalchemy.orm import Session, joinedload
from modules.auth.models.permissions import Permission
from modules.auth.models.role import Role
from modules.production.models.stages import Stage
from modules.auth.schemas.permissions import PermissionCreate, PermissionUpdate

def get_permissions(db: Session, include_inactive: bool = False):
    """
    Lấy danh sách tất cả các quyền hạn (Permissions) kèm theo danh sách công đoạn và bộ phận.
    """
    query = db.query(Permission).options(
        joinedload(Permission.stages),
        joinedload(Permission.roles)
    )
    if not include_inactive:
        query = query.filter(Permission.is_active == True)
    return query.all()

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
        is_active=permission_data.is_active,
        default_permissions=permission_data.default_permissions
    )
    
    # Tự động gán tất cả công đoạn sản xuất cho các chức vụ khác Admin và Giám đốc
    if permission_data.name not in ["Admin", "Giám đốc"]:
        all_stages = db.query(Stage).all()
        db_perm.stages = all_stages
    elif permission_data.stage_ids:
        stages = db.query(Stage).filter(Stage.id.in_(permission_data.stage_ids)).all()
        db_perm.stages = stages
        
    # Gán bộ phận nếu có truyền vào
    if permission_data.role_ids:
        roles = db.query(Role).filter(Role.id.in_(permission_data.role_ids)).all()
        db_perm.roles = roles
        
    db.add(db_perm)
    db.commit()
    db.refresh(db_perm)
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
        
    if permission_data.stage_ids is not None:
        stages = db.query(Stage).filter(Stage.id.in_(permission_data.stage_ids)).all()
        db_perm.stages = stages
        
    if permission_data.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(permission_data.role_ids)).all()
        db_perm.roles = roles
        
    db.commit()
    db.refresh(db_perm)
    return db_perm

def delete_permission(db: Session, permission_id: int):
    """
    Dừng sử dụng (soft delete) Chức vụ/Quyền hạn (Permission).
    """
    db_perm = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_perm:
        return None
        
    db_perm.is_active = False
    db.commit()
    db.refresh(db_perm)
    return db_perm
