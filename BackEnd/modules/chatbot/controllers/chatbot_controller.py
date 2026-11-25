# -*- coding: utf-8 -*-
"""
Backward-compatible Controller wrapper cho ChatBot v2.
Ủy quyền toàn bộ xử lý sang `chatbot_orchestrator` (Read-Only + ACL + Multi-Domain + Unified LLM Gateway).
"""
from modules.chatbot.core.orchestrator import chatbot_orchestrator


def handle_claim_chat(
    message: str,
    context: dict = None,
    db=None,
    history: list = None,
    current_user=None,
    session_id: str = "default",
) -> dict:
    return chatbot_orchestrator.chat(
        message=message,
        db=db,
        current_user=current_user,
        context=context or {},
        history=history or [],
        session_id=session_id or "default",
    )
