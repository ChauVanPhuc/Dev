from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from config.database import get_db
from modules.notification.models.notifications import Notification as NotificationModel
from modules.notification.schemas.notifications import Notification as NotificationSchema, NotificationCreate, NotificationMarkRead
from modules.notification.services.zalo_service import trigger_zalo_notifications_for_group
from modules.auth.models.accounts import Account as AccountModel

router = APIRouter()
@router.post("/clear-all")
def clear_all_notifications(db: Session = Depends(get_db)):
    """
    [POST] Xóa sạch toàn bộ thông báo trong hệ thống.
    """
    try:
        db.query(NotificationModel).delete()
        db.commit()
        return {"message": "Đã xóa sạch toàn bộ thông báo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=NotificationSchema)
def create_notification(
    request: NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    [POST] Tạo một thông báo mới.
    """
    try:
        new_notification = NotificationModel(
            content=request.content,
            announcer_id=request.announcer_id,
            target_group=request.target_group,
            priority_status=request.priority_status
        )
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
        
        # Gửi thông báo qua Zalo bất đồng bộ để tránh block client
        if new_notification.content:
            background_tasks.add_task(
                trigger_zalo_notifications_for_group,
                new_notification.target_group,
                f"🔔 [SmartFlow] Thông báo mới ({new_notification.target_group or 'Mọi người'}):\n{new_notification.content}"
            )
            
        return new_notification
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo thông báo: {str(e)}")

@router.get("/", response_model=List[NotificationSchema])
def get_notifications(
    target_group: Optional[str] = Query(None, description="Lọc theo bộ phận nhận"),
    target_stage: Optional[str] = Query(None, description="Lọc theo công đoạn nhận (cho QC)"),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách thông báo. Có thể lọc theo bộ phận và công đoạn.
    """
    try:
        # print(f"DEBUG: get_notifications -> group={target_group}, stage={target_stage}")
        
        # [VÁ LỖI TỐI THƯỢNG]: Ngăn chặn App cũ (chưa update code) gọi API trống gây ra hiện tượng nhận nhầm tin
        if not target_group and not target_stage:
            return []
        
        query = db.query(NotificationModel)
        
        tg_upper = target_group.upper() if target_group else ""
        
        # 1. Lọc theo bộ phận (Group) với sự linh hoạt cao (SX <=> Sản xuất)
        if target_group and target_group.strip():
            if "QC" in tg_upper or "QLCL" in tg_upper or "CHẤT LƯỢNG" in tg_upper or "KIỂM TRA" in tg_upper or "QUẢN LÝ" in tg_upper:
                query = query.filter((NotificationModel.target_group.like('%QC%')) | (NotificationModel.target_group.like('%Kiểm tra%')) | (NotificationModel.target_group == "Toàn công ty"))
            elif "SX" in tg_upper or "SẢN XUẤT" in tg_upper:
                query = query.filter(
                    (NotificationModel.target_group == "SX") | 
                    (NotificationModel.target_group == "Sản xuất") |
                    (NotificationModel.target_group.like("%SX%")) |
                    (NotificationModel.target_group.like("%Sản xuất%")) |
                    (NotificationModel.target_group == "Toàn công ty")
                )
            else:
                query = query.filter((NotificationModel.target_group == target_group) | (NotificationModel.target_group == "Toàn công ty"))
        
        # 2. Chuẩn hóa Công đoạn (Stage) - Chuyển đổi mô tả sang name chuẩn nếu cần
        real_stage_name = target_stage
        if target_stage:
            from modules.production.models.stages import Stage as StageModel
            stage_obj = db.query(StageModel).filter(
                (StageModel.name == target_stage) | (StageModel.description == target_stage)
            ).first()
            if stage_obj:
                real_stage_name = stage_obj.name

        # [BẮT BUỘC] Lọc theo Công đoạn (Stage) - Linh hoạt cho cấp Quản lý
        is_manager = "QUẢN LÝ" in tg_upper if target_group else False
        
        if is_manager:
            # Quản lý được xem TẤT CẢ thông báo trong nhóm (không lọc stage)
            pass
        elif real_stage_name:
            # Nhân viên thường: CHỈ hiện tin khớp công đoạn đó (Mã hoặc Tên)
            query = query.filter(
                (NotificationModel.target_stage.ilike(real_stage_name)) | 
                (NotificationModel.target_stage.ilike(target_stage))
            )
        else:
            # Không có công đoạn: CHỈ hiện tin dành cho "Toàn công ty" hoặc tin rỗng công đoạn
            query = query.filter(
                (NotificationModel.target_group == "Toàn công ty") |
                (NotificationModel.target_stage.is_(None)) |
                (NotificationModel.target_stage == '')
            )
        

        
        # Sắp xếp và giới hạn kết quả
        results = query.order_by(NotificationModel.created_at.desc()).limit(50).all()

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thông báo: {str(e)}")

@router.get("/unread-count-v2")
def get_unread_count(
    user_id: Optional[str] = Query(None),
    target_group: Optional[str] = Query(None),
    target_stage: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    [GET] Đếm số lượng thông báo chưa đọc dựa trên ID đã xem cuối cùng của người dùng.
    Gia cố để tránh lỗi 422 khi App gửi ID không chuẩn (null/undefined).
    """
    # print(f"DEBUG: unread-count raw -> user_id={user_id}, group={target_group}, stage={target_stage}")
    
    try:
        try:
            u_id = int(user_id)
        except (ValueError, TypeError):
            return {"unread_count": 0}

        # 1. Lấy ID thông báo cuối cùng mà người dùng đã xem
        user = db.query(AccountModel).filter(AccountModel.id == u_id).first()
        if not user:
            return {"unread_count": 0}
        
        last_seen_id = user.last_notif_seen_id or 0
        
        # 2. Xây dựng câu query đếm thông báo mới
        query = db.query(NotificationModel).filter(NotificationModel.id > last_seen_id)
        
        # 3. Lấy thông tin vai trò từ bảng Department (vì bảng Account không lưu trực tiếp)
        from modules.auth.models.departments import Department
        from modules.auth.models.role import Role
        from modules.auth.models.permissions import Permission
        
        dept = db.query(Department).filter(Department.account_id == u_id).first()
        user_role_name = ""
        user_perm_desc = ""
        
        if dept:
            if dept.role_id:
                role_obj = db.query(Role).filter(Role.id == dept.role_id).first()
                if role_obj:
                    user_role_name = role_obj.name or ""
            if dept.permission_id:
                perm_obj = db.query(Permission).filter(Permission.id == dept.permission_id).first()
                if perm_obj:
                    user_perm_desc = perm_obj.description or perm_obj.name or ""

        user_role_upper = user_role_name.upper()
        user_perm_upper = user_perm_desc.upper()
        
        # Kiểm tra xem có phải Quản lý/Giám đốc hay không
        is_manager = any(keyword in user_role_upper or keyword in user_perm_upper for keyword in ["QUẢN LÝ", "ADMIN", "GIÁM ĐỐC", "MANAGER"])

        # Chuẩn hóa Stage
        real_stage_name = target_stage
        if target_stage:
            from modules.production.models.stages import Stage as StageModel
            stage_obj = db.query(StageModel).filter(
                (StageModel.name == target_stage) | (StageModel.description == target_stage)
            ).first()
            if stage_obj:
                real_stage_name = stage_obj.name

        # [BỘ LỌC THÔNG MINH]
        if is_manager:
            # SẾP: Không lọc theo nhóm hay công đoạn, thấy TẤT CẢ tin mới
            pass
        else:
            # NHÂN VIÊN: Lọc nghiêm ngặt theo Nhóm và Công đoạn
            tg_upper = target_group.upper() if target_group else ""
            if "QC" in tg_upper or "QLCL" in tg_upper or "CHẤT LƯỢNG" in tg_upper or "KIỂM TRA" in tg_upper:
                query = query.filter((NotificationModel.target_group.ilike('%QC%')) | (NotificationModel.target_group.ilike('%Kiểm tra%')) | (NotificationModel.target_group == "Toàn công ty"))
            elif "SX" in tg_upper or "SẢN XUẤT" in tg_upper:
                query = query.filter(
                    (NotificationModel.target_group == "SX") | 
                    (NotificationModel.target_group == "Sản xuất") |
                    (NotificationModel.target_group.ilike("%SX%")) |
                    (NotificationModel.target_group.ilike("%Sản xuất%")) |
                    (NotificationModel.target_group == "Toàn công ty")
                )
            else:
                query = query.filter((NotificationModel.target_group == target_group) | (NotificationModel.target_group == "Toàn công ty"))

            # Lọc theo Công đoạn cho nhân viên thường
            if real_stage_name:
                query = query.filter(
                    (NotificationModel.target_stage.ilike(real_stage_name)) | 
                    (NotificationModel.target_stage.ilike(target_stage))
                )
            else:
                query = query.filter(
                    (NotificationModel.target_group == "Toàn công ty") |
                    (NotificationModel.target_stage.is_(None)) |
                    (NotificationModel.target_stage == '')
                )
            
        unread_notifs = query.all()
        count = len(unread_notifs)
        notif_ids = [n.id for n in unread_notifs]
        
        # [LOG CHUYÊN SÂU] In ra để debug
        total_in_db = db.query(NotificationModel).count()

        return {"unread_count": count}

    except Exception as e:
        print(f"ERROR: Exception in get_unread_count: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"unread_count": 0}

@router.post("/mark-as-read")
def mark_as_read(
    request: NotificationMarkRead,
    db: Session = Depends(get_db)
):
    """
    [POST] Đánh dấu tất cả thông báo hiện tại là ĐÃ XEM cho người dùng này.
    """
    user_id = request.user_id
    target_group = request.target_group
    target_stage = request.target_stage
    
    # print(f"DEBUG: mark-as-read -> user_id={user_id}, group={target_group}, stage={target_stage}")
    
    user = db.query(AccountModel).filter(AccountModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    
    # 0. Lấy thông tin vai trò từ bảng Department (để nhận diện Quản lý)
    from modules.auth.models.departments import Department
    from modules.auth.models.role import Role
    from modules.auth.models.permissions import Permission
    
    dept = db.query(Department).filter(Department.account_id == user_id).first()
    user_role_name = ""
    user_perm_desc = ""
    
    if dept:
        if dept.role_id:
            role_obj = db.query(Role).filter(Role.id == dept.role_id).first()
            if role_obj:
                user_role_name = role_obj.name or ""
        if dept.permission_id:
            perm_obj = db.query(Permission).filter(Permission.id == dept.permission_id).first()
            if perm_obj:
                user_perm_desc = perm_obj.description or perm_obj.name or ""

    user_role_upper = user_role_name.upper()
    user_perm_upper = user_perm_desc.upper()
    is_manager = any(keyword in user_role_upper or keyword in user_perm_upper for keyword in ["QUẢN LÝ", "ADMIN", "GIÁM ĐỐC", "MANAGER"])

    # 1. Chuẩn hóa Stage
    real_stage_name = target_stage
    if target_stage:
        from modules.production.models.stages import Stage as StageModel
        stage_obj = db.query(StageModel).filter(
            (StageModel.name == target_stage) | (StageModel.description == target_stage)
        ).first()
        if stage_obj:
            real_stage_name = stage_obj.name

    # 2. Tìm thông báo mới nhất (ID cao nhất) thuộc phạm vi của người dùng
    query = db.query(NotificationModel)
    tg_upper = target_group.upper() if target_group else ""
    
    # [BỘ LỌC THÔNG MINH]
    if is_manager:
        # SẾP: Reset TẤT CẢ tin mới trong hệ thống
        pass
    else:
        # NHÂN VIÊN: Reset theo Nhóm và Công đoạn
        if target_group:
            if "QC" in tg_upper or "QLCL" in tg_upper or "CHẤT LƯỢNG" in tg_upper or "KIỂM TRA" in tg_upper:
                query = query.filter((NotificationModel.target_group.ilike('%QC%')) | (NotificationModel.target_group.ilike('%Kiểm tra%')) | (NotificationModel.target_group == "Toàn công ty"))
            elif "SX" in tg_upper or "SẢN XUẤT" in tg_upper:
                query = query.filter((NotificationModel.target_group == "SX") | (NotificationModel.target_group.ilike("%Sản xuất%")) | (NotificationModel.target_group == "Toàn công ty"))
            else:
                query = query.filter((NotificationModel.target_group == target_group) | (NotificationModel.target_group == "Toàn công ty"))

        # Lọc theo Công đoạn cho nhân viên thường
        if real_stage_name:
            query = query.filter(
                (NotificationModel.target_stage.ilike(real_stage_name)) | 
                (NotificationModel.target_stage.ilike(target_stage))
            )
        else:
            query = query.filter(
                (NotificationModel.target_group == "Toàn công ty") |
                (NotificationModel.target_stage.is_(None)) |
                (NotificationModel.target_stage == '')
            )
    
    latest_notif = query.order_by(NotificationModel.id.desc()).first()
    
    # 3. Cập nhật ID này vào tài khoản người dùng
    new_last_seen = latest_notif.id if latest_notif else user.last_notif_seen_id
    
    # [LOẠI BỎ LOGIC NHẢY CÓC]: Không tự ý gán Global Max ID để tránh làm mất chuông
    user.last_notif_seen_id = new_last_seen
    db.commit()
    
    return {"message": "Đã đánh dấu đã đọc", "last_seen_id": new_last_seen}

@router.get("/{notification_id}", response_model=NotificationSchema)
def get_notification_detail(notification_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết một thông báo cụ thể.
    """
    notification = db.query(NotificationModel).filter(NotificationModel.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo này.")
    return notification

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa một thông báo.
    """
    notification = db.query(NotificationModel).filter(NotificationModel.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo này để xóa.")
    
    db.delete(notification)
    db.commit()
    return {"message": "Đã xóa thông báo thành công."}
