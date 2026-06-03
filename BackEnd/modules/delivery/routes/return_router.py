import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from config.database import get_db
from modules.delivery.models.delivery_returns import DeliveryReturn
from modules.delivery.models.delivery_images import DeliveryImage
from modules.notification.models.notifications import Notification as NotificationModel
from modules.auth.models.accounts import Account as AccountModel
from modules.production.models.stages import Stage as StageModel
from shared.services.notification_service import notify_stage

router = APIRouter()

def get_canonical_stage(db: Session, stage_str: str) -> str:
    """
    Chuẩn hóa tên công đoạn bằng cách loại bỏ tiền tố QC (nếu có)
    và tra cứu trong DB để lấy ra tên chuẩn (Stage.name).
    """
    clean_stage = stage_str.strip()
    if clean_stage.upper().startswith("QC "):
        clean_stage = clean_stage[3:]
    elif clean_stage.upper().startswith("QC"):
        clean_stage = clean_stage[2:]
    
    stage_obj = db.query(StageModel).filter(
        or_(StageModel.name == clean_stage, StageModel.description == clean_stage)
    ).first()
    return stage_obj.name if stage_obj else clean_stage

# Schema for SX confirmation request
class ReturnConfirmRequest(BaseModel):
    user_id: int
    note: Optional[str] = None
    sx_confirmation_note: Optional[str] = None
    status: str = "Đã SX Xác Nhận"


UPLOAD_DIR = "static/uploads/returns"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def create_return_slip(
    plan_id: int = Form(...),
    delivery_id: Optional[int] = Form(None), # [NEW] Nhận thêm delivery_id
    from_stage: str = Form(...),
    to_stage: str = Form(...),
    part_name: str = Form(...),
    quantity: int = Form(...),
    note: Optional[str] = Form(None),
    user_id: int = Form(...),
    status: str = Form("Chờ SX Xác Nhận"),
    allocation_method: str = Form("LIFO"),  # Mặc định trừ PO cuối
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db)
):
    """
    [POST] Tạo phiếu trả hàng QC kèm ảnh minh chứng.
    """
    try:
        # 1. Tạo bản ghi trả hàng
        new_return = DeliveryReturn(
            plan_id=plan_id,
            delivery_id=delivery_id, # [NEW]
            from_stage=from_stage,
            to_stage=to_stage,
            part_name=part_name,
            quantity=quantity,
            note=note,
            reason="", # Để trống theo yêu cầu
            created_by=user_id,
            status=status,
            allocation_method=allocation_method,  # [NEW]
            created_at=datetime.datetime.now()
        )
        db.add(new_return)
        db.flush() # Lấy ID để gán cho ảnh

        # [NEW] Nếu có delivery_id, thực hiện phân bổ số lượng trả hàng
        if delivery_id:
            from modules.delivery.models.deliveries import Delivery
            delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
            if delivery:
                # Phân bổ số lượng trả hàng vào delivery_details
                residual = delivery.residual or 0
                allocate_return_to_details(
                    db=db,
                    delivery_id=delivery_id,
                    return_qty=quantity,
                    residual=residual,
                    method=allocation_method
                )

                # Cập nhật trạng thái delivery - cộng dồn quantity_returned
                current_returned = delivery.quantity_returned or 0
                delivery.quantity_returned = current_returned + quantity
                delivery.status = "Trả Hàng"

        # 2. Xử lý Upload ảnh minh chứng
        for file in files:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"RET_{new_return.id}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            image_url = f"/static/uploads/returns/{unique_filename}"
            new_image = DeliveryImage(
                return_id=new_return.id,
                image_path=image_url,
                description="ảnh trả hàng"
            )
            db.add(new_image)
            
        # 3. --- TỰ ĐỘNG TẠO THÔNG BÁO ---
        user_info = db.query(AccountModel).filter(AccountModel.id == user_id).first()
        user_name = user_info.full_name if user_info else "Một nhân viên"
        
        # Tìm mã công đoạn chuẩn của nơi nhận trả
        target_stage_obj = db.query(StageModel).filter(
            or_(StageModel.name == to_stage, StageModel.description == to_stage)
        ).first()
        canonical_to_stage = target_stage_obj.name if target_stage_obj else to_stage

        notif_content = f"{user_name} ({from_stage}) đã tạo phiếu TRẢ HÀNG cho chi tiết '{part_name}' (SL: {quantity}) về công đoạn {to_stage}. Mời SX xác nhận nhận hàng."
        
        # Lưu vào bảng notifications để hiển thị trong app
        new_notification = NotificationModel(
            content=notif_content,
            announcer_id=user_id,
            target_group="Sản xuất",
            target_stage=canonical_to_stage,
            priority_status="Quan trọng"
        )
        db.add(new_notification)

        db.commit()
        db.refresh(new_return)
        
        # [Realtime WebSocket]
        try:
            from shared.services.websocket_service import socket_manager
            # Gửi tin nhắn cập nhật cho cả bên trả (from_stage) và bên nhận (to_stage)
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=get_canonical_stage(db, from_stage),
                message={"type": "UPDATE_DELIVERY", "delivery_id": delivery_id, "status": "Trả Hàng"}
            )
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=get_canonical_stage(db, to_stage),
                message={"type": "UPDATE_DELIVERY", "delivery_id": delivery_id, "status": "Trả Hàng"}
            )
        except Exception as e:
            print(f"Lỗi gửi tin realtime tạo trả hàng: {e}")
            
        # [Firebase Push] Gửi thông báo đẩy
        try:
            push_title = "Có phiếu TRẢ HÀNG mới"
            push_body = f"{user_name} đã trả '{part_name}' (SL: {quantity}) về công đoạn của bạn."
            notify_stage(db, canonical_to_stage, push_title, push_body)
        except Exception as e:
            print(f"Lỗi gửi push trả hàng: {e}")
        
        return {
            "status": "success",
            "message": "Đã tạo phiếu trả hàng thành công.",
            "data": new_return
        }

    except Exception as e:
        db.rollback()
        print(f"Error creating return: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi tạo phiếu trả hàng: {str(e)}")

@router.get("/pending")
def get_pending_returns(
    to_stage: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu trả hàng chờ SX xác nhận
    Có thể filter theo to_stage (công đoạn nhận)
    """
    query = db.query(DeliveryReturn).filter(DeliveryReturn.status == "Chờ SX Xác Nhận")
    
    if to_stage:
        query = query.filter(DeliveryReturn.to_stage == to_stage)
    
    returns = query.order_by(DeliveryReturn.created_at.desc()).offset(skip).limit(limit).all()
    return returns

@router.get("/{plan_id}")
def get_plan_returns(plan_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách phiếu trả hàng theo kế hoạch.
    """
    returns = db.query(DeliveryReturn).filter(DeliveryReturn.plan_id == plan_id).all()
    return returns

@router.get("/detail/{return_id}")
def get_return_detail(return_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết phiếu trả hàng
    """
    from sqlalchemy.orm import joinedload
    
    return_record = db.query(DeliveryReturn).options(
        joinedload(DeliveryReturn.images)
    ).filter(DeliveryReturn.id == return_id).first()
    
    if not return_record:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu trả hàng")
    
    # Lấy thêm thông tin người xác nhận
    if return_record.sx_confirmed_by:
        confirmer = db.query(AccountModel).filter(AccountModel.id == return_record.sx_confirmed_by).first()
        return_record.confirmer_name = confirmer.full_name if confirmer else None
    
    return return_record

@router.patch("/{return_id}/confirm")
async def confirm_return(
    return_id: int,
    request: ReturnConfirmRequest,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    [PATCH] SX xác nhận nhận hàng bị trả
    """
    try:
        # 1. Lấy phiếu trả hàng
        return_record = db.query(DeliveryReturn).filter(DeliveryReturn.id == return_id).first()
        if not return_record:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu trả hàng")
        
        # 2. Kiểm tra quyền (chỉ SX tại to_stage mới được xác nhận, trừ Admin/Manager)
        from modules.auth.models.departments import Department as DeptModel
        from modules.auth.models.role import Role
        from modules.auth.models.permissions import Permission
        
        user_info = db.query(AccountModel).filter(AccountModel.id == request.user_id).first()
        if not user_info:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin người dùng")
        
        # Lấy danh sách công đoạn và vai trò của user từ departments
        user_depts = db.query(DeptModel).filter(DeptModel.account_id == request.user_id).all()
        user_stages = []
        user_is_admin = False
        
        for dept in user_depts:
            if dept.input_stage and dept.input_stage not in user_stages:
                user_stages.append(dept.input_stage)
            if dept.output_stage and dept.output_stage not in user_stages:
                user_stages.append(dept.output_stage)
            
            if dept.role_id:
                role_obj = db.query(Role).filter(Role.id == dept.role_id).first()
                if role_obj and role_obj.name:
                    role_upper = role_obj.name.upper()
                    if any(keyword in role_upper for keyword in ["ADMIN", "QUẢN LÝ", "GIÁM ĐỐC", "MANAGER"]):
                        user_is_admin = True
                        
            if dept.permission_id:
                perm_obj = db.query(Permission).filter(Permission.id == dept.permission_id).first()
                if perm_obj and (perm_obj.name or perm_obj.description):
                    perm_desc = (perm_obj.description or perm_obj.name).upper()
                    if any(keyword in perm_desc for keyword in ["ADMIN", "QUẢN LÝ", "GIÁM ĐỐC", "MANAGER"]):
                        user_is_admin = True
        
        # Kiểm tra xem user có thuộc to_stage không, hoặc là người gửi phiếu bàn giao gốc
        from modules.delivery.models.deliveries import Delivery
        delivery = db.query(Delivery).filter(Delivery.id == return_record.delivery_id).first() if return_record.delivery_id else None
        is_delivery_sender = delivery and delivery.sx_delivery == request.user_id

        if not user_is_admin and return_record.to_stage not in user_stages and not is_delivery_sender:
            raise HTTPException(status_code=403, detail=f"Bạn không có quyền xác nhận phiếu trả hàng này. Công đoạn của bạn: {', '.join(user_stages) if user_stages else 'Không có'}")
        
        # 3. Cập nhật thông tin xác nhận
        return_record.sx_confirmed_by = request.user_id
        return_record.sx_confirmed_at = datetime.datetime.now()
        return_record.sx_confirmation_note = request.sx_confirmation_note or request.note
        return_record.status = request.status

        # Cập nhật trạng thái phiếu bàn giao thành "Hoàn thành" sau khi xác nhận trả hàng
        if delivery:
            delivery.status = "Hoàn thành"
        
        # 4. Tạo thông báo phản hồi cho QC
        sx_name = user_info.full_name if user_info else "Nhân viên SX"
        notif_content = f"{sx_name} ({return_record.to_stage}) đã xác nhận nhận '{return_record.part_name}' (SL: {return_record.quantity}). Bắt đầu xử lý."
        
        new_notification = NotificationModel(
            content=notif_content,
            announcer_id=request.user_id,
            target_group="QC",
            target_stage=return_record.from_stage,
            priority_status="Bình thường"
        )
        db.add(new_notification)
        
        db.commit()
        db.refresh(return_record)
        
        # [Realtime WebSocket]
        try:
            from shared.services.websocket_service import socket_manager
            # Gửi tin nhắn cập nhật cho cả bên trả (from_stage) và bên nhận trả (to_stage)
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=get_canonical_stage(db, return_record.from_stage),
                message={"type": "UPDATE_DELIVERY", "delivery_id": return_record.delivery_id, "status": "Hoàn thành"}
            )
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=get_canonical_stage(db, return_record.to_stage),
                message={"type": "UPDATE_DELIVERY", "delivery_id": return_record.delivery_id, "status": "Hoàn thành"}
            )
        except Exception as e:
            print(f"Lỗi gửi tin realtime xác nhận trả hàng: {e}")
        
        # 5. Gửi thông báo đẩy (Firebase)
        if background_tasks:
            try:
                push_title = "SX đã xác nhận trả hàng"
                push_body = f"{sx_name} đã nhận hàng bị trả. Đang xử lý."
                notify_stage(db, return_record.from_stage, push_title, push_body)
            except Exception as e:
                print(f"Lỗi gửi push: {e}")
        
        return {
            "status": "success",
            "message": "Đã xác nhận nhận hàng thành công",
            "data": return_record
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xác nhận: {str(e)}")

@router.get("/by-delivery/{delivery_id}")
def get_return_by_delivery(delivery_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy phiếu trả hàng liên kết trực tiếp với phiếu giao hàng.
    Nếu chưa liên kết (phiếu cũ), tìm dự phòng và cập nhật liên kết.
    """
    from sqlalchemy.orm import joinedload
    from modules.delivery.models.deliveries import Delivery
    
    # 1. Tìm theo delivery_id trực tiếp
    ret = db.query(DeliveryReturn).options(
        joinedload(DeliveryReturn.images)
    ).filter(DeliveryReturn.delivery_id == delivery_id).first()
    
    if ret:
        # Gán tên người xác nhận nếu có
        if ret.sx_confirmed_by:
            confirmer = db.query(AccountModel).filter(AccountModel.id == ret.sx_confirmed_by).first()
            ret.confirmer_name = confirmer.full_name if confirmer else None
        return ret
        
    # 2. Dự phòng: Nếu chưa liên kết, tìm phiếu giao hàng tương ứng
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao")
        
    # Tìm kiếm dự phòng các phiếu trả cũ chưa có delivery_id
    # to_stage của phiếu trả khớp với delivery_stage của phiếu giao (nơi giao hàng lỗi)
    part_base = delivery.part_name.split(' - ')[0] if delivery.part_name else ""
    
    query = db.query(DeliveryReturn).options(
        joinedload(DeliveryReturn.images)
    ).filter(
        DeliveryReturn.delivery_id.is_(None),
        DeliveryReturn.plan_id == delivery.plan_id,
        DeliveryReturn.to_stage == delivery.delivery_stage
    )
    
    # Lọc theo part_name tương đối
    if part_base:
        query = query.filter(DeliveryReturn.part_name.like(f"%{part_base}%"))
        
    fallback_ret = query.first()
    
    if fallback_ret:
        # Cập nhật liên kết ngược lại cơ sở dữ liệu
        fallback_ret.delivery_id = delivery_id
        db.commit()
        db.refresh(fallback_ret)
        
        # Gán tên người xác nhận nếu có
        if fallback_ret.sx_confirmed_by:
            confirmer = db.query(AccountModel).filter(AccountModel.id == fallback_ret.sx_confirmed_by).first()
            fallback_ret.confirmer_name = confirmer.full_name if confirmer else None
            
        return fallback_ret

    raise HTTPException(status_code=404, detail="Không tìm thấy phiếu trả hàng cho phiếu bàn giao này")


# Helper function for return allocation
def allocate_return_to_details(db: Session, delivery_id: int, return_qty: int, residual: int, method: str = 'FIFO'):
    """
    Phân bổ số lượng trả hàng bằng cách TRỰC TIẾP CẬP NHẬT delivery_details.quantity
    Trừ từ residual trước, sau đó trừ từ delivery_details

    Args:
        db: Database session
        delivery_id: ID của delivery cần phân bổ
        return_qty: Số lượng trả hàng
        residual: Số dư hiện tại của delivery
        method: Chiến lược phân bổ ('FIFO', 'LIFO', 'PROPORTIONAL')
    """
    from modules.delivery.models.deliveries import Delivery
    from modules.delivery.models.delivery_details import DeliveryDetails

    remaining_to_allocate = return_qty

    # Bước 1: Trừ từ số dư trước
    if residual > 0 and remaining_to_allocate > 0:
        deduct_from_residual = min(residual, remaining_to_allocate)
        delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
        if delivery:
            delivery.residual = max(0, residual - deduct_from_residual)
            db.flush()
        remaining_to_allocate -= deduct_from_residual

    # Bước 2: Trừ từ delivery_details theo chiến lược
    if remaining_to_allocate > 0:
        if method == 'FIFO':
            # Lấy details theo thứ tự id ASC
            details = db.query(DeliveryDetails).filter(
                DeliveryDetails.delivery_id == delivery_id
            ).order_by(DeliveryDetails.id.asc()).all()

            for detail in details:
                if remaining_to_allocate <= 0:
                    break

                if detail.quantity > 0:
                    deduct = min(detail.quantity, remaining_to_allocate)
                    detail.quantity = max(0, detail.quantity - deduct)
                    remaining_to_allocate -= deduct

        elif method == 'LIFO':
            # Lấy details theo thứ tự id DESC
            details = db.query(DeliveryDetails).filter(
                DeliveryDetails.delivery_id == delivery_id
            ).order_by(DeliveryDetails.id.desc()).all()

            for detail in details:
                if remaining_to_allocate <= 0:
                    break

                if detail.quantity > 0:
                    deduct = min(detail.quantity, remaining_to_allocate)
                    detail.quantity = max(0, detail.quantity - deduct)
                    remaining_to_allocate -= deduct

        elif method == 'PROPORTIONAL':
            # Lấy tất cả details
            details = db.query(DeliveryDetails).filter(
                DeliveryDetails.delivery_id == delivery_id
            ).all()

            total_qty = sum(d.quantity for d in details)

            if total_qty > 0:
                # Phân bổ tỷ lệ
                for detail in details:
                    if remaining_to_allocate <= 0:
                        break

                    if detail.quantity > 0:
                        ratio = detail.quantity / total_qty
                        deduct = int(remaining_to_allocate * ratio)
                        detail.quantity = max(0, detail.quantity - deduct)
                        remaining_to_allocate -= deduct

                # Phân bổ phần dư còn lại cho detail đầu tiên
                if remaining_to_allocate > 0 and details:
                    first_detail = details[0]
                    if first_detail.quantity > 0:
                        deduct = min(first_detail.quantity, remaining_to_allocate)
                        first_detail.quantity = max(0, first_detail.quantity - deduct)
                        remaining_to_allocate -= deduct
