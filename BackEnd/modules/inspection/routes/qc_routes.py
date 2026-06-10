import os
import uuid
import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from config.database import get_db
from modules.delivery.models.delivery_qc import DeliveryQC
from modules.delivery.models.delivery_images import DeliveryImage
from modules.delivery.models.deliveries import Delivery

router = APIRouter()

# Thư mục lưu trữ ảnh QC riêng biệt
UPLOAD_DIR = "static/uploads/qc_test"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{delivery_id}")
async def save_qc_results(
    delivery_id: int,
    results_json: str = Form(...),
    note: Optional[str] = Form(None),
    category_tags: str = Form("[]"), # JSON string of tags matching files list indices
    quantity_error: int = Form(0),
    quantity_returned: int = Form(0),
    quantity_received: int = Form(0),
    quantity_inspection: int = Form(0), # [NEW] Số lượng thực tế QC đã kiểm tra
    status: Optional[str] = Form(None), # [NEW] Cho phép truyền trạng thái chủ động (ví dụ: 'Trả Hàng')
    user_id: Optional[int] = Form(None), # [NEW] Nhận ID người kiểm QC
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu kết quả kiểm tra QC cho một phiếu giao hàng.
    Hỗ trợ upload nhiều ảnh cho từng hạng mục kiểm tra.
    """
    try:
        # 1. Kiểm tra phiếu giao hàng tồn tại
        delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
        if not delivery:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao.")

        # 2. Lưu hoặc Cập nhật bản ghi DeliveryQC (1 dòng duy nhất)
        qc_record = db.query(DeliveryQC).filter(DeliveryQC.delivery_id == delivery_id).first()
        if not qc_record:
            qc_record = DeliveryQC(delivery_id=delivery_id)
            db.add(qc_record)

        qc_record.results_json = results_json
        qc_record.note = note
        qc_record.created_at = datetime.datetime.now()



        # 3. Xử lý Upload ảnh QC
        tags = json.loads(category_tags)
        
        for i, file in enumerate(files):
            # Lấy tag tương ứng (mặc định là 'qc_general' nếu thiêu)
            tag = tags[i] if i < len(tags) else "qc_general"
            
            # Lưu file vật lý
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"QC_{delivery_id}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Lưu thông tin vào bảng delivery_images (Tái sử dụng)
            image_url = f"/static/uploads/qc_test/{unique_filename}"
            new_image = DeliveryImage(
                delivery_id=delivery_id,
                image_path=image_url,
                description=tag # Lưu phân loại (vd: qc_size, qc_moisture, ...)
            )
            db.add(new_image)

        # 4. Cập nhật các chỉ số định lượng vào bảng Delivery
        delivery.quantity_error = quantity_error
        # Cộng dồn quantity_returned thay vì gán đè
        current_returned = delivery.quantity_returned or 0
        delivery.quantity_returned = current_returned + quantity_returned
        delivery.quantity_inspection = quantity_inspection # [NEW] Lưu giá trị thực kiểm mới
        if user_id:
            delivery.qc_receipt = user_id
        
        
        # [QUAN TRỌNG] Logic chuyển trạng thái: 
        # Ưu tiên status truyền vào (vd: 'Trả Hàng'), 
        # nếu không có thì tự động dựa trên số nhận/trả
        if status:
            delivery.status = status
        elif quantity_returned > 0:
             # Nếu trả hàng hoàn toàn hoặc một phần thì status có thể là "Trả Hàng"
             # Tùy nhu cầu, ở đây nếu có trả hàng thì set status trả hàng
             if quantity_returned >= delivery.quantity_total:
                 delivery.status = "Trả Hàng"
             else:
                 delivery.status = "Hoàn thành"
        else:
            delivery.status = "Hoàn thành"
        
        # 5. Tạo thông báo (Notification) cho bộ phận Sản xuất nhận hàng
        try:
            from modules.notification.models.notifications import Notification as NotificationModel
            
            # Tùy chỉnh nội dung thông báo dựa trên trạng thái
            if delivery.status == "Trả Hàng":
                notif_content = f"QC đã từ chối nhận chi tiết '{delivery.part_name}' (Phiếu DLV-{delivery_id}). Trạng thái: Trả Hàng. Mời bộ phận Sản xuất kiểm tra và xử lý lại."
            else:
                notif_content = f"QC đã kiểm tra xong chi tiết '{delivery.part_name}' (Phiếu DLV-{delivery_id}). Trạng thái: {delivery.status}. Hàng đã sẵn sàng nhập kho."
            
            new_notif = NotificationModel(
                content=notif_content,
                announcer_id=delivery.qc_receipt or 1,
                target_group="SX",
                target_stage=delivery.receiving_stage,
                priority_status="Trả hàng" if delivery.status == "Trả Hàng" else "Bình thường"
            )
            db.add(new_notif)
        except Exception as e:
            print(f"Lỗi tạo thông báo QC confirm: {e}")

        # [NEW] Cài đặt thời gian tự động giải phóng thẻ QR dự phòng (khóa đến sau 7h ngày mai) thay vì giải phóng ngay lập tức
        try:
            from modules.system.models.backup_qr import BackupQRCode
            from shared.utils.timezone import get_vietnam_time
            b_qr = db.query(BackupQRCode).filter(BackupQRCode.current_delivery_id == delivery.id).first()
            if b_qr:
                now_vn = get_vietnam_time()
                tomorrow_7am = datetime.datetime(now_vn.year, now_vn.month, now_vn.day, 7, 0, 0) + datetime.timedelta(days=1)
                b_qr.scheduled_release_at = tomorrow_7am
        except Exception as e:
            print(f"Lỗi cài đặt lịch giải phóng thẻ QR dự phòng: {e}")

        db.commit()
        db.refresh(qc_record)
        
        # [Realtime WebSocket] Báo cho CẢ hai bên Giao và Nhận rằng hàng đã kiểm xong
        try:
            from shared.services.websocket_service import socket_manager
            # 1. Báo cho bộ phận nhận hàng (Để hiện thông báo nhập kho)
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=delivery.receiving_stage,
                message={"type": "QC_CONFIRMED", "delivery_id": delivery_id, "status": "Hoàn Thành QC"}
            )
            # 2. Báo cho bộ phận giao hàng (Để cập nhật số lượng 'Đã giao' trong bảng tổng hợp)
            await socket_manager.broadcast_to_stage(
                db,
                stage_name=delivery.delivery_stage,
                message={"type": "QC_CONFIRMED", "delivery_id": delivery_id, "status": "Hoàn Thành QC"}
            )
            
            # [Firebase Push] Báo tin nhắn Notification khi App đang đóng
            from shared.services.notification_service import notify_stage
            push_title = "QC đã kiểm tra xong"
            push_body = f"Hàng '{delivery.part_name}' (DLV-{delivery_id}) đã kiểm xong, mời bạn vào nhận hàng."
            notify_stage(db, delivery.receiving_stage, push_title, push_body)
            
        except Exception as e:
            print(f"Lỗi gửi tin realtime/push QC confirm: {e}")
        
        return {
            "status": "success",
            "message": "Đã lưu kết quả kiểm tra QC thành công.",
            "data": qc_record
        }

    except Exception as e:
        db.rollback()
        print(f"Error saving QC: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi lưu kết quả QC: {str(e)}")

@router.get("/po/{order_code}")
def get_qc_history_by_po(order_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy lịch sử QC của một PO dựa trên mã order_code.
    Truy vấn qua cả liên kết trực tiếp order_id và qua delivery_details.
    Trả về TOÀN BỘ thông tin kiểm tra QC từ results_json.
    """
    from modules.delivery.models.order import Order
    from modules.delivery.models.delivery_details import DeliveryDetails
    from modules.auth.models.accounts import Account

    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        return []

    # Tìm tất cả delivery_id liên quan đến order này
    delivery_ids = db.query(Delivery.id).filter(
        or_(
            Delivery.order_id == order.id,
            Delivery.id.in_(
                db.query(DeliveryDetails.delivery_id).filter(DeliveryDetails.order_id == order.id)
            )
        )
    ).all()

    ids = [d.id for d in delivery_ids]
    if not ids:
        return []

    qc_records = db.query(DeliveryQC).filter(DeliveryQC.delivery_id.in_(ids)).order_by(DeliveryQC.created_at.desc()).all()

    results = []
    for qc in qc_records:
        # Lấy tên người QC (thường là qc_receipt trong bảng deliveries)
        delivery = db.query(Delivery).filter(Delivery.id == qc.delivery_id).first()
        inspector = db.query(Account).filter(Account.id == delivery.qc_receipt).first() if delivery and delivery.qc_receipt else None

        # Parse TOÀN BỘ kết quả JSON
        res_data = {}
        try:
            res_data = json.loads(qc.results_json) if qc.results_json else {}
        except:
            pass

        # Xác định kết luận dựa trên số lượng trả/lỗi
        result_text = "Đạt"
        if delivery and (delivery.quantity_returned > 0 or delivery.status == "Trả Hàng"):
            result_text = "Không Đạt"

        # Lấy ảnh QC
        qc_images = db.query(DeliveryImage).filter(
            DeliveryImage.delivery_id == qc.delivery_id,
            DeliveryImage.description.like("qc_%")
        ).all()

        results.append({
            "id": qc.id,
            "delivery_id": qc.delivery_id,
            "created_at": qc.created_at,
            "qc_inspector_name": inspector.full_name if inspector else "---",
            "result": result_text,
            "note": qc.note,
            "images": [{"image_path": img.image_path} for img in qc_images],
            "results_data": res_data  # [FIX] Trả về toàn bộ dữ liệu kiểm tra QC
        })

    return results

@router.get("/{delivery_id}")
def get_qc_results(delivery_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy kết quả QC và các hình ảnh liên quan của một phiếu giao hàng.
    """
    qc_record = db.query(DeliveryQC).filter(DeliveryQC.delivery_id == delivery_id).first()
    
    # Lấy luôn danh sách ảnh QC (lọc theo description bắt đầu bằng 'qc_')
    qc_images = db.query(DeliveryImage).filter(
        DeliveryImage.delivery_id == delivery_id,
        DeliveryImage.description.like("qc_%")
    ).all()

    return {
        "qc_info": qc_record,
        "images": qc_images
    }
