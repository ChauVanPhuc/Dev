from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.production.schemas.product import Product, ProductCreate, ProductUpdate
from modules.production.controllers import product_controller

router = APIRouter()

import time
import threading
from functools import wraps

class SWRCache:
    def __init__(self, ttl=5.0):
        self.ttl = ttl
        self.cache = {}
        self.lock = threading.Lock()

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_args = []
            for arg in args:
                if not hasattr(arg, 'execute') and not hasattr(arg, 'commit'):
                    cache_args.append(arg)
            cache_kwargs = {}
            for k, v in kwargs.items():
                if k not in ('db', 'background_tasks') and not hasattr(v, 'execute') and not hasattr(v, 'commit'):
                    cache_kwargs[k] = v
            key = (func.__name__, tuple(cache_args), frozenset(cache_kwargs.items()))
            
            current_time = time.time()
            if key in self.cache:
                cached_time, cached_data, is_updating = self.cache[key]
                if current_time - cached_time < self.ttl:
                    return cached_data
                if is_updating:
                    return cached_data
                with self.lock:
                    cached_time, cached_data, is_updating = self.cache.get(key, (0, None, False))
                    if is_updating:
                        return cached_data
                    self.cache[key] = (cached_time, cached_data, True)
                try:
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
                except Exception as e:
                    self.cache[key] = (cached_time, cached_data, False)
                    return cached_data
            else:
                with self.lock:
                    if key in self.cache:
                        return self.cache[key][1]
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
        return wrapper

    def clear(self):
        with self.lock:
            self.cache.clear()

_products_swr_cache = SWRCache(ttl=5.0)

@router.get("/", response_model=List[Product])
@_products_swr_cache
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các sản phẩm thực tế (đã phân rã từ Master hoặc tạo thủ công).
    """
    products = product_controller.get_products(db, skip=skip, limit=limit)
    return products

@router.post("/", response_model=Product)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo một sản phẩm thực tế mới (thường dùng cho các đơn hàng phi tiêu chuẩn).
    """
    res = product_controller.create_product(db=db, product=product)
    _products_swr_cache.clear()
    return res

@router.get("/{product_id}", response_model=Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết thông tin một sản phẩm bao gồm các Elements đi kèm.
    """
    db_product = product_controller.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return db_product

@router.put("/{product_id}", response_model=Product)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin sản phẩm và cấu trúc Elements.
    """
    res = product_controller.update_product(db=db, product_id=product_id, product=product)
    _products_swr_cache.clear()
    return res

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa sản phẩm khỏi hệ thống.
    """
    success = product_controller.delete_product(db, product_id=product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm để xóa")
    _products_swr_cache.clear()
    return {"message": "Đã xóa sản phẩm thành công"}
