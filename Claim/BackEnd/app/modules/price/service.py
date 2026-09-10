# -*- coding: utf-8 -*-
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modules.price.models import CabinetPrice
from app.modules.price.schemas import CabinetPriceCreate, CabinetPriceUpdate

def get_cabinet_prices(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(CabinetPrice)
    if search:
        query = query.filter(
            or_(
                CabinetPrice.cabinet_code.like(f"%{search}%"),
                CabinetPrice.cabinet_name.like(f"%{search}%"),
                CabinetPrice.material.like(f"%{search}%")
            )
        )
    total = query.count()
    items = query.order_by(CabinetPrice.cabinet_code).offset(skip).limit(limit).all()
    return items, total

def get_cabinet_price_by_id(db: Session, price_id: int):
    return db.query(CabinetPrice).filter(CabinetPrice.id == price_id).first()

def create_cabinet_price(db: Session, price: CabinetPriceCreate):
    db_price = CabinetPrice(
        cabinet_code=price.cabinet_code,
        cabinet_name=price.cabinet_name,
        material=price.material or "",
        dimensions=price.dimensions or "",
        base_price=price.base_price,
        sale_price=price.sale_price,
        status=price.status or "Active"
    )
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

def update_cabinet_price(db: Session, price_id: int, price_data: CabinetPriceUpdate):
    db_price = get_cabinet_price_by_id(db, price_id)
    if not db_price:
        return None
    
    update_dict = price_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is None and key in ["material", "dimensions"]:
            value = ""
        setattr(db_price, key, value)
        
    db.commit()
    db.refresh(db_price)
    return db_price

def clean_price_input_archives_if_empty(db: Session):
    try:
        if db.query(CabinetPrice).count() == 0:
            from app.core.path_manager import CABINET_PRICES_INPUT_EXCEL, CABINET_PRICES_INPUT_PDF
            for dir_path in [CABINET_PRICES_INPUT_EXCEL, CABINET_PRICES_INPUT_PDF]:
                if dir_path.exists():
                    for f in dir_path.iterdir():
                        if f.is_file():
                            try:
                                f.unlink()
                            except Exception:
                                pass
    except Exception as e:
        logger.error(f"Error cleaning price input archives: {e}")

def delete_cabinet_price(db: Session, price_id: int):
    db_price = get_cabinet_price_by_id(db, price_id)
    if not db_price:
        return False
    db.delete(db_price)
    db.commit()
    clean_price_input_archives_if_empty(db)
    return True
