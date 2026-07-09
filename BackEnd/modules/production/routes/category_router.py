from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.production.schemas.category import Category, CategoryCreate, CategoryUpdate
from modules.production.controllers import category_controller

router = APIRouter()

@router.get("/", response_model=List[Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các danh mục sản phẩm.
    
    Args:
        skip: Số lượng bản ghi bỏ qua (Pagination).
        limit: Số lượng bản ghi tối đa lấy về.
        db: Kết nối DB.
    """
    return category_controller.get_categories(db, skip=skip, limit=limit)

@router.post("/", response_model=Category)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo một danh mục sản phẩm mới.
    """
    return category_controller.create_category(db=db, category=category)
