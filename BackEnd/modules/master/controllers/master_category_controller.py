from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from modules.master.models.master_category import MasterCategory
from modules.master.models.master_product import MasterProduct
from modules.master.schemas.master_category import MasterCategoryCreate, MasterCategoryUpdate


def get_all_categories(db: Session):
    """Lấy danh sách danh mục mẫu (Dòng hàng) kèm số lượng sản phẩm mẫu thuộc mỗi danh mục."""
    rows = (
        db.query(MasterCategory, func.count(MasterProduct.id).label("product_count"))
        .outerjoin(MasterProduct, MasterProduct.category_id == MasterCategory.id)
        .group_by(MasterCategory.id, MasterCategory.name, MasterCategory.description, MasterCategory.status, MasterCategory.created_at)
        .order_by(MasterCategory.name)
        .all()
    )
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "status": cat.status,
            "created_at": cat.created_at,
            "product_count": product_count or 0
        }
        for cat, product_count in rows
    ]


def create_category(db: Session, data: MasterCategoryCreate):
    existing = db.query(MasterCategory).filter(MasterCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Danh mục '{data.name}' đã tồn tại!")
    new_cat = MasterCategory(name=data.name, description=data.description, status=data.status)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


def update_category(db: Session, category_id: int, data: MasterCategoryUpdate):
    cat = db.query(MasterCategory).filter(MasterCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục!")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int):
    cat = db.query(MasterCategory).filter(MasterCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục!")
    in_use = db.query(MasterProduct).filter(MasterProduct.category_id == category_id).count()
    if in_use > 0:
        raise HTTPException(status_code=400, detail=f"Không thể xóa: còn {in_use} sản phẩm mẫu đang thuộc danh mục này!")
    db.delete(cat)
    db.commit()
    return {"message": "Đã xóa danh mục thành công"}
