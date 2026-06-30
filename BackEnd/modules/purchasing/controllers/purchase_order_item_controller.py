from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.purchasing.schemas.purchase_order_item import PurchaseOrderItemCreate, PurchaseOrderItemUpdate
from shared.utils.timezone import get_vietnam_time


def get_all(db: Session, skip: int = 0, limit: int = 50,
            status: str = None, po_code: str = None,
            search: str = None, supplier_code: str = None):
    """Lấy danh sách chi tiết mặt hàng với filter và search."""
    query = db.query(PurchaseOrderItem)

    if status:
        query = query.filter(PurchaseOrderItem.status == status)
    if po_code:
        query = query.filter(PurchaseOrderItem.po_code == po_code)
    if supplier_code:
        query = query.filter(PurchaseOrderItem.supplier_code == supplier_code)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            PurchaseOrderItem.po_code.ilike(term),
            PurchaseOrderItem.item_code.ilike(term),
            PurchaseOrderItem.item_name.ilike(term),
            PurchaseOrderItem.supplier_name.ilike(term),
            PurchaseOrderItem.creator.ilike(term),
        ))

    total = query.count()
    items = query.order_by(PurchaseOrderItem.po_date.desc(), PurchaseOrderItem.id.desc())\
                 .offset(skip).limit(limit).all()

    return {"items": items, "total": total}


def get_stats(db: Session):
    """Thống kê tổng hợp mặt hàng."""
    total = db.query(func.count(PurchaseOrderItem.id)).scalar() or 0

    # Thống kê theo trạng thái
    status_stats = db.query(
        PurchaseOrderItem.status, func.count(PurchaseOrderItem.id)
    ).group_by(PurchaseOrderItem.status).all()

    # Tổng tiền VND
    total_vnd = db.query(func.sum(PurchaseOrderItem.grand_total_vnd)).scalar() or 0

    # Số PO duy nhất
    unique_po = db.query(func.count(func.distinct(PurchaseOrderItem.po_code))).scalar() or 0

    return {
        "total": total,
        "total_vnd": total_vnd,
        "unique_po_count": unique_po,
        "by_status": {s: c for s, c in status_stats if s},
    }


def get_by_po_code(db: Session, po_code: str):
    """Lấy danh sách mặt hàng theo mã PO."""
    return db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.po_code == po_code
    ).order_by(PurchaseOrderItem.id).all()


def get_by_id(db: Session, item_id: int):
    """Lấy chi tiết 1 mặt hàng."""
    return db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == item_id).first()


def create(db: Session, data: PurchaseOrderItemCreate):
    """Tạo mới chi tiết mặt hàng."""
    db_obj = PurchaseOrderItem(**data.model_dump())
    db_obj.created_at = get_vietnam_time()
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, item_id: int, data: PurchaseOrderItemUpdate):
    """Cập nhật chi tiết mặt hàng."""
    db_obj = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == item_id).first()
    if not db_obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, item_id: int):
    """Xóa chi tiết mặt hàng."""
    db_obj = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == item_id).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True
