from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from modules.master.schemas.master_category import MasterCategoryCreate, MasterCategoryUpdate
from modules.master.controllers import master_category_controller

router = APIRouter()


@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    """[GET] Lấy danh sách Danh mục mẫu (Dòng hàng) kèm số lượng sản phẩm."""
    return master_category_controller.get_all_categories(db)


@router.post("/")
def create_category(data: MasterCategoryCreate, db: Session = Depends(get_db)):
    """[POST] Tạo mới một Danh mục mẫu (Dòng hàng)."""
    return master_category_controller.create_category(db, data)


@router.put("/{category_id}")
def update_category(category_id: int, data: MasterCategoryUpdate, db: Session = Depends(get_db)):
    """[PUT] Cập nhật thông tin Danh mục mẫu."""
    return master_category_controller.update_category(db, category_id, data)


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """[DELETE] Xóa một Danh mục mẫu."""
    return master_category_controller.delete_category(db, category_id)
