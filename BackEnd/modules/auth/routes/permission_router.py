from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.auth.controllers import permission_controller
from modules.production.schemas.stages import Stage as StageSchema
from modules.auth.schemas.permissions import Permission as PermissionSchema

router = APIRouter()

@router.get("/", response_model=List[PermissionSchema])
def read_permissions(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các quyền hạn (Permissions) trong hệ thống.
    """
    return permission_controller.get_permissions(db)

@router.get("/{id}/stages", response_model=List[StageSchema])
def read_permission_stages(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các công đoạn (Stages) thuộc về một quyền (Permission) cụ thể.
    
    Logic này hỗ trợ việc phân quyền truy cập theo từng bước trong quy trình sản xuất.
    """
    return permission_controller.get_stages_by_permission(db, id)
