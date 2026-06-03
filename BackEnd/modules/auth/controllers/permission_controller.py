from sqlalchemy.orm import Session, joinedload
from modules.auth.models.permissions import Permission

def get_permissions(db: Session):
    """
    Lấy danh sách tất cả các quyền hạn (Permissions) kèm theo danh sách công đoạn.
    """
    return db.query(Permission).options(joinedload(Permission.stages)).all()

def get_stages_by_permission(db: Session, permission_id: int):
    """
    Lấy danh sách các công đoạn (Stage) mà một quyền hạn (Permission) cụ thể được phép truy cập.
    """
    permission = db.query(Permission).options(joinedload(Permission.stages)).filter(Permission.id == permission_id).first()
    if permission:
        return permission.stages
    return []
