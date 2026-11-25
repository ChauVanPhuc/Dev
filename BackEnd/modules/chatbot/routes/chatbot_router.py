# -*- coding: utf-8 -*-
"""
Dedicated FastAPI Router for SmartFlow ChatBot v2 (`/api/v1/chatbot/*`).
Hỗ trợ:
- POST /chat               : Trả lời chuẩn JSON
- POST /chat/stream        : Trả lời SSE Streaming (trạng thái bước xử lý + stream nội dung)
- GET  /sessions           : Danh sách phiên chat của người dùng
- DELETE /sessions/{id}    : Xóa 1 phiên chat
- GET  /history            : Tải lịch sử tin nhắn của 1 phiên
- DELETE /history          : Xóa lịch sử 1 phiên
- POST /feedback           : Gửi đánh giá 👍/👎
- GET  /health             : Trạng thái các AI Provider + cảnh báo hết Cookie Gemini Web
- GET  /admin/gemini-cookie/status : (Admin) Xem chi tiết phiên Cookie Gemini Web
- POST /admin/gemini-cookie        : (Admin) Cập nhật Cookie Gemini Web mới (hot-reload + lưu .env)
"""
import json
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from modules.auth.models.accounts import Account as AccountModel
from modules.chatbot.core.acl_guard import is_admin_user
from modules.chatbot.core.llm_gateway import llm_gateway
from modules.chatbot.core.orchestrator import chatbot_orchestrator
from modules.chatbot.models.chatbot_feedback import ChatbotFeedback
from modules.chatbot.models.chatbot_history import ChatbotHistory

logger = logging.getLogger("chatbot.router")
router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/accounts/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AccountModel:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Phiên đăng nhập đã hết hạn: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(AccountModel).filter(AccountModel.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[list] = None
    session_id: str = "default"


class FeedbackRequest(BaseModel):
    session_id: str = "default"
    message_index: Optional[int] = None
    rating: str  # 'up' | 'down'
    user_question: Optional[str] = None
    bot_answer: Optional[str] = None
    comment: Optional[str] = None
    provider_used: Optional[str] = None
    domains_used: Optional[list] = None
    sql_queries: Optional[list] = None


class CookieUpdatePayload(BaseModel):
    cookies: str
    save_to_env: bool = True


# ───────────────────────── Chat Endpoints ─────────────────────────

@router.post("/chat")
def chat_endpoint(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Thiếu nội dung câu hỏi (message).")
    return chatbot_orchestrator.chat(
        message=body.message.strip(),
        db=db,
        current_user=current_user,
        context=body.context or {},
        history=body.history or [],
        session_id=body.session_id or "default",
    )


@router.post("/chat/stream")
def chat_stream_endpoint(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Thiếu nội dung câu hỏi (message).")

    def event_generator():
        try:
            for event in chatbot_orchestrator.stream_chat(
                message=body.message.strip(),
                db=db,
                current_user=current_user,
                context=body.context or {},
                history=body.history or [],
                session_id=body.session_id or "default",
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.exception("SSE stream error:")
            err_evt = {"type": "error", "message": f"Lỗi hệ thống: {str(e)}"}
            yield f"data: {json.dumps(err_evt, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ───────────────────────── History & Sessions ─────────────────────────

@router.get("/history")
def get_history(
    session_id: str = "default",
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    histories = (
        db.query(ChatbotHistory)
        .filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id,
        )
        .order_by(ChatbotHistory.created_at.asc())
        .all()
    )
    result = []
    for h in histories:
        items, suggestions, charts, infographics = [], [], [], []
        if h.items_json:
            try:
                items = json.loads(h.items_json)
            except Exception:
                pass
        if h.suggestions_json:
            try:
                suggestions = json.loads(h.suggestions_json)
            except Exception:
                pass
        if h.context_json:
            try:
                ctx_obj = json.loads(h.context_json)
                if isinstance(ctx_obj, dict):
                    charts = ctx_obj.get("_charts") or []
                    infographics = ctx_obj.get("_infographics") or []
            except Exception:
                pass
        result.append({
            "role": h.role,
            "content": h.content,
            "items": items,
            "charts": charts,
            "infographics": infographics,
            "suggestions": suggestions,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        })
    return result


@router.delete("/history")
def clear_history(
    session_id: str = "default",
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    try:
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id,
        ).delete()
        db.commit()
        return {"message": "Đã xóa lịch sử trò chuyện thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa lịch sử: {e}")


@router.get("/sessions")
def get_sessions(
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    subq = (
        db.query(
            ChatbotHistory.session_id,
            func.max(ChatbotHistory.created_at).label("max_created_at"),
        )
        .filter(ChatbotHistory.account_id == current_user.id)
        .group_by(ChatbotHistory.session_id)
        .subquery()
    )
    rows = (
        db.query(
            ChatbotHistory.session_id,
            ChatbotHistory.session_title,
            ChatbotHistory.created_at,
        )
        .join(
            subq,
            (ChatbotHistory.session_id == subq.c.session_id)
            & (ChatbotHistory.created_at == subq.c.max_created_at),
        )
        .filter(ChatbotHistory.account_id == current_user.id)
        .order_by(ChatbotHistory.created_at.desc())
        .all()
    )
    seen = set()
    sessions = []
    for r in rows:
        sid = r.session_id or "default"
        if sid in seen:
            continue
        seen.add(sid)
        sessions.append({
            "session_id": sid,
            "session_title": r.session_title or "Cuộc trò chuyện mới",
            "updated_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"sessions": sessions}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    try:
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id,
        ).delete()
        db.commit()
        return {"message": "Đã xóa phiên trò chuyện."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa phiên: {e}")


# ───────────────────────── Feedback ─────────────────────────

@router.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    if body.rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="rating phải là 'up' hoặc 'down'.")
    try:
        fb = ChatbotFeedback(
            account_id=current_user.id,
            session_id=body.session_id,
            message_index=body.message_index,
            rating=body.rating,
            user_question=body.user_question,
            bot_answer=body.bot_answer,
            comment=body.comment,
            provider_used=body.provider_used,
            domains_used=",".join(body.domains_used or []),
            sql_queries_json=json.dumps(body.sql_queries or [], ensure_ascii=False),
        )
        db.add(fb)
        db.commit()
        return {"message": "Cảm ơn bạn đã đánh giá!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu đánh giá: {e}")


# ───────────────────────── Health & Admin Cookie Manager ─────────────────────────

@router.get("/health")
def get_chatbot_health(
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    health = llm_gateway.get_health_status()
    health["is_admin"] = is_admin_user(current_user, db)
    return health


@router.get("/admin/gemini-cookie/status")
def get_gemini_cookie_status(
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    if not is_admin_user(current_user, db):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới được xem cấu hình Cookie AI.")
    return llm_gateway.get_local_gemini_cookie_status()


@router.post("/admin/gemini-cookie")
def update_gemini_cookie(
    body: CookieUpdatePayload,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    if not is_admin_user(current_user, db):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới có quyền cập nhật Cookie Gemini.")
    result = llm_gateway.update_local_gemini_cookie(body.cookies, save_to_env=body.save_to_env)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Cập nhật Cookie thất bại.")
    return result

