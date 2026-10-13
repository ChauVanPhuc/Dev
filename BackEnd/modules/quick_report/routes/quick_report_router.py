# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime
import json
import logging
import os
import uuid
import app.models
from modules.auth.models.accounts import Account

from config.database import get_db, engine
from config.settings import get_upload_dir
from modules.quick_report.models.quick_report import QuickReport
from modules.quick_report.schemas.quick_report_schema import QuickReportCreate, QuickReportUpdate, AIGenerateRequest
from modules.notification.models.notifications import Notification as NotificationModel
from modules.chatbot.services.local_gemini_chatbot_service import local_gemini_chatbot_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Tự động đồng bộ cột audio_url vào bảng quick_reports nếu chưa tồn tại
try:
    with engine.begin() as conn:
        conn.execute(text("""
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'quick_reports') AND name = 'audio_url'
            )
            BEGIN
                ALTER TABLE quick_reports ADD audio_url NVARCHAR(1000) NULL;
            END
        """))
except Exception as _m_err:
    logger.warning(f"QuickReport auto migration warning: {_m_err}")

def generate_next_code(db: Session) -> str:
    import re
    reports = db.query(QuickReport.code).all()
    max_num = 0
    for r in reports:
        if r.code:
            nums = re.findall(r'\d+', r.code)
            if nums:
                try:
                    val = int(nums[-1])
                    if val > max_num:
                        max_num = val
                except ValueError:
                    pass
    next_num = max_num + 1
    while db.query(QuickReport.id).filter(QuickReport.code == f"BC-{next_num:02d}").first():
        next_num += 1
    return f"BC-{next_num:02d}"

@router.get("/next-code", response_model=dict)
def get_next_quick_report_code(db: Session = Depends(get_db)):
    code = generate_next_code(db)
    clean_code = code.replace("-", "")
    return {"code": code, "clean_code": clean_code}

@router.post("/upload-audio", response_model=dict)
async def upload_quick_report_audio(file: UploadFile = File(...)):
    """
    Tải file ghi âm âm thanh (.webm, .wav, .mp3, .m4a) lên hệ thống
    """
    try:
        audio_dir = get_upload_dir("quick_reports/audio")
        os.makedirs(audio_dir, exist_ok=True)
        original_name = file.filename or "recording.webm"
        ext = os.path.splitext(original_name)[1] or ".webm"
        unique_name = f"rec_{uuid.uuid4().hex[:10]}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
        target_path = os.path.join(audio_dir, unique_name)
        
        contents = await file.read()
        with open(target_path, "wb") as f:
            f.write(contents)
            
        url = f"/static/uploads/quick_reports/audio/{unique_name}"
        return {"url": url, "filename": unique_name, "message": "Tải file ghi âm thành công"}
    except Exception as e:
        logger.error(f"Lỗi khi lưu file ghi âm: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể lưu file âm thanh: {str(e)}")

@router.post("/upload-image", response_model=dict)
async def upload_quick_report_image(file: UploadFile = File(...)):
    """
    Tải file hình ảnh (.jpg, .jpeg, .png, .webp, .gif) lên hệ thống
    """
    try:
        img_dir = get_upload_dir("quick_reports/images")
        os.makedirs(img_dir, exist_ok=True)
        original_name = file.filename or "image.jpg"
        ext = os.path.splitext(original_name)[1] or ".jpg"
        unique_name = f"img_{uuid.uuid4().hex[:10]}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
        target_path = os.path.join(img_dir, unique_name)
        
        contents = await file.read()
        with open(target_path, "wb") as f:
            f.write(contents)
            
        url = f"/static/uploads/quick_reports/images/{unique_name}"
        return {"url": url, "filename": unique_name, "message": "Tải ảnh thành công"}
    except Exception as e:
        logger.error(f"Lỗi khi lưu file ảnh: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể lưu file ảnh: {str(e)}")

@router.post("/", response_model=dict)
def create_quick_report(payload: QuickReportCreate, db: Session = Depends(get_db)):
    try:
        code = payload.code or generate_next_code(db)
        
        # Check existing code
        existing = db.query(QuickReport).filter(QuickReport.code == code).first()
        if existing:
            code = generate_next_code(db)

        report = QuickReport(
            code=code,
            report_type=payload.report_type,
            creator_name=payload.creator_name or "Nguyễn Văn A",
            is_anonymous=payload.is_anonymous or False,
            attendees=payload.attendees,
            related_ticket=payload.related_ticket,
            issue_type=payload.issue_type,
            area=payload.area,
            main_content=payload.main_content,
            solution_recommendation=payload.solution_recommendation,
            images=payload.images or "[]",
            audio_url=payload.audio_url,
            status=payload.status or "Chờ xử lý"
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)

        # Trigger system notification & Push Notification
        try:
            author_text = "Ẩn danh" if report.is_anonymous else report.creator_name
            noti_title = f"🔔 [Báo Cáo Nhanh] {report.code}"
            noti_body = f"{report.report_type} từ {author_text}: {report.main_content[:60]}..."
            
            # Tìm tài khoản admin hợp lệ làm người gửi thông báo (tránh lỗi khóa ngoại)
            from modules.auth.models.accounts import Account
            admin_user = db.query(Account.id).filter(Account.username == "admin").first()
            valid_announcer_id = admin_user[0] if admin_user else None

            noti = NotificationModel(
                content=f"🔔 [SmartFlow Báo Cáo Nhanh] Mã phiếu {report.code} ({report.report_type}) vừa được khởi tạo bởi {author_text}.",
                announcer_id=valid_announcer_id,
                target_group="Quản lý",
                priority_status="Chờ xử lý"
            )
            db.add(noti)
            db.commit()

            # Gửi Push Notification với Deep-link đến danh sách báo cáo
            try:
                from shared.services.notification_service import send_push_to_group
                send_push_to_group(
                    db=db,
                    target_group="BGD",
                    title=noti_title,
                    body=noti_body,
                    route_path=f"/quick-report-list?id={report.id}"
                )
            except Exception as push_err:
                logger.warning(f"Push notification error: {push_err}")
        except Exception as n_err:
            db.rollback()
            logger.warning(f"Không thể tạo thông báo báo cáo nhanh: {n_err}")

        return {"message": "Tạo báo cáo nhanh thành công", "data": report.to_dict()}
    except Exception as e:
        db.rollback()
        logger.error(f"Lỗi khi tạo báo cáo nhanh: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=dict)
def list_quick_reports(
    report_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(QuickReport)
        
        if report_type and report_type != 'all':
            query = query.filter(QuickReport.report_type == report_type)
        if department and department != 'all':
            query = query.filter(QuickReport.issue_type == department)
        if area and area != 'all':
            query = query.filter(QuickReport.area == area)
        if status and status != 'all':
            if status == 'pending':
                query = query.filter(QuickReport.status == 'Chờ xử lý')
            elif status == 'processing':
                query = query.filter(QuickReport.status == 'Đã tiếp nhận')
            elif status == 'completed':
                query = query.filter(QuickReport.status.in_(['Đã hoàn thành', 'Đã xong']))
            elif status == 'rejected':
                query = query.filter(QuickReport.status.in_(['Từ chối', 'Đã hủy']))
            else:
                query = query.filter(QuickReport.status == status)
                
        if from_date:
            try:
                dt_from = datetime.strptime(from_date, "%Y-%m-%d")
                query = query.filter(QuickReport.created_at >= dt_from)
            except Exception:
                pass
        if to_date:
            try:
                dt_to = datetime.strptime(f"{to_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
                query = query.filter(QuickReport.created_at <= dt_to)
            except Exception:
                pass

        if search and search.strip():
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                (QuickReport.code.ilike(search_pattern)) |
                (QuickReport.main_content.ilike(search_pattern)) |
                (QuickReport.solution_recommendation.ilike(search_pattern)) |
                (QuickReport.creator_name.ilike(search_pattern)) |
                (QuickReport.issue_type.ilike(search_pattern)) |
                (QuickReport.area.ilike(search_pattern))
            )
        
        total = query.count()
        reports = query.order_by(QuickReport.id.desc()).offset(skip).limit(limit).all()
        
        # Computed overall stats for KPI summary cards
        all_reports = db.query(QuickReport).all()
        stats = {
            "total": len(all_reports),
            "pending": sum(1 for r in all_reports if r.status == "Chờ xử lý"),
            "processing": sum(1 for r in all_reports if r.status == "Đã tiếp nhận"),
            "completed": sum(1 for r in all_reports if r.status in ["Đã hoàn thành", "Đã xong"]),
            "rejected": sum(1 for r in all_reports if r.status in ["Từ chối", "Đã hủy"])
        }

        return {
            "items": [r.to_dict() for r in reports],
            "total": total,
            "pending_count": stats["pending"],
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách báo cáo nhanh: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{report_id}", response_model=dict)
def get_quick_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(QuickReport).filter(QuickReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    return report.to_dict()

@router.put("/{report_id}", response_model=dict)
def update_quick_report(report_id: int, payload: QuickReportUpdate, db: Session = Depends(get_db)):
    report = db.query(QuickReport).filter(QuickReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(report, key, value)
    
    report.updated_at = datetime.now()
    db.commit()
    db.refresh(report)
    return {"message": "Cập nhật báo cáo nhanh thành công", "data": report.to_dict()}

@router.post("/generate-ai", response_model=dict)
def generate_ai_report(req: AIGenerateRequest, db: Session = Depends(get_db)):
    r"""
    Tích hợp Local Gemini AI Proxy Server (C:\AI) để tóm tắt và đề xuất giải pháp cho báo cáo nhanh.
    """
    try:
        prompt = (
            f"Bạn là trợ lý AI quản lý công nghiệp SmartFlow. Hãy tóm tắt ngắn gọn vấn đề sau và đưa ra "
            f"1-2 kết luận/kiến nghị cụ thể cho báo cáo loại '{req.report_type}'.\n\n"
            f"Nội dung vấn đề nhập vào: {req.main_content}\n"
        )
        if req.area:
            prompt += f"Khu vực: {req.area}\n"
        if req.issue_type:
            prompt += f"Loại vấn đề: {req.issue_type}\n"
            
        prompt += "\nTrả về phản hồi ngắn gọn dưới 3 dòng tiếng Việt chuyên nghiệp."

        # Call Local Gemini Proxy Service if available
        if local_gemini_chatbot_service.is_available():
            ai_response = local_gemini_chatbot_service.chat_with_ai(
                message=prompt,
                db_session=db
            )
            generated_text = (ai_response.get("message") or ai_response.get("response") or "").strip()
        else:
            # Fallback smart suggestion if local server is starting
            if req.report_type == "Biên bản cuộc họp":
                generated_text = "Thống nhất phương án khắc phục sự cố; Giao bộ phận bảo trì kiểm tra và báo cáo tiến độ vào ngày mai."
            else:
                generated_text = "Đề nghị tạm dừng dây chuyền bị ảnh hưởng, tiến hành phân tích 5-Why và lập phương án khắc phục tạm thời."

        return {"status": "success", "generated_text": generated_text}
    except Exception as e:
        logger.error(f"Lỗi AI Local Gemini: {e}")
        return {
            "status": "fallback",
            "generated_text": "Cần kiểm tra lại thiết bị và quy trình vận hành tại khu vực xảy ra sự cố."
        }

@router.delete("/{report_id}", response_model=dict)
def delete_quick_report(report_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa phiếu báo cáo nhanh theo ID.
    """
    report = db.query(QuickReport).filter(QuickReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo để xóa")
    
    code = report.code
    db.delete(report)
    db.commit()
    return {"message": f"Đã xóa thành công báo cáo {code}", "deleted_id": report_id}

@router.post("/batch-confirm", response_model=dict)
def batch_confirm_quick_reports(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Duyệt/xác nhận nhanh nhiều phiếu báo cáo cùng lúc (tương tự /admin/quality).
    """
    ids = payload.get("ids", [])
    status = payload.get("status", "Đã xong")
    handler_name = payload.get("handler_name", "Quản lý QC")
    
    if not ids:
        raise HTTPException(status_code=400, detail="Danh sách ID không được để trống")
        
    reports = db.query(QuickReport).filter(QuickReport.id.in_(ids)).all()
    count = 0
    now = datetime.now()
    for r in reports:
        r.status = status
        if not r.handler_name:
            r.handler_name = handler_name
        r.updated_at = now
        count += 1
        
    db.commit()
    return {"message": f"Đã xác nhận thành công {count} báo cáo!", "count": count}
