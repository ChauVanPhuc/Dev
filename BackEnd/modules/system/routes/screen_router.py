from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.models.system_component import SystemComponent as SystemComponentModel
from modules.system.schemas.system_screen import (
    SystemScreen as SystemScreenSchema, 
    SystemScreenCreate,
    SystemScreenUpdate
)
import re
import unicodedata

router = APIRouter()

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text

@router.post("", response_model=SystemScreenSchema)
async def create_screen(
    screen_in: SystemScreenCreate,
    db: Session = Depends(get_db)
):
    """
    Tao moi mot dac ta man hinh, tu dong tinh toan ma man hinh aabb.
    """
    subsystem_abbreviation = {
        "Trang chủ": "TC",
        "Quản lý hệ thống": "AD",
        "Quản lý nhân sự": "NS",
        "Quản lý sản xuất": "MA",
        "Quản lý chất lượng": "CL",
        "Quản lý kinh doanh": "KD",
        "Quản lý kỹ thuật": "KT",
        "Bảo trì - cơ sở hạ tầng": "BT"
    }

    # 1. Tinh toan prefix
    prefix = subsystem_abbreviation.get(screen_in.subsystem, "AD")
    
    # 2. Tim index cao nhat cho prefix nay
    existing = db.query(SystemScreenModel.default_code).filter(
        SystemScreenModel.default_code.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for row in existing:
        code = row[0]
        match = re.match(rf"{prefix}(\d+)", code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    next_code = f"{prefix}{max_num + 1:02d}"

    # 3. Slugify route path neu trong
    route_path = screen_in.route_path
    if not route_path:
        slug = slugify(screen_in.title)
        route_path = f"/admin/{slug}" if screen_in.platform == "Web" else f"/mobile/{slug}"
        
    # Dam bao khong trung lap route path de tranh unique constraint
    base_path = route_path
    counter = 1
    while db.query(SystemScreenModel).filter(
        SystemScreenModel.platform == screen_in.platform,
        SystemScreenModel.route_path == route_path
    ).first():
        route_path = f"{base_path}-{counter}"
        counter += 1

    # 4. Khoi tao model
    db_screen = SystemScreenModel(
        platform=screen_in.platform,
        route_path=route_path,
        default_code=next_code,
        current_code=next_code,
        title=screen_in.title,
        subtitle=screen_in.subtitle,
        status=screen_in.status or "Mới thiết kế",
        target_date=screen_in.target_date,
        is_active=True
    )
    
    db.add(db_screen)
    db.commit()
    db.refresh(db_screen)

    # 5. Khoi tao components kem theo neu co
    if screen_in.components:
        for comp in screen_in.components:
            db_comp = SystemComponentModel(
                screen_id=db_screen.id,
                name=comp.name,
                type=comp.type,
                description=comp.description,
                technical_details=comp.technical_details,
                file_path=comp.file_path,
                is_active=comp.is_active
            )
            db.add(db_comp)
        db.commit()
        db.refresh(db_screen)

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": db_screen.id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen creation: {e}")

    return db_screen

@router.delete("/{screen_id}")
async def delete_screen(
    screen_id: int,
    db: Session = Depends(get_db)
):
    """
    Xoa mot man hinh khoi co so du lieu.
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin màn hình cần xóa"
        )
        
    db.delete(db_screen)
    db.commit()

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "action": "DELETED"
        })
    except Exception as e:
        print(f"Error broadcasting screen deletion: {e}")

    return {"message": "Xóa màn hình thành công"}

@router.get("", response_model=List[SystemScreenSchema])
def get_screens(platform: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lay danh sach tat ca cac man hinh trong he thong.
    Co the loc theo 'platform' ('Web' hoac 'Mobile').
    """
    query = db.query(SystemScreenModel)
    if platform:
        query = query.filter(SystemScreenModel.platform == platform)
    return query.order_by(SystemScreenModel.id).all()

@router.get("/map")
def get_screens_map(platform: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lay danh sach duoi dang map {route_path: screen_data} de client tra cuu O(1).
    """
    query = db.query(SystemScreenModel)
    if platform:
        query = query.filter(SystemScreenModel.platform == platform)
    screens = query.all()
    
    # Tao map voi key la route_path
    screens_map = {}
    for screen in screens:
        screens_map[screen.route_path] = {
            "id": screen.id,
            "platform": screen.platform,
            "route_path": screen.route_path,
            "default_code": screen.default_code,
            "current_code": screen.current_code,
            "title": screen.title,
            "subtitle": screen.subtitle,
            "is_active": screen.is_active
        }
    return screens_map

@router.get("/{screen_id}", response_model=SystemScreenSchema)
def get_screen_detail(screen_id: int, db: Session = Depends(get_db)):
    """
    Lay thong tin chi tiet mot man hinh kem danh sach components cua no.
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Khong tim thay thong tin man hinh"
        )
    return db_screen

@router.put("/{screen_id}", response_model=SystemScreenSchema)
async def update_screen(
    screen_id: int, 
    screen_in: SystemScreenUpdate, 
    db: Session = Depends(get_db)
):
    """
    Cap nhat thong tin hien thi, ma code, hoac trang thai cua man hinh (Danh cho Admin).
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Khong tim thay thong tin man hinh can cap nhat"
        )
        
    update_data = screen_in.model_dump(exclude_unset=True)
    components_data = update_data.pop("components", None)
    
    for field, value in update_data.items():
        setattr(db_screen, field, value)
        
    db.commit()

    if components_data is not None:
        # Xoa cac components cu va thay the bang danh sach moi
        db.query(SystemComponentModel).filter(SystemComponentModel.screen_id == screen_id).delete()
        for comp in components_data:
            db_comp = SystemComponentModel(
                screen_id=screen_id,
                name=comp.get("name"),
                type=comp.get("type"),
                description=comp.get("description"),
                technical_details=comp.get("technical_details"),
                file_path=comp.get("file_path"),
                is_active=comp.get("is_active", True) if comp.get("is_active") is not None else True
            )
            db.add(db_comp)
        db.commit()
        
    db.refresh(db_screen)

    # Realtime WebSocket broadcast to all clients
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen update: {e}")

    return db_screen

@router.post("/{screen_id}/reset", response_model=SystemScreenSchema)
async def reset_screen_code(screen_id: int, db: Session = Depends(get_db)):
    """
    Reset ma man hinh hien tai (current_code) ve ma mac dinh ban dau (default_code).
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Khong tim thay thong tin man hinh"
        )
        
    db_screen.current_code = db_screen.default_code
    db.commit()
    db.refresh(db_screen)

    # Realtime WebSocket broadcast to all clients
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen reset: {e}")

    return db_screen

