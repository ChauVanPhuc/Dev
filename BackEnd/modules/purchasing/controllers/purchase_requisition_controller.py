from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.schemas.purchase_requisition import PurchaseRequisitionCreate, PurchaseRequisitionUpdate
from shared.utils.timezone import get_vietnam_time


def get_all(db: Session, skip: int = 0, limit: int = 50, 
            status: str = None, warehouse_status: str = None,
            search: str = None, supplier_code: str = None):
    """Lấy danh sách đơn đặt mua với filter và search."""
    query = db.query(PurchaseRequisition)

    if status:
        query = query.filter(PurchaseRequisition.status == status)
    if warehouse_status:
        query = query.filter(PurchaseRequisition.warehouse_status == warehouse_status)
    if supplier_code:
        query = query.filter(PurchaseRequisition.supplier_code == supplier_code)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            PurchaseRequisition.po_code.ilike(term),
            PurchaseRequisition.supplier_name.ilike(term),
            PurchaseRequisition.creator.ilike(term),
            PurchaseRequisition.supplier_code.ilike(term),
        ))

    total = query.count()
    items = query.order_by(PurchaseRequisition.order_date.desc(), PurchaseRequisition.id.desc())\
                 .offset(skip).limit(limit).all()

    # Thêm item_count cho mỗi requisition
    result = []
    for req in items:
        data = {
            "id": req.id,
            "po_code": req.po_code,
            "creator": req.creator,
            "order_date": req.order_date,
            "delivery_date": req.delivery_date,
            "supplier_code": req.supplier_code,
            "supplier_name": req.supplier_name,
            "total_amount": req.total_amount,
            "order_type": req.order_type,
            "status": req.status,
            "processing_status": req.processing_status,
            "warehouse_status": req.warehouse_status,
            "inspector": req.inspector,
            "approver": req.approver,
            "item_count": len(req.items) if req.items else 0,
        }
        result.append(data)

    return {"items": result, "total": total}


def get_stats(db: Session):
    """Thống kê tổng hợp đơn đặt mua."""
    total = db.query(func.count(PurchaseRequisition.id)).scalar() or 0

    # Thống kê theo trạng thái
    status_stats = db.query(
        PurchaseRequisition.status, func.count(PurchaseRequisition.id)
    ).group_by(PurchaseRequisition.status).all()

    # Thống kê theo tình trạng nhập kho
    warehouse_stats = db.query(
        PurchaseRequisition.warehouse_status, func.count(PurchaseRequisition.id)
    ).group_by(PurchaseRequisition.warehouse_status).all()

    # Tổng tiền
    total_amount = db.query(func.sum(PurchaseRequisition.total_amount)).scalar() or 0

    return {
        "total": total,
        "total_amount": total_amount,
        "by_status": {s: c for s, c in status_stats if s},
        "by_warehouse": {s: c for s, c in warehouse_stats if s},
    }


def get_by_id(db: Session, requisition_id: int):
    """Lấy chi tiết 1 đơn đặt mua kèm danh sách mặt hàng."""
    return db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()


def get_by_code(db: Session, po_code: str):
    """Lấy đơn đặt mua theo mã PO."""
    return db.query(PurchaseRequisition).filter(PurchaseRequisition.po_code == po_code).first()


def create(db: Session, data: PurchaseRequisitionCreate):
    """Tạo mới đơn đặt mua."""
    db_obj = PurchaseRequisition(
        po_code=data.po_code,
        creator=data.creator,
        order_date=data.order_date,
        delivery_date=data.delivery_date,
        branch=data.branch,
        inspector=data.inspector,
        inspection_date=data.inspection_date,
        approver=data.approver,
        approval_date=data.approval_date,
        supplier_code=data.supplier_code,
        supplier_name=data.supplier_name,
        total_amount=data.total_amount or 0,
        order_type=data.order_type,
        status=data.status,
        processing_status=data.processing_status,
        warehouse_status=data.warehouse_status,
        note=data.note,
        created_at=get_vietnam_time(),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, requisition_id: int, data: PurchaseRequisitionUpdate):
    """Cập nhật đơn đặt mua."""
    db_obj = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()
    if not db_obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, requisition_id: int):
    """Xóa đơn đặt mua (cascade xóa luôn items)."""
    db_obj = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True
