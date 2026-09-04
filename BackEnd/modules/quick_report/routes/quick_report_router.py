# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import json
import logging

from config.database import get_db
from modules.quick_report.models.quick_report import QuickReport
from modules.quick_report.schemas.quick_report_schema import QuickReportCreate, QuickReportUpdate, AIGenerateRequest
from modules.notification.models.notifications import Notification as NotificationModel
from modules.chatbot.services.local_gemini_chatbot_service import local_gemini_chatbot_service

logger = logging.getLogger(__name__)
router = APIRouter()

def generate_next_code(db: Session) -> str:
    count = db.query(QuickReport).count()
    return f"BC-{count + 1:02d}"

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
            
            noti = NotificationModel(
                content=f"🔔 [SmartFlow Báo Cáo Nhanh] Mã phiếu {report.code} ({report.report_type}) vừa được khởi tạo bởi {author_text}.",
                announcer_id=1,
                target_group="Quản lý",
                priority_status="Chờ xử lý"
            )
            db.add(noti)
            db.commit()

            # Gửi Push Notification với Deep-link đến danh sách báo cáo
            from shared.services.notification_service import send_push_to_group
            send_push_to_group(
                db=db,
                target_group="BGD",
                title=noti_title,
                body=noti_body,
                route_path=f"/quick-report-list?id={report.id}"
            )
        except Exception as n_err:
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
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(QuickReport)
        
        if report_type:
            query = query.filter(QuickReport.report_type == report_type)
        if status and status != 'all':
            if status == 'pending':
                query = query.filter(QuickReport.status == 'Chờ xử lý')
            else:
                query = query.filter(QuickReport.status == status)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (QuickReport.code.ilike(search_pattern)) |
                (QuickReport.main_content.ilike(search_pattern)) |
                (QuickReport.creator_name.ilike(search_pattern))
            )
        
        total = query.count()
        reports = query.order_by(QuickReport.id.desc()).offset(skip).limit(limit).all()
        
        # Pending count for badge
        pending_count = db.query(QuickReport).filter(QuickReport.status == "Chờ xử lý").count()

        return {
            "items": [r.to_dict() for r in reports],
            "total": total,
            "pending_count": pending_count
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
    """
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
