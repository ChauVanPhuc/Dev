from sqlalchemy.orm import Session, joinedload
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission

def get_roles(db: Session):
    """
    Lấy danh sách tất cả các vai trò (Roles) hiện có trong hệ thống.
    Eager load các permissions và stages tương ứng.
    """
    return db.query(Role).options(
        joinedload(Role.permissions).joinedload(Permission.stages)
    ).all()

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
