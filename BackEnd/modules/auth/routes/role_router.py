from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.auth.controllers import role_controller
from modules.auth.schemas.role import Role as RoleSchema
from modules.auth.schemas.permissions import Permission as PermissionSchema

router = APIRouter()

@router.get("/", response_model=List[RoleSchema])
def read_roles(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các vai trò (Roles) trong hệ thống.
    """
    return role_controller.get_roles(db)

@router.get("/{id}/permissions", response_model=List[PermissionSchema])
def read_role_permissions(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các quyền (Permissions) được gán cho một vai trò cụ thể.
    
    Args:
        id: ID của vai trò.
    """
    perms = role_controller.get_permissions_by_role(db, id)
    if not perms and id > 0:
        # Trường hợp vai trò tồn tại nhưng chưa được cấu hình quyền.
        pass 
    return perms
