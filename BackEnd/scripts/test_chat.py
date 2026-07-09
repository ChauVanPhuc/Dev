# -*- coding: utf-8 -*-
import sys
import json
from dotenv import load_dotenv

sys.path.append(r"c:\SmartFlow_v2\BackEnd")
load_dotenv(r"c:\SmartFlow_v2\BackEnd\.env")

from config.database import SessionLocal
from modules.chatbot.services.local_ollama_chatbot_service import local_ollama_chatbot_service

db = SessionLocal()
try:
    print("--- TEST CHAT 1 ---")
    res1 = local_ollama_chatbot_service.chat_with_ai(
        message="tháng 2 năm 2026 có bao nhiêu claim",
        db_session=db,
        context={},
        history=[]
    )
    print("\nResult 1:")
    print(json.dumps(res1, indent=2, ensure_ascii=False))

    print("\n--- TEST CHAT 2 (FOLLOW UP) ---")
    # Simulate history with res1
    history = [
        {"role": "user", "content": "tháng 2 năm 2026 có bao nhiêu claim"},
        {"role": "assistant", "content": res1.get("message", "")}
    ]
    res2 = local_ollama_chatbot_service.chat_with_ai(
        message="list ra chi tiết",
        db_session=db,
        context=res1.get("context", {}),
        history=history
    )
    print("\nResult 2:")
    print(json.dumps(res2, indent=2, ensure_ascii=False))

finally:
    db.close()
