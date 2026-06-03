from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from modules.delivery.models.pallet_card import PalletCard as PalletCardModel
from modules.delivery.schemas.pallet_card import PalletCard, PalletCardCreate, PalletCardListResponse
from typing import List

router = APIRouter()

@router.post("/", response_model=PalletCard)
def save_pallet_card(data: PalletCardCreate, db: Session = Depends(get_db)):
    """
    [POST] Lưu hoặc cập nhật thông tin Thẻ Pallet.
    Nếu mã pallet_code đã tồn tại, sẽ cập nhật dữ liệu mới.
    """
    db_item = db.query(PalletCardModel).filter(PalletCardModel.pallet_code == data.pallet_code).first()
    
    if db_item:
        # Cập nhật thông tin hiện có
        for key, value in data.dict().items():
            setattr(db_item, key, value)
    else:
        # Tạo mới
        db_item = PalletCardModel(**data.dict())
        db.add(db_item)
    
    try:
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu Database: {str(e)}")
        
    return db_item

@router.get("/{pallet_code}", response_model=PalletCard)
def get_pallet_card(pallet_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin Thẻ Pallet theo mã.
    """
    db_item = db.query(PalletCardModel).filter(PalletCardModel.pallet_code == pallet_code).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy Thẻ Pallet")
    return db_item

@router.get("/", response_model=PalletCardListResponse)
def list_pallet_cards(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách Thẻ Pallet.
    """
    query = db.query(PalletCardModel).filter(PalletCardModel.status == 1)
    total = query.count()
    items = query.order_by(PalletCardModel.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}
