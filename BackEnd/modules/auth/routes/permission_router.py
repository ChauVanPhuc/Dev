from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.auth.controllers import permission_controller
from modules.production.schemas.stages import Stage as StageSchema
from modules.auth.schemas.permissions import Permission as PermissionSchema, PermissionCreate, PermissionUpdate

router = APIRouter()

@router.get("/", response_model=List[PermissionSchema])
def read_permissions(
    include_inactive: bool = False, 
    department_id: Optional[int] = None,
    role_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách tất cả các quyền hạn/vị trí (Permissions) trong hệ thống, hỗ trợ lọc theo Bộ phận và Phòng ban.
    """
    return permission_controller.get_permissions(
        db=db, 
        include_inactive=include_inactive, 
        department_id=department_id, 
        role_id=role_id
    )

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

@router.delete("/{id}")
def delete_existing_permission(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa chức vụ/quyền hạn (Permission).
    """
    deleted_perm = permission_controller.delete_permission(db, id)
    if not deleted_perm:
        raise HTTPException(status_code=404, detail="Quyền hạn không tồn tại")
    return {"message": "Đã xóa vị trí thành công"}

@router.get("/{id}/stages", response_model=List[StageSchema])
def read_permission_stages(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các công đoạn (Stages) thuộc về một quyền (Permission) cụ thể.
    
    Logic này hỗ trợ việc phân quyền truy cập theo từng bước trong quy trình sản xuất.
    """
    return permission_controller.get_stages_by_permission(db, id)
