# -*- coding: utf-8 -*-
import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.system.models.screen_bug import ScreenBug as ScreenBugModel
from modules.system.models.screen_bug import ScreenBugUpdate as ScreenBugUpdateModel
from modules.system.models.screen_bug import ScreenBugImage as ScreenBugImageModel
from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.schemas.screen_bug import (
    ScreenBugCreate, ScreenBugUpdate, ScreenBugResponse, ScreenBugUpdateResponse
)
from shared.utils.timezone import get_vietnam_time
from jose import jwt
from config.settings import settings
from modules.auth.models.accounts import Account as AccountModel

def get_current_user(request: Request, db: Session = Depends(get_db)) -> AccountModel:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cần Token xác thực Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ (không tìm thấy username).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token đã hết hạn hoặc không hợp lệ. Chi tiết: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(AccountModel).filter(AccountModel.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def send_zalo_notification_to_reporter(db_bug, screen, db: Session):
    try:
        if not db_bug.reporter:
            return
        
        reporter_user = db.query(AccountModel).filter(
            (AccountModel.full_name == db_bug.reporter) |
            (AccountModel.username == db_bug.reporter)
        ).first()
        
        if reporter_user and reporter_user.phone:
            from modules.notification.services.zalo_service import send_zalo_notification
            import asyncio
            
            zalo_content = (
                f"<b>✅ [SmartFlow] BUG BÁO CÁO CỦA BẠN ĐÃ ĐƯỢC SỬA:</b>\n"
                f"<b>- Màn hình:</b> {screen.current_code if screen else 'N/A'} - {screen.title if screen else 'N/A'}\n"
                f"<b>- Người báo:</b> {db_bug.reporter}\n"
                f"<b>- Người sửa:</b> {db_bug.assignee or 'Hệ thống'}\n"
                f"<b>- Mô tả lỗi:</b> {db_bug.description}\n"
                f"<b>- Trạng thái mới:</b> <green>Đã sửa (Resolved)</green>"
            )
            asyncio.create_task(send_zalo_notification(
                phone=reporter_user.phone, 
                content=zalo_content
            ))
    except Exception as ze:
        print(f"Error sending Zalo notification for reporter: {ze}")

router = APIRouter()

@router.post("/upload-image")
async def upload_bug_image(file: UploadFile = File(...)):
    """
    Tải lên hình ảnh bug màn hình (chấp nhận ảnh clipboard dán hoặc file upload).
    Lưu vào BackEnd/static/uploads/screen_bugs/
    """
    # Đường dẫn thư mục static/uploads/screen_bugs/
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "screen_bugs"))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Tạo tên file duy nhất tránh trùng lặp
    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".png" # Mặc định png cho ảnh clipboard
    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, new_filename)
    
    # Ghi file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    return {"url": f"/static/uploads/screen_bugs/{new_filename}"}

@router.get("", response_model=List[ScreenBugResponse])
def get_screen_bugs(
    status_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    platform_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách tất cả các bug màn hình kèm thông tin màn hình liên kết và các quan hệ ảnh/lịch sử.
    """
    # Lấy đối tượng ScreenBugModel trực tiếp để hỗ trợ quan hệ ORM tự động
    query = db.query(ScreenBugModel).join(SystemScreenModel, ScreenBugModel.screen_id == SystemScreenModel.id)

    if status_filter and status_filter != "All":
        query = query.filter(ScreenBugModel.status == status_filter)
    if severity_filter and severity_filter != "All":
        query = query.filter(ScreenBugModel.severity == severity_filter)
    if platform_filter and platform_filter != "All":
        query = query.filter(SystemScreenModel.platform == platform_filter)

    results = query.order_by(ScreenBugModel.created_at.desc()).all()
    
    bugs = []
    for r in results:
        bugs.append({
            "id": r.id,
            "screen_id": r.screen_id,
            "description": r.description,
            "severity": r.severity,
            "status": r.status,
            "assignee": r.assignee,
            "reporter": r.reporter,
            "requested_at": r.requested_at,
            "completed_at": r.completed_at,
            "notes": r.notes,
            "created_at": r.created_at,
            "screen_code": r.screen.current_code if r.screen else None,
            "screen_title": r.screen.title if r.screen else None,
            "platform": r.screen.platform if r.screen else None,
            "images": [
                {
                    "id": img.id, 
                    "bug_id": img.bug_id, 
                    "update_id": img.update_id, 
                    "image_path": img.image_path, 
                    "created_at": img.created_at
                } for img in r.images
            ],
            "updates": [
                {
                    "id": up.id,
                    "bug_id": up.bug_id,
                    "status": up.status,
                    "assignee": up.assignee,
                    "notes": up.notes,
                    "updater": up.updater,
                    "created_at": up.created_at,
                    "images": [
                        {
                            "id": img.id,
                            "bug_id": img.bug_id,
                            "update_id": img.update_id,
                            "image_path": img.image_path,
                            "created_at": img.created_at
                        } for img in up.images
                    ]
                } for up in sorted(r.updates, key=lambda x: x.created_at, reverse=True)
            ]
        })
    return bugs

@router.post("", response_model=ScreenBugResponse)
async def create_screen_bug(
    bug_in: ScreenBugCreate, 
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Báo cáo một bug mới cho màn hình.
    """
    screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == bug_in.screen_id).first()
    if not screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy màn hình tương ứng"
        )

    db_bug = ScreenBugModel(
        screen_id=bug_in.screen_id,
        description=bug_in.description,
        severity=bug_in.severity,
        status=bug_in.status,
        assignee=bug_in.assignee,
        reporter=bug_in.reporter or current_user.full_name or current_user.username,
        requested_at=bug_in.requested_at,
        notes=bug_in.notes
    )
    db.add(db_bug)
    db.commit()
    db.refresh(db_bug)

    # Đính kèm ảnh nếu có
    if bug_in.image_paths:
        for path in bug_in.image_paths:
            db_img = ScreenBugImageModel(
                bug_id=db_bug.id,
                image_path=path
            )
            db.add(db_img)
        db.commit()
        db.refresh(db_bug)

    # Gửi thông báo Zalo cho người được chỉ định xử lý bug (assignee)
    if db_bug.assignee:
        try:
            assignee_user = db.query(AccountModel).filter(
                (AccountModel.full_name == db_bug.assignee) |
                (AccountModel.username == db_bug.assignee)
            ).first()
            
            if assignee_user and assignee_user.phone:
                from modules.notification.services.zalo_service import send_zalo_notification
                import asyncio
                import os
                
                image_paths = []
                if bug_in.image_paths:
                    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
                    for raw_img_path in bug_in.image_paths:
                        clean_path = raw_img_path.lstrip("/")
                        abs_path = os.path.abspath(os.path.join(base_dir, clean_path))
                        image_paths.append(abs_path)
                
                # Chọn màu sắc dựa trên mức độ nghiêm trọng của lỗi
                severity_color = "green"
                if db_bug.severity in ["Critical", "High"]:
                    severity_color = "red"
                elif db_bug.severity == "Medium":
                    severity_color = "orange"
                
                zalo_content = (
                    f"<b>🐞 [SmartFlow] BẠN ĐƯỢC CHỈ ĐỊNH XỬ LÝ BUG MỚI:</b>\n"
                    f"<b>- Màn hình:</b> {screen.current_code} - {screen.title}\n"
                    f"<b>- Người báo:</b> {db_bug.reporter}\n"
                    f"<b>- Mức độ:</b> <{severity_color}>{db_bug.severity}</{severity_color}>\n"
                    f"<b>- Mô tả:</b> {db_bug.description}"
                )
                asyncio.create_task(send_zalo_notification(
                    phone=assignee_user.phone, 
                    content=zalo_content, 
                    image_paths=image_paths
                ))
        except Exception as ze:
            print(f"Error sending Zalo notification for assignee: {ze}")

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_BUG_UPDATED",
            "action": "create",
            "bug_id": db_bug.id
        })
    except Exception as e:
        print(f"Error broadcasting: {e}")

    return {
        "id": db_bug.id,
        "screen_id": db_bug.screen_id,
        "description": db_bug.description,
        "severity": db_bug.severity,
        "status": db_bug.status,
        "assignee": db_bug.assignee,
        "reporter": db_bug.reporter,
        "requested_at": db_bug.requested_at,
        "completed_at": db_bug.completed_at,
        "notes": db_bug.notes,
        "created_at": db_bug.created_at,
        "screen_code": screen.current_code,
        "screen_title": screen.title,
        "platform": screen.platform,
        "images": [
            {
                "id": img.id, 
                "bug_id": img.bug_id, 
                "update_id": img.update_id, 
                "image_path": img.image_path, 
                "created_at": img.created_at
            } for img in db_bug.images
        ],
        "updates": []
    }

@router.put("/{bug_id}", response_model=ScreenBugResponse)
async def update_screen_bug(bug_id: int, bug_in: ScreenBugUpdate, db: Session = Depends(get_db)):
    """
    Cập nhật thông tin bug và tự động ghi log lịch sử chỉnh sửa.
    """
    db_bug = db.query(ScreenBugModel).filter(ScreenBugModel.id == bug_id).first()
    if not db_bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin bug cần cập nhật"
        )

    update_data = bug_in.model_dump(exclude_unset=True)

    should_notify_reporter = False
    if "status" in update_data and update_data["status"] in ["Resolved", "Đã sửa"] and db_bug.status not in ["Resolved", "Đã sửa"]:
        should_notify_reporter = True

    # Logic tự động điền/xóa completed_at
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status in ["Resolved", "Verified", "Đã sửa", "Hoàn thành"]:
            if "completed_at" not in update_data or update_data["completed_at"] is None:
                update_data["completed_at"] = get_vietnam_time()
        else:
            update_data["completed_at"] = None

    # Tự động phát hiện thay đổi để ghi log lịch sử
    changes = []
    if "status" in update_data and update_data["status"] != db_bug.status:
        changes.append(f"Trạng thái: {db_bug.status} -> {update_data['status']}")
    if "assignee" in update_data and update_data["assignee"] != db_bug.assignee:
        changes.append(f"Người xử lý: {db_bug.assignee or 'Chưa phân công'} -> {update_data['assignee'] or 'Chưa phân công'}")
    if "severity" in update_data and update_data["severity"] != db_bug.severity:
        changes.append(f"Mức độ: {db_bug.severity} -> {update_data['severity']}")
    if "description" in update_data and update_data["description"] != db_bug.description:
        changes.append("Thay đổi mô tả lỗi")

    # Cập nhật các trường
    for field, value in update_data.items():
        if field not in ["image_paths", "updater"]:
            setattr(db_bug, field, value)
            
    db.commit()
    db.refresh(db_bug)

    # Ghi nhận log lịch sử nếu có thay đổi hoặc đính kèm ảnh
    if changes or "notes" in update_data or "image_paths" in update_data:
        log_parts = []
        if changes:
            log_parts.append(f"Thay đổi thông tin: {', '.join(changes)}")
        if "notes" in update_data and update_data["notes"]:
            log_parts.append(update_data["notes"])
            
        final_log = "\n".join(log_parts) if log_parts else "Cập nhật thông tin bug"
        
        new_up = ScreenBugUpdateModel(
            bug_id=db_bug.id,
            status=db_bug.status,
            assignee=db_bug.assignee,
            notes=final_log,
            updater=bug_in.updater or "Hệ thống"
        )
        db.add(new_up)
        db.commit()
        db.refresh(new_up)

        if "image_paths" in update_data and update_data["image_paths"]:
            for path in update_data["image_paths"]:
                db_img = ScreenBugImageModel(
                    bug_id=db_bug.id,
                    update_id=new_up.id,
                    image_path=path
                )
                db.add(db_img)
            db.commit()
            db.refresh(db_bug)

    screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == db_bug.screen_id).first()

    if should_notify_reporter:
        await send_zalo_notification_to_reporter(db_bug, screen, db)

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_BUG_UPDATED",
            "action": "update",
            "bug_id": db_bug.id
        })
    except Exception as e:
        print(f"Error broadcasting: {e}")

    return {
        "id": db_bug.id,
        "screen_id": db_bug.screen_id,
        "description": db_bug.description,
        "severity": db_bug.severity,
        "status": db_bug.status,
        "assignee": db_bug.assignee,
        "reporter": db_bug.reporter,
        "requested_at": db_bug.requested_at,
        "completed_at": db_bug.completed_at,
        "notes": db_bug.notes,
        "created_at": db_bug.created_at,
        "screen_code": screen.current_code if screen else None,
        "screen_title": screen.title if screen else None,
        "platform": screen.platform if screen else None,
        "images": [
            {
                "id": img.id, 
                "bug_id": img.bug_id, 
                "update_id": img.update_id, 
                "image_path": img.image_path, 
                "created_at": img.created_at
            } for img in db_bug.images
        ],
        "updates": [
            {
                "id": up.id,
                "bug_id": up.bug_id,
                "status": up.status,
                "assignee": up.assignee,
                "notes": up.notes,
                "updater": up.updater,
                "created_at": up.created_at,
                "images": [
                    {
                        "id": img.id,
                        "bug_id": img.bug_id,
                        "update_id": img.update_id,
                        "image_path": img.image_path,
                        "created_at": img.created_at
                    } for img in up.images
                ]
            } for up in sorted(db_bug.updates, key=lambda x: x.created_at, reverse=True)
        ]
    }

@router.post("/{bug_id}/updates", response_model=ScreenBugUpdateResponse)
async def create_bug_comment_update(
    bug_id: int,
    update_in: ScreenBugUpdate,
    db: Session = Depends(get_db)
):
    """
    Đăng tải bình luận/cập nhật trực tiếp cho một bug màn hình.
    """
    db_bug = db.query(ScreenBugModel).filter(ScreenBugModel.id == bug_id).first()
    if not db_bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bug tương ứng để đăng cập nhật"
        )

    # 1. Tạo bản ghi lịch sử cập nhật
    new_up = ScreenBugUpdateModel(
        bug_id=bug_id,
        status=update_in.status or db_bug.status,
        assignee=update_in.assignee or db_bug.assignee,
        notes=update_in.notes or "Cập nhật tiến trình sửa lỗi",
        updater=update_in.updater or "Hệ thống"
    )
    db.add(new_up)
    db.commit()
    db.refresh(new_up)

    # 2. Cập nhật trạng thái và người phân công của bug chính nếu có thay đổi
    should_notify_reporter = False
    if update_in.status:
        if update_in.status in ["Resolved", "Đã sửa"] and db_bug.status not in ["Resolved", "Đã sửa"]:
            should_notify_reporter = True
        db_bug.status = update_in.status
        if update_in.status in ["Resolved", "Verified", "Đã sửa", "Hoàn thành"]:
            db_bug.completed_at = get_vietnam_time()
        else:
            db_bug.completed_at = None
    if update_in.assignee:
        db_bug.assignee = update_in.assignee

    db.commit()
    db.refresh(db_bug)

    if should_notify_reporter:
        screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == db_bug.screen_id).first()
        await send_zalo_notification_to_reporter(db_bug, screen, db)

    # 3. Liên kết hình ảnh đính kèm nếu có
    if update_in.image_paths:
        for path in update_in.image_paths:
            db_img = ScreenBugImageModel(
                bug_id=bug_id,
                update_id=new_up.id,
                image_path=path
            )
            db.add(db_img)
        db.commit()
        db.refresh(new_up)

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_BUG_UPDATED",
            "action": "update",
            "bug_id": bug_id
        })
    except Exception as e:
        print(f"Error broadcasting: {e}")

    return {
        "id": new_up.id,
        "bug_id": new_up.bug_id,
        "status": new_up.status,
        "assignee": new_up.assignee,
        "notes": new_up.notes,
        "updater": new_up.updater,
        "created_at": new_up.created_at,
        "images": [
            {
                "id": img.id,
                "bug_id": img.bug_id,
                "update_id": img.update_id,
                "image_path": img.image_path,
                "created_at": img.created_at
            } for img in new_up.images
        ]
    }

@router.put("/updates/{update_id}/status")
async def update_comment_status(
    update_id: int,
    status_in: dict,
    db: Session = Depends(get_db)
):
    """
    Cập nhật trạng thái của từng lượt phản hồi/comment trong timeline.
    """
    db_update = db.query(ScreenBugUpdateModel).filter(ScreenBugUpdateModel.id == update_id).first()
    if not db_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt cập nhật tương ứng"
        )
    
    new_status = status_in.get("status")
    if not new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu trạng thái cập nhật"
        )
        
    db_update.status = new_status
    
    # Đồng bộ trạng thái của bug chính để khớp với cập nhật này
    should_notify_reporter = False
    db_bug = db.query(ScreenBugModel).filter(ScreenBugModel.id == db_update.bug_id).first()
    if db_bug:
        if new_status in ["Resolved", "Đã sửa"] and db_bug.status not in ["Resolved", "Đã sửa"]:
            should_notify_reporter = True
        db_bug.status = new_status
        if new_status in ["Resolved", "Verified", "Đã sửa", "Hoàn thành"]:
            db_bug.completed_at = get_vietnam_time()
        else:
            db_bug.completed_at = None
            
    db.commit()

    if db_bug and should_notify_reporter:
        screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == db_bug.screen_id).first()
        await send_zalo_notification_to_reporter(db_bug, screen, db)
    
    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_BUG_UPDATED",
            "action": "update",
            "bug_id": db_update.bug_id
        })
    except Exception as e:
        print(f"Error broadcasting: {e}")
        
    return {"message": "Cập nhật trạng thái thành công"}

@router.delete("/{bug_id}")
async def delete_screen_bug(bug_id: int, db: Session = Depends(get_db)):
    """
    Xóa báo cáo lỗi màn hình.
    """
    db_bug = db.query(ScreenBugModel).filter(ScreenBugModel.id == bug_id).first()
    if not db_bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin bug cần xóa"
        )

    db.delete(db_bug)
    db.commit()

    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_BUG_UPDATED",
            "action": "delete",
            "bug_id": bug_id
        })
    except Exception as e:
        print(f"Error broadcasting: {e}")

    return {"message": "Xóa báo cáo lỗi thành công"}
