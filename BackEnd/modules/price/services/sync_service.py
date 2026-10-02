# -*- coding: utf-8 -*-
import os
import json
import logging
from sqlalchemy.orm import Session
from modules.price.models import CabinetPrice

logger = logging.getLogger("price_sync")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
TEMP_PRICES_FILE = os.path.join(DATA_DIR, "temp_cabinet_prices.json")

def save_temp_cabinet_prices(prices: list):
    """
    Saves imported/modified cabinet prices to temp_cabinet_prices.json inside data directory.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(TEMP_PRICES_FILE, "w", encoding="utf-8") as f:
        json.dump(prices, f, ensure_ascii=False, indent=2)
    return {"message": "Dữ liệu giá tủ gỗ tạm thời đã được lưu thành công."}

def load_temp_cabinet_prices():
    """
    Loads cabinet prices from temp_cabinet_prices.json if it exists.
    """
    if os.path.exists(TEMP_PRICES_FILE):
        try:
            with open(TEMP_PRICES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading temp_cabinet_prices.json: {e}")
    return None

def get_cabinet_prices_map(db: Session = None) -> dict:
    cabinet_prices_map = {}
    
    # 1. Load from DB if db is provided
    if db:
        try:
            prices = db.query(CabinetPrice).all()
            for p in prices:
                if p.cabinet_code:
                    cabinet_prices_map[p.cabinet_code.strip().lower()] = p.sale_price or 0.0
        except Exception as e:
            logger.warning(f"Error querying cabinet prices from DB in get_cabinet_prices_map: {e}")
            
    # 2. Merge/fallback with temp JSON prices
    try:
        temp_prices = load_temp_cabinet_prices()
        if temp_prices:
            for p in temp_prices:
                code = p.get("cabinet_code")
                sale = p.get("sale_price")
                if code and sale is not None:
                    clean_code = str(code).strip().lower()
                    if clean_code not in cabinet_prices_map:
                        cabinet_prices_map[clean_code] = float(sale)
    except Exception as e:
        logger.warning(f"Error loading temp cabinet prices in get_cabinet_prices_map: {e}")
        
    return cabinet_prices_map

def sync_temp_cabinet_prices_to_db(db: Session, prices: list = None):
    """
    Synchronizes cabinet prices to MSSQL Database with robust deduplication and upsert.
    """
    if prices is None:
        prices = load_temp_cabinet_prices()
    if not prices:
        return 0, 0
        
    existing_prices = {str(p.cabinet_code).strip().upper(): p for p in db.query(CabinetPrice).all() if p.cabinet_code}
    seen_in_batch = {}
    new_count = 0
    update_count = 0
    
    for p_data in prices:
        code_raw = p_data.get("cabinet_code")
        if not code_raw:
            continue
            
        code = str(code_raw).strip()[:50]
        code_upper = code.upper()
        name = str(p_data.get("cabinet_name") or code).strip()[:150]
        material = str(p_data.get("material") or "").strip()[:100]
        dims = str(p_data.get("dimensions") or "").strip()[:50]
        
        try:
            base = float(p_data.get("base_price") or 0.0)
        except (ValueError, TypeError):
            base = 0.0
            
        try:
            sale = round(float(p_data.get("sale_price") or 0.0), 2)
        except (ValueError, TypeError):
            sale = 0.0
            
        status = str(p_data.get("status") or "Active").strip()[:50]
        
        if code_upper in existing_prices:
            db_price = existing_prices[code_upper]
            db_price.cabinet_name = name
            db_price.material = material
            db_price.dimensions = dims
            db_price.base_price = base
            db_price.sale_price = sale
            db_price.status = status
            update_count += 1
        elif code_upper in seen_in_batch:
            pending_price = seen_in_batch[code_upper]
            pending_price.cabinet_name = name
            pending_price.material = material
            pending_price.dimensions = dims
            pending_price.base_price = base
            pending_price.sale_price = sale
            pending_price.status = status
        else:
            db_price = CabinetPrice(
                cabinet_code=code,
                cabinet_name=name,
                material=material,
                dimensions=dims,
                base_price=base,
                sale_price=sale,
                status=status
            )
            db.add(db_price)
            existing_prices[code_upper] = db_price
            seen_in_batch[code_upper] = db_price
            new_count += 1
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception(f"Error committing cabinet prices to database: {e}")
        raise e
        
    return new_count, update_count
