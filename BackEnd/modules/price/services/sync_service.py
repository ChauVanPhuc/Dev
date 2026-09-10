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

def sync_temp_cabinet_prices_to_db(db: Session):
    """
    Synchronizes cabinet prices from temp JSON file to MSSQL Database.
    """
    prices = load_temp_cabinet_prices()
    if not prices:
        return 0, 0
        
    existing_prices = {p.cabinet_code: p for p in db.query(CabinetPrice).all()}
    new_count = 0
    update_count = 0
    
    for p_data in prices:
        code = p_data.get("cabinet_code")
        if not code:
            continue
            
        name = p_data.get("cabinet_name") or code
        material = p_data.get("material") or ""
        dims = p_data.get("dimensions") or ""
        base = float(p_data.get("base_price") or 0.0)
        sale = float(p_data.get("sale_price") or 0.0)
        status = p_data.get("status") or "Active"
        
        if code in existing_prices:
            db_price = existing_prices[code]
            if db_price.sale_price != sale or db_price.cabinet_name != name or db_price.material != material:
                db_price.cabinet_name = name
                db_price.material = material
                db_price.dimensions = dims
                db_price.base_price = base
                db_price.sale_price = sale
                db_price.status = status
                update_count += 1
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
            new_count += 1
            
    db.commit()
    return new_count, update_count
