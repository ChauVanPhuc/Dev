from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.auth.controllers import role_controller
from modules.auth.schemas.role import Role as RoleSchema, RoleCreate, RoleUpdate
from modules.auth.schemas.permissions import Permission as PermissionSchema

router = APIRouter()

@router.get("/", response_model=List[RoleSchema])
def read_roles(include_inactive: bool = False, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các vai trò (Roles) trong hệ thống.
    """
    return role_controller.get_roles(db, include_inactive)

@router.post("/", response_model=RoleSchema)
def create_new_role(role_data: RoleCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một bộ phận/vai trò (Role).
    """
    return role_controller.create_role(db, role_data)

@router.put("/{id}", response_model=RoleSchema)
def update_existing_role(id: int, role_data: RoleUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin bộ phận/vai trò (Role).
    """
    updated_role = role_controller.update_role(db, id, role_data)
    if not updated_role:
        raise HTTPException(status_code=404, detail="Vai trò không tồn tại")
    return updated_role

@router.delete("/{id}", response_model=RoleSchema)
def delete_existing_role(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Dừng hoạt động (soft-delete) bộ phận/vai trò (Role).
    """
    deleted_role = role_controller.delete_role(db, id)
    if not deleted_role:
        raise HTTPException(status_code=404, detail="Vai trò không tồn tại")
    return deleted_role

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
