import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy import or_, func, and_
from sqlalchemy.orm import Session
from config.database import get_db
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_images import DeliveryImage
from modules.delivery.models.delivery_details import DeliveryDetails as DeliveryDetailsModel
from pydantic import BaseModel
from modules.delivery.schemas.delivery_details import DeliveryDetails as DeliveryDetailsSchema
from modules.delivery.schemas.deliveries import Delivery as DeliverySchema
from modules.delivery.models.deliveries import Delivery as DeliveryModel
from modules.notification.models.notifications import Notification as NotificationModel
from modules.auth.models.accounts import Account as AccountModel
from config.settings import settings, get_upload_dir
from shared.utils.string_cleaner import clean_and_standardize_name

router = APIRouter()

# Schema mở rộng để hiển thị tên người dùng trên Dashboard
class DeliveryDashboardResponse(BaseModel):
    id: int
    delivery_stage: Optional[str]
    receiving_stage: Optional[str]
    part_name: Optional[str]
    specification: Optional[str] # [NEW] Quy cách
    quantity_total: int
    quantity_received: int
    quantity_returned: int
    status: Optional[str]
    created_at: Optional[datetime.datetime]
    sx_delivery_name: Optional[str]
    sx_receipt_name: Optional[str]
    note: Optional[str]
    residual: Optional[int] = 0  # [FIX] Cho phép NULL, default = 0
    images: Optional[List[dict]] = []

    class Config:
        from_attributes = True


# Thư mục lưu trữ ảnh bàn giao sản phẩm/chi tiết
UPLOAD_DIR = get_upload_dir("deliveries")

def allocate_delivery_fifo(db: Session, delivery_id: int, plan_id: int, part_name: str, quantity: int, specification: Optional[str] = None, exclude_delivery_id: Optional[int] = None, allowed_order_ids: Optional[List[int]] = None):
    """
    [HELPER] Tự động phân bổ số lượng bàn giao vào các đơn hàng được chọn.
    """
    from modules.delivery.models.order import Order as OrderModel
    from modules.production.models.product import Product as ProductModel
    from modules.production.models.bom_detail import BOMDetail as BomDetailModel
    from sqlalchemy import func, or_
    
    # 0. Xóa chi tiết cũ nếu có (dùng cho update)
    db.query(DeliveryDetailsModel).filter(DeliveryDetailsModel.delivery_id == delivery_id).delete()
    
    # Nếu không chọn đơn hàng nào hoặc số lượng <= 0, không phân bổ
    if not allowed_order_ids or quantity <= 0:
        db.flush()
        return
    
    # 1. Lấy danh sách đơn hàng sắp xếp theo ưu tiên
    orders = db.query(OrderModel).filter(
        OrderModel.plan_id == plan_id,
        OrderModel.id.in_(allowed_order_ids)
    ).order_by(
        OrderModel.is_priority.desc(), 
        OrderModel.priority_score.desc(), 
        OrderModel.id.asc()
    ).all()
    
    if not orders:
        db.flush()
        return

    # 2. [BULK QUERY] Lấy tổng nhu cầu linh kiện cho TẤT CẢ đơn hàng trong kế hoạch
    order_ids = [o.id for o in orders]
    needed_query = db.query(
        ProductModel.order_id,
        func.sum(BomDetailModel.quantity * func.coalesce(ProductModel.total_qty, ProductModel.quantity, 0)).label("total_needed")
    ).with_hint(ProductModel, 'WITH (NOLOCK)'
    ).with_hint(BomDetailModel, 'WITH (NOLOCK)'
    ).join(BomDetailModel, BomDetailModel.product_id == ProductModel.id).filter(
        ProductModel.order_id.in_(order_ids),
        or_(
            BomDetailModel.name == part_name,
            BomDetailModel.name.like(part_name + " - %")
        )
    )
    
    if specification and specification != 'Không có':
        needed_query = needed_query.filter(BomDetailModel.specification == specification)
    
    needed_map = {r.order_id: (r.total_needed or 0) for r in needed_query.group_by(ProductModel.order_id).all()}

    # 3. [BULK QUERY] Lấy số lượng đã giao cho TẤT CẢ đơn hàng trong kế hoạch
    already_query = db.query(
        DeliveryDetailsModel.order_id,
        func.sum(DeliveryDetailsModel.quantity).label("total_already")
    ).with_hint(DeliveryDetailsModel, 'WITH (NOLOCK)'
    ).with_hint(DeliveryModel, 'WITH (NOLOCK)'
    ).join(DeliveryModel, DeliveryDetailsModel.delivery_id == DeliveryModel.id).filter(
        DeliveryModel.plan_id == plan_id,
        DeliveryDetailsModel.order_id.in_(order_ids),
        or_(
            DeliveryDetailsModel.part_name == part_name,
            DeliveryDetailsModel.part_name.like(part_name + " - %")
        )
    )
    
    if exclude_delivery_id:
        already_query = already_query.filter(DeliveryModel.id != exclude_delivery_id)
        
    if specification and specification != 'Không có':
        already_query = already_query.filter(DeliveryModel.specification == specification)
    else:
        already_query = already_query.filter(or_(
            DeliveryModel.specification == None, 
            DeliveryModel.specification == '', 
            DeliveryModel.specification == 'Không có'
        ))
        
    already_map = {r.order_id: (r.total_already or 0) for r in already_query.group_by(DeliveryDetailsModel.order_id).all()}

    # 4. Phân bổ FIFO trên bộ nhớ
    remaining_qty = quantity
    details_to_add = []

    for order in orders:
        if remaining_qty <= 0:
            break

        total_needed = needed_map.get(order.id, 0)
        if total_needed <= 0:
            continue

        already_assigned = already_map.get(order.id, 0)
        still_needed = max(0, total_needed - already_assigned)

        if still_needed > 0:
            assign_qty = min(remaining_qty, still_needed)
            new_detail = DeliveryDetailsModel(
                delivery_id=delivery_id,
                part_name=part_name,
                quantity=assign_qty,
                order_id=order.id
            )
            details_to_add.append(new_detail)
            remaining_qty -= assign_qty

    # 5. Nếu vẫn còn dư, KHÔNG tạo chi tiết chung
    # Phần dư được lưu trong delivery.residual (đã có sẵn trong bảng deliveries)
    # Không cần thêm dòng vào delivery_details

    if details_to_add:
        db.add_all(details_to_add)
    
    db.flush()

@router.get("/history")
def get_delivery_history(
    plan_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    stage: Optional[str] = None,
    ticket_type: Optional[str] = None,
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy lịch sử bàn giao với bộ lọc server-side và phân trang.
    Dành cho trang Mobile 'Lịch sử bàn giao'.
    """
    from sqlalchemy.orm import aliased

    Sender = aliased(AccountModel)
    Receiver = aliased(AccountModel)

    base_query = db.query(
        DeliveryModel.id,
        DeliveryModel.delivery_stage,
        DeliveryModel.receiving_stage,
        DeliveryModel.part_name,
        DeliveryModel.specification,
        DeliveryModel.quantity_total,
        DeliveryModel.quantity_received,
        DeliveryModel.quantity_returned,
        DeliveryModel.status,
        DeliveryModel.created_at,
        DeliveryModel.note,
        DeliveryModel.residual,
        DeliveryModel.plan_id,
        Sender.full_name.label("sx_delivery_name"),
        Receiver.full_name.label("sx_receipt_name")
    ).outerjoin(
        Sender, DeliveryModel.sx_delivery == Sender.id
    ).outerjoin(
        Receiver, DeliveryModel.sx_receipt == Receiver.id
    )

    # Áp dụng các bộ lọc
    if plan_id is not None:
        base_query = base_query.filter(DeliveryModel.plan_id == plan_id)

    if date_from:
        try:
            dt_from = datetime.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            base_query = base_query.filter(DeliveryModel.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            # Cộng thêm 1 ngày để bao gồm cả ngày kết thúc
            dt_to = dt_to + datetime.timedelta(days=1)
            base_query = base_query.filter(DeliveryModel.created_at < dt_to)
        except ValueError:
            pass

    if status and status != "Tất cả":
        base_query = base_query.filter(DeliveryModel.status == status)

    if stage and stage != "Tất cả":
        base_query = base_query.filter(
            or_(
                DeliveryModel.delivery_stage == stage,
                DeliveryModel.receiving_stage == stage
            )
        )

    if ticket_type == "delivery":
        # Chỉ lấy phiếu mà user đang giao (delivery_stage)
        base_query = base_query.filter(DeliveryModel.delivery_stage.isnot(None))
    elif ticket_type == "receive":
        # Chỉ lấy phiếu mà user đang nhận (receiving_stage)
        base_query = base_query.filter(DeliveryModel.receiving_stage.isnot(None))

    # Đếm tổng số bản ghi khớp bộ lọc (trước khi phân trang)
    total_count = base_query.count()

    # Sắp xếp
    if sort_order == "asc":
        base_query = base_query.order_by(DeliveryModel.created_at.asc())
    else:
        base_query = base_query.order_by(DeliveryModel.created_at.desc())

    # Phân trang
    items = base_query.offset(skip).limit(limit).all()

    has_more = (skip + limit) < total_count

    # Chuyển kết quả thành dict
    result_items = []
    for row in items:
        result_items.append({
            "id": row.id,
            "delivery_stage": row.delivery_stage,
            "receiving_stage": row.receiving_stage,
            "part_name": row.part_name,
            "specification": row.specification,
            "quantity_total": row.quantity_total,
            "quantity_received": row.quantity_received,
            "quantity_returned": row.quantity_returned,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "note": row.note,
            "residual": row.residual or 0,
            "plan_id": row.plan_id,
            "sx_delivery_name": row.sx_delivery_name,
            "sx_receipt_name": row.sx_receipt_name,
            "images": []
        })

    return {
        "items": result_items,
        "total_count": total_count,
        "has_more": has_more
    }

@router.get("/next-id")
def get_next_delivery_id(db: Session = Depends(get_db)):
    """Lấy ID dự kiến cho phiếu tiếp theo"""
    max_id = db.query(func.max(Delivery.id)).scalar() or 0
    return {"next_id": max_id + 1}

@router.get("/fix-db-moisture")
def fix_db_moisture(db: Session = Depends(get_db)):
    """
    [TEMP] Endpoint để cập nhật Database thủ công cho các cột độ ẩm.
    Sau khi chạy xong có thể xóa.
    """
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE deliveries ADD moisture_min FLOAT NULL"))
        db.execute(text("ALTER TABLE deliveries ADD moisture_max FLOAT NULL"))
        db.commit()
        return {"status": "success", "message": "Đã thêm cột moisture_min và moisture_max thành công!"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@router.post("/", response_model=DeliverySchema)
async def create_delivery(
    plan_id: int = Form(...),
    delivery_stage: str = Form(...),
    receiving_stage: str = Form(...),
    note: Optional[str] = Form(None),
    user_id: int = Form(...),  # ID người dùng thực hiện giao
    quantity: int = Form(0),   # Số lượng thực tế bàn giao
    residual: int = Form(0),   # Số lượng dư thừa/phế phẩm
    status: str = Form("Chờ Nhận Hàng"),
    part_name: str = Form(...), # Tên chi tiết bàn giao (Product/Element/Part)
    specification: Optional[str] = Form(None), # [NEW] Quy cách
    order_ids: Optional[str] = Form(None), # [NEW] Danh sách ID đơn hàng chọn thủ công (dạng "1,2,3")
    details: str = Form("[]"), # [NEW] Danh sách chi tiết dưới dạng JSON String: [{"part_name": "...", "quantity": ..., "order_id": ..., "element_name": "..."}, ...]
    backup_qr: Optional[str] = Form(None), # [NEW] Mã QR dự phòng
    moisture_min: Optional[float] = Form(None), # [NEW] Độ ẩm Min
    moisture_max: Optional[float] = Form(None), # [NEW] Độ ẩm Max
    files: List[UploadFile] = File([]),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Tạo phiếu bàn giao (Delivery Order) mới kèm hình ảnh minh chứng.
    
    Quy trình:
    1. Khởi tạo bản ghi Delivery chính với thông tin các công đoạn giao/nhận.
    2. Lưu trữ thông tin chi tiết các phần bàn giao vào DeliveryDetails.
    3. Xử lý upload và lưu trữ hình ảnh thực tế (nếu có).
    4. Cập nhật đường dẫn ảnh vào database để hiển thị trên UI.
    """
    try:
        part_name = clean_and_standardize_name(part_name)
        # 1. [CHUẨN HÓA & FETCH MỘT LẦN] Tìm mã công đoạn và thông tin người dùng
        from modules.production.models.stages import Stage as StageModel
        from sqlalchemy import or_
        
        # Lấy tất cả thông tin cần thiết trong ít truy vấn nhất
        from modules.auth.models.departments import Department as DeptModel
        user_data = db.query(
            AccountModel.full_name,
            StageModel.description
        ).outerjoin(
            DeptModel, DeptModel.account_id == AccountModel.id
        ).outerjoin(
            StageModel, StageModel.id == DeptModel.stage_id
        ).filter(AccountModel.id == user_id).first()
        
        user_name = user_data.full_name if user_data and user_data.full_name else "Một nhân viên"
        sender_stage_desc = f" ({user_data.description})" if user_data and user_data.description else ""
        
        stages = db.query(StageModel).filter(or_(
            StageModel.name == delivery_stage, 
            StageModel.description == delivery_stage,
            StageModel.name == receiving_stage, 
            StageModel.description == receiving_stage
        )).all()
        
        stage_map = {s.name: s for s in stages}
        stage_map.update({s.description: s for s in stages})
        
        d_stage_obj = stage_map.get(delivery_stage)
        canonical_delivery_stage = d_stage_obj.name if d_stage_obj else delivery_stage
        
        r_stage_obj = stage_map.get(receiving_stage)
        canonical_receiving_stage = r_stage_obj.name if r_stage_obj else receiving_stage

        # 2. Tạo bản ghi Delivery chính
        new_delivery = Delivery(
            plan_id=plan_id,
            delivery_stage=canonical_delivery_stage,
            receiving_stage=canonical_receiving_stage,
            note=note,
            sx_delivery=user_id,
            residual=residual,
            quantity_total=quantity,
            status="Chờ Nhận Hàng",
            part_name=part_name,
            specification=specification,
            created_at=datetime.datetime.now(),
            backup_qr=backup_qr,
            moisture_min=moisture_min,
            moisture_max=moisture_max
        )
        db.add(new_delivery)
        db.flush() 

        # 3. Chia chi tiết theo đơn hàng chọn thủ công
        allowed_order_ids = []
        if order_ids:
            try:
                allowed_order_ids = [int(x.strip()) for x in order_ids.split(",") if x.strip()]
            except ValueError:
                allowed_order_ids = []
                
        # Cập nhật order_id chính của delivery nếu có duy nhất 1 đơn hàng được chọn
        if allowed_order_ids and len(allowed_order_ids) == 1:
            new_delivery.order_id = allowed_order_ids[0]
        else:
            new_delivery.order_id = None
            
        # 3.1. Lưu từng mặt hàng chi tiết từ payload `details`
        import json
        saved_items_count = 0
        if details:
            try:
                parsed_details = json.loads(details) if isinstance(details, str) else details
                if isinstance(parsed_details, list) and len(parsed_details) > 0:
                    for it in parsed_details:
                        p_name = it.get("detail") or it.get("part_name") or part_name
                        p_qty = int(it.get("qty") or it.get("quantity") or 0)
                        p_spec = it.get("spec") or it.get("specification") or ""
                        p_oid = it.get("order_id")
                        if p_qty > 0:
                            db.add(DeliveryDetailsModel(
                                delivery_id=new_delivery.id,
                                part_name=p_name,
                                quantity=p_qty,
                                element_name=p_spec,
                                order_id=p_oid
                            ))
                            saved_items_count += 1
            except Exception as de:
                print(f"[create_delivery] Error parsing items details: {de}")

        if saved_items_count == 0:
            allocate_delivery_fifo(db, new_delivery.id, plan_id, part_name, quantity, specification, allowed_order_ids=allowed_order_ids)

        # 4. Cập nhật thẻ QR dự phòng & Sinh mã Pallet tự động nếu chưa có
        if backup_qr:
            from modules.system.models.backup_qr import BackupQRCode
            b_qr = db.query(BackupQRCode).filter(BackupQRCode.code == backup_qr).first()
            if b_qr:
                b_qr.status = "Đang Sử Dụng"
                b_qr.current_delivery_id = new_delivery.id
        else:
            try:
                from modules.inspection.routes.inspection_routes import generate_unique_pallet_code
                gen_res = generate_unique_pallet_code("DA", db)
                auto_pallet_code = gen_res.get("palletCode")
                if auto_pallet_code:
                    new_delivery.backup_qr = auto_pallet_code
                    # Tạo bản ghi PalletCard tương ứng
                    from modules.delivery.models.pallet_card import PalletCard
                    pallet_card = PalletCard(
                        pallet_code=auto_pallet_code,
                        khsx_code=str(plan_id),
                        detail_name=part_name,
                        quantity_plan=quantity,
                        quantity_actual=quantity,
                        status=1,
                        created_at=datetime.datetime.now()
                    )
                    db.add(pallet_card)
            except Exception as pe:
                print(f"Lỗi tự động cấp mã Pallet cho phiếu giao: {pe}")

        # 5. Xử lý Ảnh
        for file in files:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            image_url = f"/static/uploads/deliveries/{unique_filename}"
            new_image = DeliveryImage(delivery_id=new_delivery.id, image_path=image_url, description="ảnh giao")
            db.add(new_image)

        # 6. Tạo thông báo (Database)
        display_sender = f"{user_name}{sender_stage_desc}"
        notif_content = f"{display_sender} đã giao '{part_name}' (SL: {quantity}). Mời bộ phận Sản xuất công đoạn {receiving_stage} tiếp nhận."
        
        new_notification_sx = NotificationModel(
            content=notif_content,
            announcer_id=user_id,
            target_group="SX",
            target_stage=canonical_receiving_stage,
            priority_status="Bình thường"
        )
        db.add(new_notification_sx)

        db.commit()
        if '_deliveries_swr_cache' in globals():
            _deliveries_swr_cache.clear()
        
        # 7. Tác vụ nền (Firebase Push & WebSocket)
        if background_tasks:
            push_title = "Có phiếu bàn giao mới"
            push_body = f"{display_sender} đã chuyển '{part_name}' (SL: {quantity}) đến công đoạn của bạn. Mời xác nhận nhận hàng."
            from shared.services.notification_service import notify_stage, send_push_to_group
            from shared.services.websocket_service import socket_manager
            
            background_tasks.add_task(notify_stage, db, canonical_receiving_stage, push_title, push_body, role_filter="SX")
            background_tasks.add_task(
                send_push_to_group,
                db=db,
                target_group="SX",
                title=push_title,
                body=push_body,
                route_path=f"/production_v2/transfer-list?id={new_delivery.id}",
                stage_name=canonical_receiving_stage
            )
            background_tasks.add_task(
                socket_manager.broadcast_to_stage,
                db, 
                stage_name=canonical_receiving_stage, 
                message={
                    "type": "NEW_DELIVERY", 
                    "delivery_id": new_delivery.id, 
                    "part_name": part_name,
                    "target_group": "SX",
                    "content": notif_content
                }
            )
            background_tasks.add_task(
                socket_manager.broadcast_to_stage,
                db,
                stage_name=canonical_delivery_stage,
                message={"type": "NEW_DELIVERY", "delivery_id": new_delivery.id, "part_name": part_name}
            )

        db.refresh(new_delivery)
        return new_delivery

    except Exception as e:
        db.rollback()
        with open("delivery_debug.log", "a", encoding="utf-8") as f:
            f.write(f"CRITICAL ERROR: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phiếu bàn giao: {str(e)}")

@router.get("/available-dates")
def get_available_dates(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các năm và tháng có dữ liệu bàn giao thực tế trong database.
    """
    from sqlalchemy import extract
    
    # Lấy các năm và tháng duy nhất từ DeliveryModel.created_at
    dates_query = db.query(
        extract('year', DeliveryModel.created_at).label('year'),
        extract('month', DeliveryModel.created_at).label('month')
    ).distinct().all()
    
    mapping = {}
    for r in dates_query:
        y, m = r[0], r[1]
        if y is not None and m is not None:
            y_int = int(y)
            m_int = int(m)
            if y_int not in mapping:
                mapping[y_int] = []
            if m_int not in mapping[y_int]:
                mapping[y_int].append(m_int)
                
    # Sắp xếp các tháng tăng dần cho mỗi năm
    for y in mapping:
        mapping[y].sort()
        
    # Sắp xếp các năm giảm dần
    sorted_mapping = {str(k): mapping[k] for k in sorted(mapping.keys(), reverse=True)}
    
    # Trường hợp không có dữ liệu nào
    if not sorted_mapping:
        now = datetime.datetime.now()
        sorted_mapping = {str(now.year): [now.month]}
        
    return sorted_mapping

@router.get("/")
def get_all_deliveries(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    skip: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu bàn giao với phân trang Server-Side và con số thống kê thực tế từ CSDL.
    """
    from sqlalchemy.orm import aliased
    Sender = aliased(AccountModel)
    Receiver = aliased(AccountModel)

    # 1. Base Query
    base_query = db.query(DeliveryModel)

    if order_id is not None:
        base_query = base_query.filter(DeliveryModel.order_id == order_id)

    if year is not None and month is not None:
        start_date = datetime.datetime(year, month, 1, 0, 0, 0)
        if month == 12:
            end_date = datetime.datetime(year + 1, 1, 1, 0, 0, 0)
        else:
            end_date = datetime.datetime(year, month + 1, 1, 0, 0, 0)
        base_query = base_query.filter(DeliveryModel.created_at >= start_date, DeliveryModel.created_at < end_date)
    elif year is not None:
        start_date = datetime.datetime(year, 1, 1, 0, 0, 0)
        end_date = datetime.datetime(year + 1, 1, 1, 0, 0, 0)
        base_query = base_query.filter(DeliveryModel.created_at >= start_date, DeliveryModel.created_at < end_date)

    # 2. Calculate true STATS from Database across all records matching month/year
    total_count = base_query.count()
    completed_count = base_query.filter(DeliveryModel.status.in_(["Hoàn thành", "Đã Nhận Hàng"])).count()
    pending_count = base_query.filter(DeliveryModel.status.in_(["Chờ Nhận Hàng", "Chờ Xác Nhận", "Chờ kiểm tra", "Chờ Kiểm Tra"])).count()
    error_count = base_query.filter(
        or_(
            DeliveryModel.quantity_returned > 0,
            DeliveryModel.status.in_(["Lỗi", "Từ chối", "Trả lại", "Trả Lại"])
        )
    ).count()

    # 3. Filter query for items
    filtered_query = base_query
    if status and status != "all" and status != "Tất cả":
        if status in ["completed", "Hoàn thành"]:
            filtered_query = filtered_query.filter(DeliveryModel.status.in_(["Hoàn thành", "Đã Nhận Hàng"]))
        elif status in ["pending", "Chờ Nhận Hàng"]:
            filtered_query = filtered_query.filter(DeliveryModel.status.in_(["Chờ Nhận Hàng", "Chờ Xác Nhận", "Chờ kiểm tra", "Chờ Kiểm Tra"]))
        elif status in ["error", "Lỗi"]:
            filtered_query = filtered_query.filter(
                or_(
                    DeliveryModel.quantity_returned > 0,
                    DeliveryModel.status.in_(["Lỗi", "Từ chối", "Trả lại", "Trả Lại"])
                )
            )

    if search and search.strip():
        s = f"%{search.strip()}%"
        filtered_query = filtered_query.filter(
            or_(
                DeliveryModel.part_name.like(s),
                DeliveryModel.delivery_stage.like(s),
                DeliveryModel.receiving_stage.like(s),
                DeliveryModel.note.like(s)
            )
        )

    filtered_total = filtered_query.count()

    # 4. Join Sender/Receiver for paginated items
    items_query = db.query(
        DeliveryModel.id,
        DeliveryModel.order_id,
        DeliveryModel.delivery_stage,
        DeliveryModel.receiving_stage,
        DeliveryModel.part_name,
        DeliveryModel.specification,
        DeliveryModel.quantity_total,
        DeliveryModel.quantity_received,
        DeliveryModel.quantity_returned,
        DeliveryModel.status,
        DeliveryModel.created_at,
        DeliveryModel.note,
        DeliveryModel.residual,
        Sender.full_name.label("sx_delivery_name"),
        Receiver.full_name.label("sx_receipt_name")
    ).outerjoin(
        Sender, DeliveryModel.sx_delivery == Sender.id
    ).outerjoin(
        Receiver, DeliveryModel.sx_receipt == Receiver.id
    )

    if order_id is not None:
        items_query = items_query.filter(DeliveryModel.order_id == order_id)

    if year is not None and month is not None:
        start_date = datetime.datetime(year, month, 1, 0, 0, 0)
        end_date = datetime.datetime(year + 1, 1, 1, 0, 0, 0) if month == 12 else datetime.datetime(year, month + 1, 1, 0, 0, 0)
        items_query = items_query.filter(DeliveryModel.created_at >= start_date, DeliveryModel.created_at < end_date)
    elif year is not None:
        items_query = items_query.filter(DeliveryModel.created_at >= datetime.datetime(year, 1, 1), DeliveryModel.created_at < datetime.datetime(year + 1, 1, 1))

    if status and status != "all" and status != "Tất cả":
        if status in ["completed", "Hoàn thành"]:
            items_query = items_query.filter(DeliveryModel.status.in_(["Hoàn thành", "Đã Nhận Hàng"]))
        elif status in ["pending", "Chờ Nhận Hàng"]:
            items_query = items_query.filter(DeliveryModel.status.in_(["Chờ Nhận Hàng", "Chờ Xác Nhận", "Chờ kiểm tra", "Chờ Kiểm Tra"]))
        elif status in ["error", "Lỗi"]:
            items_query = items_query.filter(
                or_(
                    DeliveryModel.quantity_returned > 0,
                    DeliveryModel.status.in_(["Lỗi", "Từ chối", "Trả lại", "Trả Lại"])
                )
            )

    if search and search.strip():
        s = f"%{search.strip()}%"
        items_query = items_query.filter(
            or_(
                DeliveryModel.part_name.like(s),
                DeliveryModel.delivery_stage.like(s),
                DeliveryModel.receiving_stage.like(s),
                DeliveryModel.note.like(s)
            )
        )

    items_query = items_query.order_by(DeliveryModel.id.desc())

    offset_val = skip if (skip is not None and skip > 0) else (page - 1) * limit
    paginated_items = items_query.offset(offset_val).limit(limit).all()
    total_pages = max(1, (filtered_total + limit - 1) // limit)

    result_items = []
    for row in paginated_items:
        result_items.append({
            "id": row.id,
            "order_id": row.order_id,
            "delivery_stage": row.delivery_stage,
            "receiving_stage": row.receiving_stage,
            "part_name": row.part_name,
            "specification": row.specification,
            "quantity_total": row.quantity_total,
            "quantity_received": row.quantity_received,
            "quantity_returned": row.quantity_returned,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "note": row.note,
            "residual": row.residual or 0,
            "sx_delivery_name": row.sx_delivery_name,
            "sx_receipt_name": row.sx_receipt_name
        })

    return {
        "items": result_items,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "stats": {
            "total": total_count,
            "completed": completed_count,
            "pending": pending_count,
            "error": error_count
        }
    }


@router.get("/exceptions", response_model=List[DeliveryDashboardResponse])
def get_exception_deliveries(
    skip: int = 0, 
    limit: Optional[int] = 100, 
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các phiếu bàn giao có xảy ra ngoại lệ:
    - Số lượng nhận < Số lượng giao (Nhận < Giao) và không ở trạng thái Chờ
    - Số lượng nhận > Số lượng giao (Giao < Nhận)
    - Có số lượng trả hàng (quantity_returned > 0)
    - Có số lượng hàng lỗi (quantity_error > 0)
    """
    from sqlalchemy.orm import aliased
    Sender = aliased(AccountModel)
    Receiver = aliased(AccountModel)

    # Các trạng thái chờ nhận hàng/xác nhận
    pending_statuses = [
        "Chờ xác nhận", 
        "Chờ Nhận Hàng", 
        "Chờ Xác Nhận", 
        "Chờ kiểm tra", 
        "Chờ Kiểm Tra"
    ]

    query = db.query(
        DeliveryModel.id,
        DeliveryModel.delivery_stage,
        DeliveryModel.receiving_stage,
        DeliveryModel.part_name,
        DeliveryModel.specification,
        DeliveryModel.quantity_total,
        DeliveryModel.quantity_received,
        DeliveryModel.quantity_returned,
        DeliveryModel.status,
        DeliveryModel.created_at,
        DeliveryModel.note,
        DeliveryModel.residual,
        Sender.full_name.label("sx_delivery_name"),
        Receiver.full_name.label("sx_receipt_name")
    ).outerjoin(
        Sender, DeliveryModel.sx_delivery == Sender.id
    ).outerjoin(
        Receiver, DeliveryModel.sx_receipt == Receiver.id
    ).filter(
        or_(
            # Giao < Nhận: Nhận nhiều hơn Giao
            DeliveryModel.quantity_received > DeliveryModel.quantity_total,
            # Nhận < Giao: Nhận ít hơn Giao (chỉ tính khi đã nhận/xử lý, không tính trạng thái chờ)
            and_(
                DeliveryModel.quantity_received < DeliveryModel.quantity_total,
                ~DeliveryModel.status.in_(pending_statuses)
            ),
            # Trả hàng
            DeliveryModel.quantity_returned > 0,
            # Hàng lỗi
            DeliveryModel.quantity_error > 0
        )
    )

    if year is not None and month is not None:
        start_date = datetime.datetime(year, month, 1, 0, 0, 0)
        if month == 12:
            end_date = datetime.datetime(year + 1, 1, 1, 0, 0, 0)
        else:
            end_date = datetime.datetime(year, month + 1, 1, 0, 0, 0)
        query = query.filter(DeliveryModel.created_at >= start_date, DeliveryModel.created_at < end_date)
    elif year is not None:
        start_date = datetime.datetime(year, 1, 1, 0, 0, 0)
        end_date = datetime.datetime(year + 1, 1, 1, 0, 0, 0)
        query = query.filter(DeliveryModel.created_at >= start_date, DeliveryModel.created_at < end_date)

    query = query.order_by(DeliveryModel.id.desc())

    if skip > 0:
        query = query.offset(skip)
    if limit is not None and limit > 0:
        query = query.limit(limit)

    results = query.all()
    return results


@router.get("/image-proxy")
async def get_image_proxy(path: str, as_base64: bool = False):
    log_file = os.path.abspath(os.path.join(os.getcwd(), "proxy_error.log"))
    try:
        # Bảo mật: Chỉ cho phép truy cập tệp trong thư mục static/uploads
        safe_path = path.replace("\\", "/").strip("/")
        if not safe_path.startswith("static/uploads"):
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"{datetime.datetime.now()}: Forbidden path: {safe_path}\n")
            raise HTTPException(status_code=403, detail="Truy cập bị từ chối")
        
        # BackEnd/src/app/api/v1/endpoints/delivery_router.py -> 5 cấp để lên BackEnd/
        current_file = os.path.abspath(__file__)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(current_file), "..", "..", ".."))
        full_path = os.path.abspath(os.path.join(base_dir, safe_path))
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now()}: Request path: {path} -> Full path: {full_path}\n")

        if not os.path.exists(full_path):
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"{datetime.datetime.now()}: File NOT FOUND: {full_path}\n")
            raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
            
        if as_base64:
            import base64
            with open(full_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            ext = full_path.split('.')[-1].lower() if '.' in full_path else 'png'
            return {"base64": encoded_string, "extension": ext}

        return FileResponse(full_path)
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now()}: CRITICAL ERROR: {err_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/po/{order_code}", response_model=List[DeliveryDashboardResponse])
def get_handover_history_by_po(order_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy lịch sử bàn giao của một PO dựa trên mã order_code / PO code.
    Kết quả bao gồm:
    1. Phiếu bàn giao gán trực tiếp order_id hoặc delivery_details.order_id
    2. Phiếu bàn giao khớp ghi chú (note) hoặc mã Pallet (backup_qr)
    3. Phiếu bàn giao từ ứng dụng di động có tên chi tiết / SKU khớp với danh mục sản phẩm/BOM của PO này.
    """
    from modules.delivery.models.order import Order as OrderModel
    from modules.production.models.product import Product as ProductModel
    from modules.production.models.bom_detail import BOMDetail as BomDetailModel
    from modules.delivery.models.delivery_images import DeliveryImage
    from sqlalchemy.orm import aliased, joinedload

    clean_code = (order_code or "").strip()
    if not clean_code:
        return []

    order = db.query(OrderModel).filter(
        or_(
            OrderModel.order_code == clean_code,
            OrderModel.order_code.ilike(f"%{clean_code}%")
        )
    ).first()

    matched_delivery_ids = set()

    if order:
        # 1. Gán trực tiếp order_id trong Delivery
        d_ids1 = [r[0] for r in db.query(DeliveryModel.id).filter(DeliveryModel.order_id == order.id).all()]
        matched_delivery_ids.update(d_ids1)

        # 2. Gán trực tiếp order_id trong DeliveryDetails
        d_ids2 = [r[0] for r in db.query(DeliveryDetailsModel.delivery_id).filter(DeliveryDetailsModel.order_id == order.id).all() if r[0]]
        matched_delivery_ids.update(d_ids2)

        # 3. Thu thập danh mục SKU và tên sản phẩm/BOM của PO này
        products = db.query(ProductModel).filter(ProductModel.order_id == order.id).all()
        keywords = set()
        for p in products:
            if p.sku and len(p.sku.strip()) >= 3:
                keywords.add(p.sku.strip())
            if p.name and len(p.name.strip()) >= 3:
                keywords.add(p.name.strip())
            
            boms = db.query(BomDetailModel).filter(BomDetailModel.product_id == p.id).all()
            for b in boms:
                if b.sku and len(b.sku.strip()) >= 3:
                    keywords.add(b.sku.strip())
                if b.name and len(b.name.strip()) >= 5:
                    keywords.add(b.name.strip())

        if keywords:
            kw_filters = [DeliveryModel.part_name.ilike(f"%{kw}%") for kw in keywords]
            d_ids3 = [r[0] for r in db.query(DeliveryModel.id).filter(or_(*kw_filters)).all()]
            matched_delivery_ids.update(d_ids3)

            dt_kw_filters = [DeliveryDetailsModel.part_name.ilike(f"%{kw}%") for kw in keywords]
            d_ids4 = [r[0] for r in db.query(DeliveryDetailsModel.delivery_id).filter(or_(*dt_kw_filters)).all() if r[0]]
            matched_delivery_ids.update(d_ids4)

    # 4. Tìm theo ghi chú / mã QR / tên chi tiết khớp clean_code
    d_ids_note = [r[0] for r in db.query(DeliveryModel.id).filter(
        or_(
            DeliveryModel.note.ilike(f"%{clean_code}%"),
            DeliveryModel.backup_qr.ilike(f"%{clean_code}%"),
            DeliveryModel.part_name.ilike(f"%{clean_code}%")
        )
    ).all()]
    matched_delivery_ids.update(d_ids_note)

    if not matched_delivery_ids:
        return []

    deliveries = db.query(DeliveryModel).options(
        joinedload(DeliveryModel.images)
    ).filter(
        DeliveryModel.id.in_(matched_delivery_ids)
    ).order_by(DeliveryModel.created_at.desc()).all()

    Sender = aliased(AccountModel)
    Receiver = aliased(AccountModel)

    results = []
    for d in deliveries:
        sender = db.query(AccountModel).filter(AccountModel.id == d.sx_delivery).first()
        receiver = db.query(AccountModel).filter(AccountModel.id == d.sx_receipt).first()

        actual_quantity = d.quantity_total
        if order and d.order_id and d.order_id != order.id:
            detail_qty = db.query(func.sum(DeliveryDetailsModel.quantity)).filter(
                DeliveryDetailsModel.delivery_id == d.id,
                DeliveryDetailsModel.order_id == order.id
            ).scalar()
            if detail_qty and detail_qty > 0:
                actual_quantity = detail_qty

        results.append({
            "id": d.id,
            "delivery_stage": d.delivery_stage,
            "receiving_stage": d.receiving_stage,
            "part_name": d.part_name,
            "specification": d.specification,
            "quantity_total": actual_quantity,
            "quantity_received": d.quantity_received or 0,
            "quantity_returned": d.quantity_returned or 0,
            "status": d.status or "Chờ Nhận Hàng",
            "created_at": d.created_at,
            "note": d.note,
            "residual": d.residual or 0,
            "sx_delivery_name": sender.full_name if sender else "N/A",
            "sx_receipt_name": receiver.full_name if receiver else "---",
            "images": [{"image_path": img.image_path} for img in (d.images or []) if img.description == "ảnh giao"]
        })

    return results

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

_deliveries_swr_cache = SWRCache(ttl=5.0)

@router.get("/{plan_id}", response_model=List[DeliverySchema])
@_deliveries_swr_cache
def get_deliveries_by_plan(plan_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các phiếu bàn giao thuộc một kế hoạch sản xuất.
    Tích hợp tự động sửa lỗi Database nếu thiếu cột độ ẩm.
    """
    from sqlalchemy import text
    try:
        # Thử truy vấn bình thường
        return db.query(Delivery).with_hint(Delivery, 'WITH (NOLOCK)').filter(Delivery.plan_id == plan_id).order_by(Delivery.id.desc()).offset(skip).limit(limit).all()
    except Exception as e:
        # Nếu lỗi (có thể do thiếu cột), thử chạy migration
        if "moisture_min" in str(e) or "moisture_max" in str(e) or "Invalid column name" in str(e):
            try:
                db.rollback()
                db.execute(text("ALTER TABLE deliveries ADD moisture_min FLOAT NULL"))
                db.execute(text("ALTER TABLE deliveries ADD moisture_max FLOAT NULL"))
                db.commit()
                # Sau khi sửa xong, thử truy vấn lại
                return db.query(Delivery).with_hint(Delivery, 'WITH (NOLOCK)').filter(Delivery.plan_id == plan_id).order_by(Delivery.id.desc()).offset(skip).limit(limit).all()
            except Exception as inner_e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Lỗi truy vấn và không thể tự động cập nhật DB: {str(inner_e)}")
        else:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
@router.get("/detail/{delivery_id}", response_model=DeliverySchema)
def get_delivery_detail(delivery_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin chi tiết của một phiếu bàn giao cụ thể.
    Tích hợp tự động sửa lỗi Database nếu thiếu cột độ ẩm.
    """
    from sqlalchemy.orm import joinedload
    from sqlalchemy import text
    try:
        from modules.delivery.models.order import Order as OrderModel
        delivery = db.query(Delivery).with_hint(Delivery, 'WITH (NOLOCK)').options(
            joinedload(Delivery.details).joinedload(DeliveryDetailsModel.order).joinedload(OrderModel.products)
        ).filter(Delivery.id == delivery_id).first()
        if not delivery:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao này.")
            
        # Gán tên người thực hiện giao, nhận và kiểm QC (Tối ưu: Gộp 3 query thành 1 query IN)
        user_ids = list({uid for uid in [delivery.sx_delivery, delivery.sx_receipt, delivery.qc_receipt] if uid})
        name_map = {}
        if user_ids:
            accounts = db.query(AccountModel.id, AccountModel.full_name).with_hint(AccountModel, 'WITH (NOLOCK)').filter(AccountModel.id.in_(user_ids)).all()
            name_map = {a.id: a.full_name for a in accounts}
        
        delivery.sx_delivery_name = name_map.get(delivery.sx_delivery, "N/A") if delivery.sx_delivery else "N/A"
        delivery.sx_receipt_name = name_map.get(delivery.sx_receipt, "---") if delivery.sx_receipt else "---"
        delivery.qc_receipt_name = name_map.get(delivery.qc_receipt, "---") if delivery.qc_receipt else "---"
        
        return delivery
    except Exception as e:
        if "moisture_min" in str(e) or "moisture_max" in str(e) or "Invalid column name" in str(e):
            try:
                db.rollback()
                db.execute(text("ALTER TABLE deliveries ADD moisture_min FLOAT NULL"))
                db.execute(text("ALTER TABLE deliveries ADD moisture_max FLOAT NULL"))
                db.commit()
                # Thử lại sau khi đã sửa DB
                return db.query(Delivery).options(
                    joinedload(Delivery.details).joinedload(DeliveryDetailsModel.order)
                ).filter(Delivery.id == delivery_id).first()
            except Exception as inner_e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Lỗi DB và không thể tự động cập nhật: {str(inner_e)}")
        else:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-backup-qr/{qr_code}")
def get_delivery_by_backup_qr(qr_code: str, db: Session = Depends(get_db)):
    """
    [GET] Kiểm tra mã QR dự phòng. Nếu chưa có thì tự động tạo mới.
    """
    from modules.system.models.backup_qr import BackupQRCode
    backup_qr = db.query(BackupQRCode).filter(BackupQRCode.code == qr_code).first()
    
    if not backup_qr:
        backup_qr = BackupQRCode(code=qr_code, status="Trống")
        db.add(backup_qr)
        db.commit()
        db.refresh(backup_qr)
    else:
        # Tự động giải phóng nếu đang được sử dụng nhưng đã quá thời hạn khóa đặt lịch
        if backup_qr.status == "Đang Sử Dụng" and backup_qr.scheduled_release_at:
            from shared.utils.timezone import get_vietnam_time
            if get_vietnam_time() >= backup_qr.scheduled_release_at:
                backup_qr.status = "Trống"
                backup_qr.current_delivery_id = None
                backup_qr.scheduled_release_at = None
                db.commit()
                db.refresh(backup_qr)
        
    return {
        "id": backup_qr.id,
        "code": backup_qr.code,
        "status": backup_qr.status,
        "current_delivery_id": backup_qr.current_delivery_id,
        "scheduled_release_at": backup_qr.scheduled_release_at.isoformat() if backup_qr.scheduled_release_at else None
    }

@router.post("/backup-qrs")
def create_backup_qr(
    quantity: Optional[int] = None,
    qr_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Khai báo thêm mã QR dự phòng mới. 
    Hỗ trợ tự động tạo theo số lượng (quantity) hoặc thêm thủ công (qr_code).
    """
    from modules.system.models.backup_qr import BackupQRCode
    import re

    if quantity is None and qr_code is None:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp số lượng (quantity) hoặc mã QR (qr_code).")

    added = []
    skipped = []

    # 1. Tự động sinh mã theo số lượng
    if quantity is not None:
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Số lượng tạo phải lớn hơn 0.")
            
        # Lấy tất cả mã QR hiện có để tìm số thứ tự lớn nhất
        existing_qrs = db.query(BackupQRCode.code).all()
        
        # Regex khớp định dạng DP-XXXX
        pattern = re.compile(r'^DP-(\d+)$', re.IGNORECASE)
        nums = []
        for eq in existing_qrs:
            match = pattern.match(eq.code)
            if match:
                nums.append(int(match.group(1)))
                
        next_num = max(nums) + 1 if nums else 1
        
        for i in range(quantity):
            code_num = next_num + i
            final_code = f"DP-{code_num:03d}"
            
            # Đảm bảo không trùng lặp (phòng trường hợp DB có dữ liệu dị biệt)
            existing = db.query(BackupQRCode).filter(BackupQRCode.code == final_code).first()
            if existing:
                skipped.append(final_code)
                continue
                
            new_qr = BackupQRCode(code=final_code, status="Trống")
            db.add(new_qr)
            added.append(final_code)
            
        db.commit()
        
        msg = f"Đã tự động tạo thành công {len(added)} mã QR dự phòng nối tiếp."
        if skipped:
            msg += f" (Bỏ qua {len(skipped)} mã đã tồn tại)"
            
        return {"message": msg, "added": added, "skipped": skipped}

    # 2. Thêm thủ công bằng danh sách (Tương thích ngược)
    else:
        # Tách chuỗi hỗ trợ dấu phẩy, dấu chấm phẩy và xuống dòng (khi dán từ Excel)
        codes = [c.strip() for c in re.split('[,;\n\r]+', qr_code) if c.strip()]
        
        for code in codes:
            # Tự động thêm tiền tố 'DP-' nếu chưa có
            final_code = code if code.upper().startswith('DP-') else f"DP-{code}"
            
            existing = db.query(BackupQRCode).filter(BackupQRCode.code == final_code).first()
            if existing:
                skipped.append(final_code)
                continue
            
            new_qr = BackupQRCode(code=final_code, status="Trống")
            db.add(new_qr)
            added.append(final_code)
        
        db.commit()
        
        msg = f"Đã thêm thành công {len(added)} mã."
        if skipped:
            msg += f" (Bỏ qua {len(skipped)} mã đã tồn tại)"
            
        return {"message": msg, "added": added, "skipped": skipped}

@router.get("/backup-qrs/all")
def list_backup_qrs(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các thẻ QR dự phòng.
    Tích hợp tự động sửa lỗi Database nếu thiếu cột độ ẩm.
    """
    from modules.system.models.backup_qr import BackupQRCode
    from sqlalchemy import text
    from fastapi.responses import JSONResponse
    
    try:
        # Trước khi lấy danh sách, tự động giải phóng các mã QR phụ đã qua mốc hẹn giờ
        from shared.utils.timezone import get_vietnam_time
        now_vn = get_vietnam_time()
        expired_qrs = db.query(BackupQRCode).filter(
            BackupQRCode.status == "Đang Sử Dụng",
            BackupQRCode.scheduled_release_at != None,
            BackupQRCode.scheduled_release_at <= now_vn
        ).all()
        
        if expired_qrs:
            for item in expired_qrs:
                item.status = "Trống"
                item.current_delivery_id = None
                item.scheduled_release_at = None
            db.commit()

        data = db.query(BackupQRCode).order_by(BackupQRCode.id.desc()).all()
        # Chuyển đổi sang dict để có thể trả về JSONResponse với Header tùy chỉnh
        content = [
            {
                "id": item.id, 
                "code": item.code, 
                "status": item.status, 
                "current_delivery_id": item.current_delivery_id,
                "scheduled_release_at": item.scheduled_release_at.isoformat() if item.scheduled_release_at else None
            } for item in data
        ]
        return JSONResponse(
            content=content,
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
        )
    except Exception as e:
        # Tự động sửa lỗi DB nếu phát hiện thiếu cột
        if "moisture" in str(e) or "column" in str(e).lower() or "scheduled" in str(e).lower():
            try:
                db.rollback()
                for ddl in [
                    "ALTER TABLE deliveries ADD moisture_min FLOAT NULL",
                    "ALTER TABLE deliveries ADD moisture_max FLOAT NULL",
                    "ALTER TABLE backup_qr_codes ADD scheduled_release_at DATETIME NULL"
                ]:
                    try:
                        db.execute(text(ddl))
                        db.commit()
                    except Exception:
                        db.rollback()
                        
                # Sau khi sửa xong, thử lại
                data = db.query(BackupQRCode).order_by(BackupQRCode.id.desc()).all()
                content = [{"id": i.id, "code": i.code, "status": i.status, "current_delivery_id": i.current_delivery_id, "scheduled_release_at": i.scheduled_release_at.isoformat() if hasattr(i, 'scheduled_release_at') and i.scheduled_release_at else None} for i in data]
                return JSONResponse(content=content, headers={"Cache-Control": "no-store"})
            except Exception:
                db.rollback()
        
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backup-qrs/{qr_id}/release")
def release_backup_qr(qr_id: int, db: Session = Depends(get_db)):
    """
    [POST] Cưỡng bức giải phóng một thẻ QR dự phòng về trạng thái Trống.
    Dùng cho quản trị viên xử lý sự cố.
    """
    from modules.system.models.backup_qr import BackupQRCode
    qr = db.query(BackupQRCode).filter(BackupQRCode.id == qr_id).first()
    if not qr:
        raise HTTPException(status_code=404, detail="Không tìm thấy thẻ QR.")
    
    qr.status = "Trống"
    qr.current_delivery_id = None
    qr.scheduled_release_at = None
    db.commit()
    return {"message": "Đã giải phóng thẻ QR thành công."}

class ConfirmRequest(BaseModel):
    user_id: Optional[int] = 1
    sx_receipt: Optional[int] = None
    quantity_received: Optional[int] = None # Số lượng thực nhận
    quantity_error: Optional[int] = None # Số lượng lỗi khi trả hàng
    status: Optional[str] = "Hoàn Thành"
    note: Optional[str] = None

@router.patch("/{delivery_id}/confirm", response_model=DeliverySchema)
@router.patch("/{delivery_id}/confirm/", response_model=DeliverySchema)
async def confirm_delivery(
    delivery_id: int,
    request: ConfirmRequest,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    [PATCH] Xác nhận việc nhận hàng hoặc Trả lại hàng.
    Cập nhật số lượng thực nhận, số lượng lỗi, lý do và trạng thái phiếu.
    """
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao này.")
    
    sx_receipt_id = request.sx_receipt or request.user_id or 1
    new_status = request.status or "Hoàn Thành"

    delivery.sx_receipt = sx_receipt_id
    delivery.status = new_status
    if request.note:
        delivery.note = request.note

    if new_status in ["Chờ nhận hàng trả lại", "Chờ xác nhận trả hàng", "Trả lại", "Trả Lại", "Từ chối", "Lỗi"]:
        qty_err = request.quantity_error if (request.quantity_error is not None and request.quantity_error > 0) else (delivery.quantity_error or delivery.quantity_total or 1)
        delivery.quantity_error = qty_err
        delivery.quantity_returned = qty_err
        delivery.quantity_received = 0
    else:
        qty_rec = request.quantity_received if (request.quantity_received is not None and request.quantity_received >= 0) else delivery.quantity_total
        delivery.quantity_received = qty_rec

    db.commit()
    db.refresh(delivery)

    # [NEW] Tạo thông báo trong Database trước
    notif_content = f"Sản xuất đã nhận '{delivery.part_name}' (DLV-{delivery.id}). Mời QC kiểm tra chất lượng."
    try:
        from modules.notification.models.notifications import Notification as NotificationModel
        from modules.production.models.stages import Stage as StageModel
        from sqlalchemy import or_
        
        qc_target_stage_obj = db.query(StageModel).filter(
            or_(StageModel.name == delivery.receiving_stage, StageModel.description == delivery.receiving_stage)
        ).first()
        qc_canonical_stage = qc_target_stage_obj.name if qc_target_stage_obj else delivery.receiving_stage

        new_notif = NotificationModel(
            content=notif_content,
            announcer_id=request.sx_receipt,
            target_group="QC",
            target_stage=qc_canonical_stage,
            priority_status="Bình thường"
        )
        db.add(new_notif)
        db.commit()
    except Exception as e:
        print(f"Lỗi tạo thông báo DB cho QC: {e}")

    # [Background Tasks] Gửi thông báo Push và WebSocket sau khi commit thành công
    if background_tasks:
        try:
            from shared.services.websocket_service import socket_manager
            from shared.services.notification_service import notify_stage
            
            # 1. Gửi Firebase Push (Chạy nền)
            background_tasks.add_task(notify_stage, db, qc_canonical_stage, "Hàng đã nhận - Chờ QC", notif_content, role_filter="QC")

            # 2. Gửi Realtime WebSocket (Chạy nền)
            # Báo cho bộ phận NHẬN (QC)
            background_tasks.add_task(
                socket_manager.broadcast_to_stage,
                db, 
                stage_name=delivery.receiving_stage, 
                message={"type": "DELIVERY_RECEIVED", "delivery_id": delivery.id, "status": delivery.status},
                role_filter="QC"
            )
            # Báo cho bộ phận GIAO (Sản xuất đầu nguồn)
            background_tasks.add_task(
                socket_manager.broadcast_to_stage,
                db, 
                stage_name=delivery.delivery_stage, 
                message={"type": "DELIVERY_RECEIVED", "delivery_id": delivery.id, "status": delivery.status}
            )
        except Exception as e:
            print(f"Lỗi chuẩn bị tác vụ nền cho QC: {e}")


    return delivery

class UpdateDeliveryRequest(BaseModel):
    quantity_total: Optional[int] = None
    residual: Optional[int] = None
    note: Optional[str] = None
    part_name: Optional[str] = None # Cập nhật lại part_name bản ghi chính
    specification: Optional[str] = None # Quy cách
    moisture_min: Optional[float] = None # Độ ẩm tối thiểu
    moisture_max: Optional[float] = None # Độ ẩm tối đa
    order_ids: Optional[str] = None # [NEW] Danh sách ID đơn hàng dạng "1,2,3"

def _do_update_delivery(delivery_id: int, request: UpdateDeliveryRequest, db: Session):
    """
    Logic dùng chung cho cả PUT và PATCH — cập nhật thông tin phiếu bàn giao.
    Chỉ cho phép khi phiếu đang ở trạng thái 'Chờ Nhận Hàng' hoặc 'Chờ Xác Nhận'.
    """
    delivery = db.query(DeliveryModel).filter(DeliveryModel.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao này.")
    
    # Chỉ cho chỉnh sửa khi phiếu chưa được bên nhận xác nhận
    allowed_statuses = ["Chờ Nhận Hàng", "Chờ Xác Nhận"]
    if delivery.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Chỉ có thể chỉnh sửa phiếu khi chưa được nhận.")
    
    # 1. Cập nhật các thông tin cơ bản
    if request.quantity_total is not None:
        delivery.quantity_total = request.quantity_total
            
    if request.residual is not None:
        delivery.residual = request.residual
        
    if request.note is not None:
        delivery.note = request.note

    # 2. Cập nhật part_name và quy cách nếu có
    if request.part_name is not None:
        delivery.part_name = clean_and_standardize_name(request.part_name)
    
    if request.specification is not None:
        delivery.specification = request.specification

    if request.moisture_min is not None:
        delivery.moisture_min = request.moisture_min
        
    if request.moisture_max is not None:
        delivery.moisture_max = request.moisture_max
        
    # Xác định danh sách allowed_order_ids để chạy phân bổ
    if request.order_ids is not None:
        try:
            allowed_order_ids = [int(x.strip()) for x in request.order_ids.split(",") if x.strip()]
        except ValueError:
            allowed_order_ids = []
    else:
        # Nếu không truyền order_ids mới, lấy danh sách order_id hiện tại từ delivery_details
        allowed_order_ids = [
            r[0] for r in db.query(DeliveryDetailsModel.order_id)
            .filter(DeliveryDetailsModel.delivery_id == delivery.id)
            .all()
            if r[0] is not None
        ]
        
    # Cập nhật order_id chính của delivery nếu có duy nhất 1 đơn hàng được chọn
    if allowed_order_ids and len(allowed_order_ids) == 1:
        delivery.order_id = allowed_order_ids[0]
    else:
        delivery.order_id = None
        
    db.flush()
    # 3. Tái phân bổ lại chi tiết FIFO nếu số lượng hoặc tên/quy cách hoặc đơn hàng thay đổi
    allocate_delivery_fifo(
        db, 
        delivery_id=delivery.id, 
        plan_id=delivery.plan_id, 
        part_name=delivery.part_name, 
        quantity=delivery.quantity_total, 
        specification=delivery.specification,
        exclude_delivery_id=delivery.id, # Loại trừ chính nó khi tính already_assigned
        allowed_order_ids=allowed_order_ids
    )
        
    db.commit()
    db.refresh(delivery)
    return delivery

@router.put("/{delivery_id}", response_model=DeliverySchema)
def update_delivery(
    delivery_id: int,
    request: UpdateDeliveryRequest,
    db: Session = Depends(get_db)
):
    """
    [PUT] Cập nhật thông tin phiếu bàn giao (Dành cho bên giao chỉnh sửa).
    """
    return _do_update_delivery(delivery_id, request, db)

@router.patch("/{delivery_id}/update", response_model=DeliverySchema)
def update_delivery_patch(
    delivery_id: int,
    request: UpdateDeliveryRequest,
    db: Session = Depends(get_db)
):
    """
    [PATCH] Cập nhật thông tin phiếu bàn giao (Alias cho frontend Mobile gọi).
    """
    return _do_update_delivery(delivery_id, request, db)

@router.get("/stats/daily", response_model=dict)
def get_daily_delivery_stats(
    stage: str, 
    date: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy tổng số lượng sản phẩm đã bàn giao trong ngày của một công đoạn.
    Dùng cho màn hình Daily Inspection.
    """
    if not date:
        date = datetime.date.today().isoformat()
    
    try:
        start_date = datetime.datetime.fromisoformat(date)
    except:
        start_date = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
    end_date = start_date + datetime.timedelta(days=1)
    
    # Tính tổng quantity_total của các phiếu delivery_stage == stage trong ngày
    total_qty = db.query(func.sum(DeliveryModel.quantity_total)).filter(
        or_(DeliveryModel.delivery_stage == stage, DeliveryModel.delivery_stage.contains(stage)),
        DeliveryModel.created_at >= start_date,
        DeliveryModel.created_at < end_date
    ).scalar() or 0
    
    return {"total_quantity": total_qty, "date": date, "stage": stage}

@router.delete("/{delivery_id}")
def delete_delivery(delivery_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa phiếu bàn giao khi chưa được nhận (status = 'Chờ Nhận Hàng').
    Giải phóng mã QR dự phòng và xóa ảnh/chi tiết liên quan.
    """
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao.")
    
    if delivery.status != "Chờ Nhận Hàng":
        raise HTTPException(status_code=400, detail="Chỉ có thể xóa phiếu khi trạng thái là 'Chờ Nhận Hàng'.")
    
    # 1. Giải phóng mã QR dự phòng (nếu có)
    if delivery.backup_qr:
        try:
            from modules.system.models.backup_qr import BackupQRCode
            qr = db.query(BackupQRCode).filter(BackupQRCode.code == delivery.backup_qr).first()
            if qr:
                qr.status = "Trống"
                qr.current_delivery_id = None
                qr.scheduled_release_at = None
        except Exception:
            pass
    
    # 2. Xóa delivery_details liên quan
    db.query(DeliveryDetailsModel).filter(DeliveryDetailsModel.delivery_id == delivery_id).delete()
    
    # 3. Xóa delivery_images liên quan
    db.query(DeliveryImage).filter(DeliveryImage.delivery_id == delivery_id).delete()
    
    # 4. Xóa delivery
    db.delete(delivery)
    db.commit()
    
    return {"message": "Đã xóa phiếu bàn giao thành công.", "id": delivery_id}


@router.post("/upload-image")
@router.post("/upload-image/")
async def upload_delivery_image(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    [POST] Tải lên hình ảnh bàn giao (Delivery image).
    Lưu vào BackEnd/static/uploads/deliveries/
    """
    upload_file = image or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp ảnh tải lên.")

    upload_dir = get_upload_dir("deliveries")

    file_ext = os.path.splitext(upload_file.filename or "")[1]
    if not file_ext:
        file_ext = ".jpg"
    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, new_filename)

    with open(file_path, "wb") as buffer:
        content = await upload_file.read()
        buffer.write(content)

    return {"url": f"/static/uploads/deliveries/{new_filename}", "success": True}



@router.get("/history")
def get_deliveries_history(
    plan_id: Optional[str] = Query(None),
    po_code: Optional[str] = Query(None),
    limit: int = Query(10000),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy toàn bộ lịch sử bàn giao theo query params (plan_id, po_code).
    """
    return _do_get_deliveries_by_plan(plan_id, po_code, limit, db)

@router.get("/plan/{plan_id}")
def get_deliveries_by_plan(
    plan_id: str,
    po_code: Optional[str] = Query(None),
    limit: int = Query(10000),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy toàn bộ lịch sử bàn giao theo plan_id trong path.
    """
    return _do_get_deliveries_by_plan(plan_id, po_code, limit, db)

def _do_get_deliveries_by_plan(plan_id: Optional[str], po_code: Optional[str], limit: int, db: Session):
    from modules.delivery.models.order import Order as OrderModel
    from modules.auth.models.accounts import Account as AccountModel
    
    clean_plan = str(plan_id or "").strip()
    is_all = (clean_plan.lower() in ["all", "0", "-1", ""] and not po_code)
    
    orders_query = db.query(OrderModel)
    if not is_all and clean_plan.isdigit():
        orders_query = orders_query.filter(OrderModel.plan_id == int(clean_plan))
    orders = orders_query.all()
    order_map = {o.id: o.order_code for o in orders}
    order_ids = list(order_map.keys())
    
    deliv_query = db.query(DeliveryModel)
    if not is_all and clean_plan.isdigit():
        deliv_query = deliv_query.filter(
            or_(
                DeliveryModel.plan_id == int(clean_plan),
                DeliveryModel.order_id.in_(order_ids) if order_ids else False,
                DeliveryModel.id.in_(
                    db.query(DeliveryDetailsModel.delivery_id).filter(DeliveryDetailsModel.order_id.in_(order_ids))
                ) if order_ids else False
            )
        )
    if po_code:
        deliv_query = deliv_query.filter(
            or_(
                DeliveryModel.note.ilike(f"%{po_code}%"),
                DeliveryModel.backup_qr.ilike(f"%{po_code}%")
            )
        )
        
    deliveries = deliv_query.order_by(DeliveryModel.created_at.asc()).limit(limit).all()
    
    # Batch load accounts
    acc_ids = set()
    d_ids = []
    for d in deliveries:
        d_ids.append(d.id)
        if d.sx_delivery: acc_ids.add(d.sx_delivery)
        if d.sx_receipt: acc_ids.add(d.sx_receipt)
        if d.qc_receipt: acc_ids.add(d.qc_receipt)
        
    acc_map = {}
    if acc_ids:
        accs = db.query(AccountModel.id, AccountModel.full_name).filter(AccountModel.id.in_(list(acc_ids))).all()
        acc_map = {a.id: a.full_name for a in accs}
        
    deliv_order_map = {}
    if d_ids:
        for chunk in [d_ids[i:i + 1000] for i in range(0, len(d_ids), 1000)]:
            dds = db.query(DeliveryDetailsModel.delivery_id, DeliveryDetailsModel.order_id).filter(DeliveryDetailsModel.delivery_id.in_(chunk)).all()
            for d_id, o_id in dds:
                if o_id in order_map:
                    deliv_order_map[d_id] = order_map[o_id]
                
    results = []
    for d in deliveries:
        q_tot = d.quantity_total or 0
        q_err = d.quantity_error or 0
        q_ok = max(0, q_tot - q_err)
        po_c = deliv_order_map.get(d.id) or (order_map.get(d.order_id) if d.order_id else (d.part_name or "---"))
        
        results.append({
            "id": d.id,
            "delivery_id": d.backup_qr or f"BG-{d.created_at.strftime('%y%m%d') if d.created_at else '260726'}-{d.id:03d}",
            "po_code": po_c,
            "created_at": d.created_at,
            "status": d.status or "Hoàn thành",
            "delivery_stage": d.delivery_stage or "Lắp Ráp 1",
            "receiving_stage": d.receiving_stage or "Sơn 1",
            "part_name": d.part_name or "Chi tiết sản phẩm",
            "specification": d.specification or "Tiêu chuẩn kỹ thuật",
            "quantity_total": q_tot,
            "quantity_ok": q_ok,
            "quantity_ng": q_err,
            "quantity_returned": d.quantity_returned or 0,
            "residual": d.residual or 0,
            "note": d.note or "",
            "sx_delivery_name": acc_map.get(d.sx_delivery, "Công nhân giao"),
            "sx_receipt_name": acc_map.get(d.sx_receipt, "Công nhân nhận"),
            "qc_receipt_name": acc_map.get(d.qc_receipt, "QC xác nhận")
        })
        
    return results

