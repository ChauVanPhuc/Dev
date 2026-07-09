from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.auth.controllers import permission_controller
from modules.production.schemas.stages import Stage as StageSchema
from modules.auth.schemas.permissions import Permission as PermissionSchema, PermissionCreate, PermissionUpdate

router = APIRouter()

@router.get("/", response_model=List[PermissionSchema])
def read_permissions(include_inactive: bool = False, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các quyền hạn (Permissions) trong hệ thống.
    """
    return permission_controller.get_permissions(db, include_inactive)

@router.post("/", response_model=PermissionSchema)
def create_new_permission(permission_data: PermissionCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một chức vụ/quyền hạn (Permission).
    """
    return permission_controller.create_permission(db, permission_data)

@router.put("/{id}", response_model=PermissionSchema)
def update_existing_permission(id: int, permission_data: PermissionUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin chức vụ/quyền hạn (Permission).
    """
    updated_perm = permission_controller.update_permission(db, id, permission_data)
    if not updated_perm:
        raise HTTPException(status_code=404, detail="Quyền hạn không tồn tại")
    return updated_perm

@router.delete("/{id}", response_model=PermissionSchema)
def delete_existing_permission(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Dừng hoạt động (soft-delete) chức vụ/quyền hạn (Permission).
    """
    deleted_perm = permission_controller.delete_permission(db, id)
    if not deleted_perm:
        raise HTTPException(status_code=404, detail="Quyền hạn không tồn tại")
    return deleted_perm

@router.get("/{id}/stages", response_model=List[StageSchema])
def read_permission_stages(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các công đoạn (Stages) thuộc về một quyền (Permission) cụ thể.
    
    Logic này hỗ trợ việc phân quyền truy cập theo từng bước trong quy trình sản xuất.
    """
    return permission_controller.get_stages_by_permission(db, id)
