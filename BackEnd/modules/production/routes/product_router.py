from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.production.schemas.product import Product, ProductCreate, ProductUpdate
from modules.production.controllers import product_controller

router = APIRouter()

@router.get("/", response_model=List[Product])
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
    return product_controller.create_product(db=db, product=product)

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
    return product_controller.update_product(db=db, product_id=product_id, product=product)

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa sản phẩm khỏi hệ thống.
    """
    success = product_controller.delete_product(db, product_id=product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm để xóa")
    return {"message": "Đã xóa sản phẩm thành công"}
