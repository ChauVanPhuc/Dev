from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from config.database import get_db
from modules.system.models.system_sidebar import SystemSidebar
from modules.system.schemas.system_sidebar_schemas import (
    SidebarCreate,
    SidebarUpdate,
    SidebarResponse,
    SidebarReorderRequest
)
from modules.system.routes.screen_router import get_current_user
from modules.auth.models.accounts import Account as AccountModel

router = APIRouter()

@router.get("", response_model=List[SidebarResponse])
def get_sidebar(
    platform: str = "Web",
    db: Session = Depends(get_db)
):
    """
    Lấy danh mục menu dạng cây (hierarchy) cho Web hoặc Mobile.
    Chỉ lấy các menu đang kích hoạt (is_active = True).
    """
    # Lấy các menu gốc (không có parent_id) và eager load children
    menus = (
        db.query(SystemSidebar)
        .filter(
            SystemSidebar.platform == platform,
            SystemSidebar.parent_id == None,
            SystemSidebar.is_active == True
        )
        .options(joinedload(SystemSidebar.children))
        .order_by(SystemSidebar.sort_order.asc())
        .all()
    )
    
    # Lọc đệ quy các children đang active
    def filter_active_children(menu_item):
        menu_item.children = [
            child for child in menu_item.children 
            if child.is_active
        ]
        for child in menu_item.children:
            filter_active_children(child)
            
    for menu in menus:
        filter_active_children(menu)
        
    return menus

@router.get("/all", response_model=List[SidebarResponse])
def get_all_sidebar(
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Lấy toàn bộ danh mục menu phục vụ giao diện quản trị (Admin).
    Lấy cả menu active và inactive.
    """
    # Cho phép tất cả các tài khoản đã đăng nhập đọc danh mục sidebar phục vụ hiển thị phân quyền
    pass

    # Lấy các menu gốc của cả 2 nền tảng
    menus = (
        db.query(SystemSidebar)
        .filter(SystemSidebar.parent_id == None)
        .options(joinedload(SystemSidebar.children))
        .order_by(SystemSidebar.platform.desc(), SystemSidebar.sort_order.asc())
        .all()
    )
    return menus

@router.post("", response_model=SidebarResponse)
def create_sidebar_item(
    item_in: SidebarCreate,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Tạo một mục menu mới.
    """
    # Tạo đối tượng mới
    item = SystemSidebar(
        platform=item_in.platform,
        parent_id=item_in.parent_id,
        title=item_in.title,
        route_path=item_in.route_path,
        icon=item_in.icon,
        sort_order=item_in.sort_order,
        is_active=item_in.is_active,
        permission_key=item_in.permission_key,
        screen_id=item_in.screen_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/reorder")
def reorder_sidebar_items(
    request: SidebarReorderRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Sắp xếp lại thứ tự các mục menu hàng loạt.
    """
    for item_data in request.items:
        db.query(SystemSidebar).filter(SystemSidebar.id == item_data.id).update({
            "parent_id": item_data.parent_id,
            "sort_order": item_data.sort_order
        })
    db.commit()
    return {"message": "Sắp xếp lại menu thành công."}

@router.put("/{id}", response_model=SidebarResponse)
def update_sidebar_item(
    id: int,
    item_in: SidebarUpdate,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Cập nhật thông tin chi tiết một mục menu.
    """
    item = db.query(SystemSidebar).filter(SystemSidebar.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mục menu."
        )
        
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{id}")
def delete_sidebar_item(
    id: int,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Xóa một mục menu.
    """
    item = db.query(SystemSidebar).filter(SystemSidebar.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mục menu."
        )
        
    db.delete(item)
    db.commit()
    return {"message": f"Đã xóa thành công mục menu '{item.title}'"}
