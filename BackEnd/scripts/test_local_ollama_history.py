# -*- coding: utf-8 -*-
import os
import sys
import logging
from dotenv import load_dotenv

# Set PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Load Env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_local_ollama")

from config.database import SessionLocal, Base, engine
from modules.auth.models.account_model import Account as AccountModel
from modules.chatbot.models.chatbot_history import ChatbotHistory
from modules.chatbot.services.local_ollama_chatbot_service import local_ollama_chatbot_service
from modules.chatbot.controllers.chatbot_controller import handle_claim_chat

def run_tests():
    # Sync database schema first (create table if not exists)
    print("Syncing database schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("=" * 70)
    print("BẮT ĐẦU CHƯƠNG TRÌNH KIỂM THỬ LOCAL OLLAMA CHAT HISTORY")
    print(f"Local AI URL: {os.getenv('LOCAL_AI_URL')}")
    print(f"Local AI Model: {os.getenv('LOCAL_AI_MODEL')}")
    print(f"Model khả dụng/quét được: {local_ollama_chatbot_service.available_models}")
    print(f"Model được chọn làm active: {local_ollama_chatbot_service.active_model}")
    print("=" * 70)

    # 1. Lấy hoặc tạo tài khoản test để kiểm thử phân quyền lịch sử
    test_user = db.query(AccountModel).filter(AccountModel.username == "admin").first()
    if not test_user:
        print("[INFO] Không tìm thấy tài khoản admin, tạo tài khoản test...")
        test_user = AccountModel(
            username="admin",
            full_name="Administrator",
            is_active=True
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
    print(f"[INFO] Sử dụng tài khoản test: {test_user.username} (ID: {test_user.id})")

    # Xóa lịch sử cũ của tài khoản test trước khi chạy thử
    db.query(ChatbotHistory).filter(ChatbotHistory.account_id == test_user.id).delete()
    db.commit()
    print("[INFO] Đã làm sạch lịch sử chat cũ của tài khoản test.")

    # 2. Gửi tin nhắn đầu tiên
    q1 = "Tháng 2 có bao nhiêu khiếu nại?"
    print(f"\n[TEST 1] Gửi tin nhắn 1: '{q1}'")
    res1 = handle_claim_chat(q1, context={}, db=db, current_user=test_user)
    print("-" * 50)
    print(f"Trả lời:\n{res1.get('answer')}")
    print(f"Source: {res1.get('source')}")

    # Kiểm tra xem trong DB đã lưu tin nhắn chưa
    h_records = db.query(ChatbotHistory).filter(ChatbotHistory.account_id == test_user.id).order_by(ChatbotHistory.created_at.asc()).all()
    print(f"Số bản ghi lưu trong DB hiện tại: {len(h_records)} (Mong đợi: 2 - 1 user + 1 assistant)")
    for i, r in enumerate(h_records):
        print(f"  [{i+1}] Role: {r.role} | Content: {r.content[:60]}...")

    # 3. Gửi tin nhắn thứ hai (kiểm tra khả năng duy trì ngữ cảnh qua DB)
    q2 = "Cabinet 12 bị lỗi gì?"
    print(f"\n[TEST 2] Gửi tin nhắn 2: '{q2}' (Sẽ tự động load lịch sử từ DB)")
    res2 = handle_claim_chat(q2, context=res1.get("context"), db=db, current_user=test_user)
    print("-" * 50)
    print(f"Trả lời:\n{res2.get('answer')}")
    print(f"Source: {res2.get('source')}")

    h_records_v2 = db.query(ChatbotHistory).filter(ChatbotHistory.account_id == test_user.id).order_by(ChatbotHistory.created_at.asc()).all()
    print(f"Số bản ghi lưu trong DB hiện tại: {len(h_records_v2)} (Mong đợi: 4 - 2 user + 2 assistant)")
    for i, r in enumerate(h_records_v2):
        print(f"  [{i+1}] Role: {r.role} | Content: {r.content[:60]}...")

    print("\n" + "=" * 70)
    print("HOÀN THÀNH CHƯƠNG TRÌNH KIỂM THỬ THÀNH CÔNG!")
    print("=" * 70)
    
    db.close()

if __name__ == "__main__":
    run_tests()
