from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.schemas.system_screen import SystemScreen as SystemScreenSchema, SystemScreenUpdate

router = APIRouter()

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
def update_screen(
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
    for field, value in update_data.items():
        setattr(db_screen, field, value)
        
    db.commit()
    db.refresh(db_screen)
    return db_screen

@router.post("/{screen_id}/reset", response_model=SystemScreenSchema)
def reset_screen_code(screen_id: int, db: Session = Depends(get_db)):
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
    return db_screen

