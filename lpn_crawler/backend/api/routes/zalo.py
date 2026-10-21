# -*- coding: utf-8 -*-
"""
Zalo Bot Management API Routes for LPN Crawler
Cung cấp các API quản lý trạng thái, cấu hình Cookie/IMEI, test kết nối,
gửi tin nhắn thử nghiệm và tra cứu nhật ký gửi Zalo.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from lpn_crawler.backend.models.models import (
    LpnZaloConfig,
    LpnZaloLog,
    LpnContainer
)
from lpn_crawler.backend.services.zalo_bot_service import ZaloBotService, normalize_vietnam_phone

router = APIRouter(prefix="/zalo", tags=["lpn-zalo"])


class ZaloConfigUpdateRequest(BaseModel):
    bot_phone: Optional[str] = None
    bot_name: Optional[str] = None
    imei: Optional[str] = None
    session_cookies: Optional[str] = None
    default_recipient_phone: Optional[str] = None
    fallback_manager_phones: Optional[List[str]] = None
    is_auto_send_enabled: Optional[bool] = None


class TestMessageRequest(BaseModel):
    phone: str = Field(..., description="Số điện thoại nhận tin nhắn thử nghiệm")
    message: Optional[str] = Field(None, description="Nội dung tin nhắn tùy chọn")


class ResendContainerReportRequest(BaseModel):
    phone: Optional[str] = Field(None, description="Số điện thoại chỉ định (nếu bỏ trống sẽ lấy SĐT của Container)")
    send_image: bool = Field(True, description="Có gửi kèm ảnh đại diện Container hay không")


@router.get("/status")
def get_zalo_bot_status(db: Session = Depends(get_db)):
    """Lấy thông tin trạng thái hoạt động hiện tại của Zalo Bot"""
    cfg = ZaloBotService.get_or_create_config(db)
    
    fallback_phones = []
    try:
        if cfg.fallback_manager_phones:
            fallback_phones = json.loads(cfg.fallback_manager_phones)
    except Exception:
        pass

    # Đếm số lượng tin nhắn đã gửi hôm nay
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sent = db.query(LpnZaloLog).filter(
        LpnZaloLog.sent_at >= today_start,
        LpnZaloLog.status == "SUCCESS"
    ).count()
    today_failed = db.query(LpnZaloLog).filter(
        LpnZaloLog.sent_at >= today_start,
        LpnZaloLog.status == "FAILED"
    ).count()

    has_cookies = bool(cfg.session_cookies and cfg.session_cookies.strip() not in ["", "{}", "null"])
    has_imei = bool(cfg.imei and cfg.imei.strip())

    return {
        "is_connected": bool(cfg.is_connected),
        "is_configured": bool(has_cookies and has_imei),
        "bot_name": cfg.bot_name or "SmartFlow Zalo Bot",
        "bot_phone": cfg.bot_phone or "",
        "default_recipient_phone": cfg.default_recipient_phone or "",
        "fallback_manager_phones": fallback_phones,
        "is_auto_send_enabled": bool(cfg.is_auto_send_enabled),
        "last_connected_at": cfg.last_connected_at.isoformat() if cfg.last_connected_at else None,
        "last_checked_at": cfg.last_checked_at.isoformat() if cfg.last_checked_at else None,
        "today_stats": {
            "success": today_sent,
            "failed": today_failed,
            "total": today_sent + today_failed
        }
    }


@router.get("/config")
def get_zalo_bot_config(db: Session = Depends(get_db)):
    """Lấy chi tiết cấu hình Zalo Bot (Bao gồm Cookie & IMEI để chỉnh sửa)"""
    cfg = ZaloBotService.get_or_create_config(db)
    
    fallback_phones = []
    try:
        if cfg.fallback_manager_phones:
            fallback_phones = json.loads(cfg.fallback_manager_phones)
    except Exception:
        pass

    return {
        "bot_phone": cfg.bot_phone or "",
        "bot_name": cfg.bot_name or "",
        "imei": cfg.imei or "",
        "session_cookies": cfg.session_cookies or "",
        "default_recipient_phone": cfg.default_recipient_phone or "",
        "fallback_manager_phones": fallback_phones,
        "is_auto_send_enabled": bool(cfg.is_auto_send_enabled),
        "is_connected": bool(cfg.is_connected),
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None
    }


@router.post("/config")
def update_zalo_bot_config(
    payload: ZaloConfigUpdateRequest,
    db: Session = Depends(get_db)
):
    """Cập nhật cấu hình Zalo Bot (Cookie, IMEI, SĐT nhận mặc định, SĐT dự phòng)"""
    cfg = ZaloBotService.get_or_create_config(db)

    if payload.bot_phone is not None:
        cfg.bot_phone = payload.bot_phone.strip()
    if payload.bot_name is not None:
        cfg.bot_name = payload.bot_name.strip()
    if payload.imei is not None:
        cfg.imei = payload.imei.strip()
    if payload.session_cookies is not None:
        cfg.session_cookies = payload.session_cookies.strip()
    if payload.default_recipient_phone is not None:
        cfg.default_recipient_phone = payload.default_recipient_phone.strip()
    if payload.fallback_manager_phones is not None:
        cfg.fallback_manager_phones = json.dumps(payload.fallback_manager_phones, ensure_ascii=False)
    if payload.is_auto_send_enabled is not None:
        cfg.is_auto_send_enabled = payload.is_auto_send_enabled

    cfg.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Cập nhật cấu hình Zalo Bot thành công!"
    }


@router.post("/test-connection")
def test_zalo_connection(db: Session = Depends(get_db)):
    """Kiểm tra trực tiếp phiên kết nối Zalo với Cookie & IMEI hiện tại"""
    res = ZaloBotService.check_connection(db)
    return res


@router.post("/test-message")
def send_test_zalo_message(
    payload: TestMessageRequest,
    db: Session = Depends(get_db)
):
    """Gửi một tin nhắn thử nghiệm tới số điện thoại bất kỳ"""
    res = ZaloBotService.send_test_message(
        phone=payload.phone,
        custom_text=payload.message
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.post("/resend/{container_id}")
def resend_container_report(
    container_id: int,
    payload: ResendContainerReportRequest = Body(default_factory=ResendContainerReportRequest),
    db: Session = Depends(get_db)
):
    """Gửi lại báo cáo kết quả quét của 1 container tới số điện thoại chỉ định hoặc SĐT của Container"""
    cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
    if not cont:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy Container ID {container_id}")

    res = ZaloBotService.send_container_report(
        container_id=container_id,
        target_phone=payload.phone,
        send_image=payload.send_image
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.get("/logs")
def get_zalo_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    container: Optional[str] = None,
    phone: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Xem lịch sử nhật ký các tin nhắn Zalo đã gửi"""
    query = db.query(LpnZaloLog)

    if container:
        query = query.filter(LpnZaloLog.container_number.ilike(f"%{container.strip()}%"))
    if phone:
        clean_p = normalize_vietnam_phone(phone)
        query = query.filter(LpnZaloLog.recipient_phone.ilike(f"%{clean_p}%"))
    if status:
        query = query.filter(LpnZaloLog.status == status.upper())

    total = query.count()
    items = query.order_by(desc(LpnZaloLog.sent_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": it.id,
                "container_id": it.container_id,
                "container_number": it.container_number,
                "recipient_phone": it.recipient_phone,
                "recipient_name": it.recipient_name,
                "message_content": it.message_content,
                "status": it.status,
                "error_reason": it.error_reason,
                "sent_at": it.sent_at.isoformat() if it.sent_at else None
            }
            for it in items
        ]
    }
