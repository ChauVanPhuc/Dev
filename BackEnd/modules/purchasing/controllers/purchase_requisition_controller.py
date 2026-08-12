from sqlalchemy.orm import Session, defer
from sqlalchemy import func, or_
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.purchasing.schemas.purchase_requisition import PurchaseRequisitionCreate, PurchaseRequisitionUpdate
from shared.utils.timezone import get_vietnam_time


def get_all(db: Session, skip: int = 0, limit: int = 50, 
            status: str = None, warehouse_status: str = None,
            search: str = None, supplier_code: str = None, 
            supplier_name: str = None, order_type: str = None,
            month: str = None):
    """Lấy danh sách đơn hàng với filter và search."""
    query = db.query(PurchaseRequisition)

    if status:
        query = query.filter(PurchaseRequisition.status == status)
    if warehouse_status:
        query = query.filter(PurchaseRequisition.warehouse_status == warehouse_status)
    if supplier_code:
        query = query.filter(PurchaseRequisition.supplier_code == supplier_code)
    if supplier_name:
        query = query.filter(PurchaseRequisition.supplier_name.ilike(f"%{supplier_name}%"))
    if order_type:
        query = query.filter(PurchaseRequisition.order_type == order_type)
    if month:
        query = query.filter(PurchaseRequisition.note.ilike(f"%{month}%"))
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            PurchaseRequisition.po_code.ilike(term),
            PurchaseRequisition.supplier_name.ilike(term),
            PurchaseRequisition.creator.ilike(term),
            PurchaseRequisition.supplier_code.ilike(term),
            PurchaseRequisition.note.ilike(term),
        ))

    total = query.count()
    items = query.order_by(PurchaseRequisition.order_date.desc(), PurchaseRequisition.id.desc())\
                 .offset(skip).limit(limit).all()

    # Thêm thông tin đầy đủ cho mỗi requisition
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
            "order_type": req.order_type or "Đơn bán hàng",
            "priority": req.priority or "Bình thường",
            "reviewer": req.reviewer,
            "reviewed_at": req.reviewed_at,
            "approver": req.approver,
            "approval_date": req.approval_date,
            "est_completion_date": req.est_completion_date,
            "real_completion_date": req.real_completion_date,
            "status": req.status,
            "processing_status": req.processing_status,
            "warehouse_status": req.warehouse_status,
            "inspector": req.inspector,
            "item_count": len(req.items) if req.items else 0,
            "note": req.note,
        }
        result.append(data)

    return {"items": result, "total": total}


def get_stats(db: Session):
    """Thống kê tổng hợp đơn hàng thực tế cho các thẻ KPI."""
    now = get_vietnam_time()
    total = db.query(func.count(PurchaseRequisition.id)).scalar() or 0

    # Thống kê theo trạng thái
    status_stats = db.query(
        PurchaseRequisition.status, func.count(PurchaseRequisition.id)
    ).group_by(PurchaseRequisition.status).all()

    # Thống kê theo tình trạng nhập/xuất kho
    warehouse_stats = db.query(
        PurchaseRequisition.warehouse_status, func.count(PurchaseRequisition.id)
    ).group_by(PurchaseRequisition.warehouse_status).all()

    # Tổng tiền USD thực tế từ CSDL
    total_amount = db.query(func.sum(PurchaseRequisition.total_amount)).scalar() or 0.0

    # Số đơn hoàn thành
    completed_count = db.query(func.count(PurchaseRequisition.id)).filter(
        PurchaseRequisition.status == "Đã hoàn thành"
    ).scalar() or 0

    # Số đơn đang xử lý
    processing_count = total - completed_count

    # Số đơn chậm tiến độ (quá ngày giao hàng dự kiến mà chưa hoàn thành)
    overdue_count = db.query(func.count(PurchaseRequisition.id)).filter(
        PurchaseRequisition.est_completion_date < now,
        PurchaseRequisition.status != "Đã hoàn thành"
    ).scalar() or 0

    return {
        "total": total,
        "total_amount": round(total_amount, 2),
        "processing": processing_count,
        "processing_total": total,
        "completed": completed_count,
        "completed_total": total,
        "total_value": round(total_amount, 2),
        "total_value_max": round(max(15000000.0, total_amount * 1.15), 2),
        "overdue": overdue_count,
        "overdue_total": total,
        "by_status": {s: c for s, c in status_stats if s},
        "by_warehouse": {s: c for s, c in warehouse_stats if s},
    }


def get_by_id(db: Session, requisition_id: int):
    """Lấy chi tiết 1 đơn hàng kèm danh sách mặt hàng (gồm cả fallback link po_code)."""
    req = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()
    if not req:
        return None
    if not req.items and req.po_code:
        items_by_code = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_code == req.po_code).all()
        if items_by_code:
            for it in items_by_code:
                it.requisition_id = req.id
            db.commit()
            db.refresh(req)
    return req


def get_by_code(db: Session, po_code: str):
    """Lấy đơn hàng theo mã PO."""
    return db.query(PurchaseRequisition).filter(PurchaseRequisition.po_code == po_code).first()


def create(db: Session, data: PurchaseRequisitionCreate):
    """Tạo mới đơn hàng kèm danh sách mặt hàng."""
    db_obj = PurchaseRequisition(
        po_code=data.po_code,
        creator=data.creator,
        order_date=data.order_date,
        delivery_date=data.delivery_date,
        branch=data.branch,
        inspector=data.inspector,
        inspection_date=data.inspection_date,
        reviewer=data.reviewer,
        reviewed_at=data.reviewed_at,
        approver=data.approver,
        approval_date=data.approval_date,
        supplier_code=data.supplier_code,
        supplier_name=data.supplier_name,
        total_amount=data.total_amount or 0,
        order_type=data.order_type or "Đơn mua hàng",
        priority=data.priority or "Bình thường",
        material_type=data.material_type,
        est_completion_date=data.est_completion_date,
        real_completion_date=data.real_completion_date,
        status=data.status,
        processing_status=data.processing_status,
        warehouse_status=data.warehouse_status,
        note=data.note,
        created_at=get_vietnam_time(),
    )
    db.add(db_obj)
    db.flush()

    if data.items:
        for item in data.items:
            item_code = item.get("code") or item.get("item_code") or ""
            item_name = item.get("name") or item.get("item_name") or ""
            qty = float(item.get("quantity") or item.get("qty") or 1)
            unit = item.get("unit") or "bộ"
            price = float(item.get("price") or item.get("unit_price") or 0)
            total = float(item.get("total") or (qty * price))

            db_item = PurchaseOrderItem(
                requisition_id=db_obj.id,
                po_code=db_obj.po_code,
                supplier_name=db_obj.supplier_name,
                item_code=item_code,
                item_name=item_name,
                unit=unit,
                quantity=qty,
                unit_price=price,
                subtotal_vnd=total,
                grand_total_vnd=total,
                created_at=get_vietnam_time()
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, requisition_id: int, data: PurchaseRequisitionUpdate):
    """Cập nhật đơn hàng và cập nhật danh sách mặt hàng."""
    db_obj = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()
    if not db_obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for key, value in update_data.items():
        setattr(db_obj, key, value)

    if items_data is not None:
        db.query(PurchaseOrderItem).filter(PurchaseOrderItem.requisition_id == requisition_id).delete()
        for item in items_data:
            item_code = item.get("code") or item.get("item_code") or ""
            item_name = item.get("name") or item.get("item_name") or ""
            qty = float(item.get("quantity") or item.get("qty") or 1)
            unit = item.get("unit") or "bộ"
            price = float(item.get("price") or item.get("unit_price") or 0)
            total = float(item.get("total") or (qty * price))

            db_item = PurchaseOrderItem(
                requisition_id=db_obj.id,
                po_code=db_obj.po_code,
                supplier_name=db_obj.supplier_name,
                item_code=item_code,
                item_name=item_name,
                unit=unit,
                quantity=qty,
                unit_price=price,
                subtotal_vnd=total,
                grand_total_vnd=total,
                created_at=get_vietnam_time()
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, requisition_id: int):
    """Xóa đơn hàng (cascade xóa luôn items)."""
    db_obj = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == requisition_id).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True


def get_shipping_monitoring(
    db: Session, skip: int = 0, limit: int = 50, 
    search: str = None, status: str = None, 
    order_type: str = None, supplier_name: str = None,
    priority: str = None, month: str = None
):
    """Lấy danh sách thời gian vận chuyển hàng cho màn hình KD04."""
    query = db.query(PurchaseRequisition)
    if status:
        query = query.filter(PurchaseRequisition.status == status)
    if order_type:
        query = query.filter(PurchaseRequisition.order_type == order_type)
    if supplier_name:
        query = query.filter(PurchaseRequisition.supplier_name.ilike(f"%{supplier_name}%"))
    if priority:
        query = query.filter(PurchaseRequisition.priority == priority)
    if month:
        query = query.filter(PurchaseRequisition.note.ilike(f"%{month}%"))
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            PurchaseRequisition.po_code.ilike(term),
            PurchaseRequisition.supplier_name.ilike(term),
            PurchaseRequisition.creator.ilike(term),
            PurchaseRequisition.supplier_code.ilike(term),
            PurchaseRequisition.note.ilike(term),
        ))
    total = query.count()
    items = query.order_by(PurchaseRequisition.order_date.desc(), PurchaseRequisition.id.desc()).offset(skip).limit(limit).all()

    result = []
    for req in items:
        result.append({
            "id": req.id,
            "po_code": req.po_code,
            "order_type": req.order_type or "Đơn bán hàng",
            "priority": req.priority or "Bình thường",
            "status": req.status or "Đã duyệt",
            "supplier_name": req.supplier_name or "Atlas International",
            "supplier_code": req.supplier_code or "",
            "total_amount": req.total_amount or 0,
            "creator": req.creator or "",
            "approver": req.approver or "",
            "approval_date": req.approval_date.strftime("%d/%m/%Y") if req.approval_date else "",
            "order_date": req.order_date.strftime("%d/%m/%Y") if req.order_date else "",
            "est_completion_date": req.est_completion_date.strftime("%d/%m/%Y") if req.est_completion_date else "",
            "real_completion_date": req.real_completion_date.strftime("%d/%m/%Y") if req.real_completion_date else "",
            "production_date": req.production_date.strftime("%d/%m/%Y") if req.production_date else (req.order_date.strftime("%d/%m/%Y") if req.order_date else ""),
            "warehouse_in_date": req.warehouse_in_date.strftime("%d/%m/%Y") if req.warehouse_in_date else (req.est_completion_date.strftime("%d/%m/%Y") if req.est_completion_date else ""),
            "storage_date": req.storage_date.strftime("%d/%m/%Y") if req.storage_date else "",
            "warehouse_out_date": req.warehouse_out_date.strftime("%d/%m/%Y") if req.warehouse_out_date else (req.real_completion_date.strftime("%d/%m/%Y") if req.real_completion_date else ""),
            "completed_date": req.completed_date.strftime("%d/%m/%Y") if req.completed_date else "",
            "note": req.note or "",
        })
    return {"items": result, "total": total}
