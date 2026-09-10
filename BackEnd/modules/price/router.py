# -*- coding: utf-8 -*-
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.price import schemas, service, sync_service

router = APIRouter()

@router.get("/cabinet-prices", response_model=Dict[str, Any])
def read_cabinet_prices(
    page: int = 1,
    size: int = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    temp_prices = sync_service.load_temp_cabinet_prices()
    if temp_prices is not None:
        filtered = temp_prices
        if search:
            search_lower = search.lower()
            filtered = [
                p for p in temp_prices 
                if search_lower in (p.get("cabinet_code") or "").lower() or 
                   search_lower in (p.get("cabinet_name") or "").lower() or
                   search_lower in (p.get("material") or "").lower()
            ]
        total = len(filtered)
        if size and size > 0:
            skip = (page - 1) * size
            items = filtered[skip : skip + size]
        else:
            items = filtered
        return {"items": items, "total": total, "page": page, "size": size or total}

    skip = (page - 1) * (size or 50)
    items, total = service.get_cabinet_prices(db, skip=skip, limit=(size or 50), search=search)
    return {"items": items, "total": total, "page": page, "size": size or 50}

@router.post("/cabinet-prices/temp")
def save_cabinet_prices_temp(payload: Any, db: Session = Depends(get_db)):
    try:
        if isinstance(payload, dict):
            prices = payload.get("prices", [])
            filename = payload.get("filename")
            file_bytes_base64 = payload.get("file_bytes_base64")
        else:
            prices = payload
            filename = None
            file_bytes_base64 = None

        sync_service.save_temp_cabinet_prices(prices)
        sync_service.sync_temp_cabinet_prices_to_db(db)

        if len(prices) > 0 and filename and file_bytes_base64:
            try:
                import base64
                from app.core.input_archive_service import archive_input_file
                file_bytes = base64.b64decode(file_bytes_base64)
                archive_input_file("cabinet_prices", "excel", filename, file_bytes)
            except Exception as arch_err:
                sync_service.logger.warning(f"Failed to archive cabinet_prices input file: {arch_err}")

        return {"status": "success", "message": f"Đã lưu và đồng bộ thành công {len(prices)} đơn giá tủ vào CSDL."}
    except Exception as e:
        sync_service.logger.exception("Error saving temp cabinet prices:")
        raise HTTPException(status_code=500, detail=f"Lỗi lưu đơn giá tủ tạm: {str(e)}")

@router.get("/cabinet-prices/{price_id}", response_model=schemas.CabinetPriceResponse)
def read_cabinet_price(price_id: int, db: Session = Depends(get_db)):
    db_price = service.get_cabinet_price_by_id(db, price_id)
    if not db_price:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
    return db_price

@router.post("/cabinet-prices", response_model=schemas.CabinetPriceResponse, status_code=status.HTTP_201_CREATED)
def create_new_cabinet_price(price: schemas.CabinetPriceCreate, db: Session = Depends(get_db)):
    return service.create_cabinet_price(db, price)

@router.put("/cabinet-prices/{price_id}", response_model=schemas.CabinetPriceResponse)
def update_existing_cabinet_price(price_id: int, price: schemas.CabinetPriceUpdate, db: Session = Depends(get_db)):
    db_price = service.update_cabinet_price(db, price_id, price)
    if not db_price:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
    return db_price

@router.delete("/cabinet-prices/{price_id}")
def delete_existing_cabinet_price(price_id: int, db: Session = Depends(get_db)):
    db_success = service.delete_cabinet_price(db, price_id)
    temp_success = False
    try:
        temp_prices = sync_service.load_temp_cabinet_prices()
        if temp_prices:
            new_prices = [p for p in temp_prices if str(p.get("id")) != str(price_id)]
            if len(new_prices) < len(temp_prices):
                sync_service.save_temp_cabinet_prices(new_prices)
                temp_success = True
    except Exception as err:
        sync_service.logger.warning(f"Failed to delete cabinet price from temp JSON: {err}")
        
    if not db_success and not temp_success:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
        
    return {"message": "Xóa thông tin giá tủ thành công"}
