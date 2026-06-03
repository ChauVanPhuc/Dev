import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
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
from config.settings import settings

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
    residual: int

    class Config:
        from_attributes = True


# Thư mục lưu trữ ảnh bàn giao sản phẩm/chi tiết
UPLOAD_DIR = "static/uploads/deliveries"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def allocate_delivery_fifo(db: Session, delivery_id: int, plan_id: int, part_name: str, quantity: int, specification: Optional[str] = None, exclude_delivery_id: Optional[int] = None, allowed_order_ids: Optional[List[int]] = None):
    """
    [HELPER] Tự động phân bổ số lượng bàn giao vào các đơn hàng trong kế hoạch (Rót hàng FIFO).
    TỐI ƯU: Sử dụng Bulk Query để tránh N+1 Query.
    """
    from modules.delivery.models.order import Order as OrderModel
    from modules.production.models.product import Product as ProductModel
    from modules.production.models.bom_detail import BOMDetail as BomDetailModel
    from sqlalchemy import func, or_
    
    # 0. Xóa chi tiết cũ nếu có (dùng cho update)
    db.query(DeliveryDetailsModel).filter(DeliveryDetailsModel.delivery_id == delivery_id).delete()
    
    # 1. Lấy danh sách đơn hàng sắp xếp theo ưu tiên
    orders_query = db.query(OrderModel).filter(OrderModel.plan_id == plan_id)
    if allowed_order_ids is not None:
        orders_query = orders_query.filter(OrderModel.id.in_(allowed_order_ids))
    orders = orders_query.order_by(
        OrderModel.is_priority.desc(), 
        OrderModel.priority_score.desc(), 
        OrderModel.id.asc()
    ).all()
    
    if not orders or quantity <= 0:
        # Nếu không có đơn hàng, tạo 1 chi tiết chung
        new_detail = DeliveryDetailsModel(
            delivery_id=delivery_id,
            part_name=part_name,
            quantity=quantity,
            order_id=None
        )
        db.add(new_detail)
        db.flush()
        return

    # 2. [BULK QUERY] Lấy tổng nhu cầu linh kiện cho TẤT CẢ đơn hàng trong kế hoạch
    order_ids = [o.id for o in orders]
    needed_query = db.query(
        ProductModel.order_id,
        func.sum(BomDetailModel.quantity * func.coalesce(ProductModel.total_qty, ProductModel.quantity, 0)).label("total_needed")
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
        # 1. [CHUẨN HÓA & FETCH MỘT LẦN] Tìm mã công đoạn và thông tin người dùng
        from modules.production.models.stages import Stage as StageModel
        from sqlalchemy import or_
        
        # Lấy tất cả thông tin cần thiết trong ít truy vấn nhất
        user_info = db.query(AccountModel).filter(AccountModel.id == user_id).first()
        user_name = user_info.full_name if user_info else "Một nhân viên"
        
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

        # 3. Chia chi tiết theo đơn hàng chọn thủ công hoặc chạy Tự động FIFO
        allowed_order_ids = None
        if order_ids:
            try:
                allowed_order_ids = [int(x.strip()) for x in order_ids.split(",") if x.strip()]
            except ValueError:
                allowed_order_ids = None
        allocate_delivery_fifo(db, new_delivery.id, plan_id, part_name, quantity, specification, allowed_order_ids=allowed_order_ids)

        # 4. Cập nhật thẻ QR dự phòng
        if backup_qr:
            from modules.system.models.backup_qr import BackupQRCode
            b_qr = db.query(BackupQRCode).filter(BackupQRCode.code == backup_qr).first()
            if b_qr:
                b_qr.status = "Đang Sử Dụng"
                b_qr.current_delivery_id = new_delivery.id

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
        from modules.auth.models.departments import Department as DeptModel
        sender_dept = db.query(DeptModel).filter(DeptModel.account_id == user_id).first()
        sender_stage_desc = ""
        if sender_dept and sender_dept.stage_id:
            s_stage = db.query(StageModel).filter(StageModel.id == sender_dept.stage_id).first()
            if s_stage: sender_stage_desc = f" ({s_stage.description})"

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
        
        # 7. Tác vụ nền (Firebase Push & WebSocket)
        if background_tasks:
            push_title = "Có phiếu bàn giao mới"
            push_body = f"{display_sender} đã chuyển '{part_name}' (SL: {quantity}) đến công đoạn của bạn. Mời xác nhận nhận hàng."
            from shared.services.notification_service import notify_stage
            from shared.services.websocket_service import socket_manager
            
            background_tasks.add_task(notify_stage, db, canonical_receiving_stage, push_title, push_body, role_filter="SX")
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

@router.get("/", response_model=List[DeliveryDashboardResponse])
def get_all_deliveries(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy toàn bộ danh sách phiếu bàn giao phục vụ Dashboard.
    Kết hợp join bảng Account để lấy tên người giao và người nhận.
    """
    from sqlalchemy.orm import aliased
    Sender = aliased(AccountModel)
    Receiver = aliased(AccountModel)

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
    ).order_by(DeliveryModel.id.desc())

    results = query.offset(skip).limit(limit).all()
    return results


@router.get("/exceptions", response_model=List[DeliveryDashboardResponse])
def get_exception_deliveries(
    skip: int = 0, 
    limit: int = 100, 
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
    ).order_by(DeliveryModel.id.desc())

    results = query.offset(skip).limit(limit).all()
    return results


@router.get("/image-proxy")
async def get_image_proxy(path: str):
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
            
        return FileResponse(full_path)
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now()}: CRITICAL ERROR: {err_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{plan_id}", response_model=List[DeliverySchema])
def get_deliveries_by_plan(plan_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các phiếu bàn giao thuộc một kế hoạch sản xuất.
    Tích hợp tự động sửa lỗi Database nếu thiếu cột độ ẩm.
    """
    from sqlalchemy import text
    try:
        # Thử truy vấn bình thường
        return db.query(Delivery).filter(Delivery.plan_id == plan_id).order_by(Delivery.id.desc()).offset(skip).limit(limit).all()
    except Exception as e:
        # Nếu lỗi (có thể do thiếu cột), thử chạy migration
        if "moisture_min" in str(e) or "moisture_max" in str(e) or "Invalid column name" in str(e):
            try:
                db.rollback()
                db.execute(text("ALTER TABLE deliveries ADD moisture_min FLOAT NULL"))
                db.execute(text("ALTER TABLE deliveries ADD moisture_max FLOAT NULL"))
                db.commit()
                # Sau khi sửa xong, thử truy vấn lại
                return db.query(Delivery).filter(Delivery.plan_id == plan_id).order_by(Delivery.id.desc()).offset(skip).limit(limit).all()
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
        delivery = db.query(Delivery).options(
            joinedload(Delivery.details).joinedload(DeliveryDetailsModel.order)
        ).filter(Delivery.id == delivery_id).first()
        if not delivery:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao này.")
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
    user_id: int
    sx_receipt: int
    quantity_received: int # Số lượng thực nhận
    status: str = "Chờ Kiểm Tra"

@router.patch("/{delivery_id}/confirm", response_model=DeliverySchema)
async def confirm_delivery(
    delivery_id: int,
    request: ConfirmRequest,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    [PATCH] Xác nhận việc nhận hàng.
    Cập nhật số lượng thực nhận và trạng thái phiếu.
    """
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao này.")
    
    # Kiểm tra phân quyền: Chỉ người dùng thuộc công đoạn nhận (receiving_stage) hoặc có quyền Admin/IT/BGD mới được phép xác nhận.
    from modules.auth.models.departments import Department as DeptModel
    from modules.auth.models.role import Role as RoleModel
    from modules.auth.models.permissions import Permission as PermModel
    from modules.production.models.stages import Stage as StageModel

    # Lấy thông tin phòng ban/quyền/vai trò của người dùng thực hiện xác nhận (sx_receipt)
    user_depts = db.query(DeptModel).filter(DeptModel.account_id == request.sx_receipt).all()
    
    is_admin = False
    user_stages = []
    
    for dept in user_depts:
        if dept.role_id:
            role = db.query(RoleModel).filter(RoleModel.id == dept.role_id).first()
            if role and role.name and any(kw in role.name.lower() for kw in ["admin", "it", "bgd"]):
                is_admin = True
        if dept.permission_id:
            perm = db.query(PermModel).filter(PermModel.id == dept.permission_id).first()
            if perm and perm.name and "admin" in perm.name.lower():
                is_admin = True
        if dept.stage_id:
            stage = db.query(StageModel).filter(StageModel.id == dept.stage_id).first()
            if stage:
                user_stages.append(stage)
                
    if not is_admin:
        # So khớp với receiving_stage (hỗ trợ fuzzy match tương tự frontend)
        def is_match_stage(user_s: str, delivery_s: str) -> bool:
            if not user_s or not delivery_s:
                return False
            import unicodedata
            u_norm = unicodedata.normalize('NFC', user_s).lower().replace(" ", "")
            d_norm = unicodedata.normalize('NFC', delivery_s).lower().replace(" ", "")
            u_clean = u_norm.replace("dh", "địnhhình").replace("lr", "lắpráp").replace("dg", "đónggói")
            d_clean = d_norm.replace("dh", "địnhhình").replace("lr", "lắpráp").replace("dg", "đónggói")
            return u_clean in d_clean or d_clean in u_clean

        is_receiver = False
        for stage in user_stages:
            if stage.name and is_match_stage(stage.name, delivery.receiving_stage):
                is_receiver = True
                break
            if stage.description and is_match_stage(stage.description, delivery.receiving_stage):
                is_receiver = True
                break
                
        if not is_receiver:
            raise HTTPException(
                status_code=403, 
                detail="Bạn không thuộc công đoạn nhận của phiếu này, không có quyền xác nhận."
            )
            
    delivery.sx_receipt = request.sx_receipt # Lưu ID người xác nhận nhận
    delivery.quantity_received = request.quantity_received # Lưu số lượng thực nhận
    delivery.status = request.status
    delivery.qc_receipt = request.user_id # Có thể dùng user_id của người đang login để lưu vết
    
    # QR code is no longer released here. It will be released after QC confirms.

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
                message={"type": "DELIVERY_RECEIVED", "delivery_id": delivery.id, "status": delivery.status}
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
        delivery.part_name = request.part_name
    
    if request.specification is not None:
        delivery.specification = request.specification

    if request.moisture_min is not None:
        delivery.moisture_min = request.moisture_min
        
    if request.moisture_max is not None:
        delivery.moisture_max = request.moisture_max
        
    db.flush()
    # 3. Tái phân bổ lại chi tiết FIFO nếu số lượng hoặc tên/quy cách thay đổi
    if request.quantity_total is not None or request.part_name is not None or request.specification is not None:
        allocate_delivery_fifo(
            db, 
            delivery_id=delivery.id, 
            plan_id=delivery.plan_id, 
            part_name=delivery.part_name, 
            quantity=delivery.quantity_total, 
            specification=delivery.specification,
            exclude_delivery_id=delivery.id # Loại trừ chính nó khi tính already_assigned
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
