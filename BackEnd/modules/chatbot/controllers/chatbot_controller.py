# -*- coding: utf-8 -*-
import os
import re
import json
import logging
from datetime import datetime
from modules.chatbot.services.intent_detector import detect_intent
from modules.chatbot.services.filter_extractor import extract_filters
from modules.chatbot.services.typo_corrector import correct_typos
from modules.chatbot.services.query_builder import query_claims, build_answer
from modules.chatbot.services.local_gemini_chatbot_service import local_gemini_chatbot_service


# Configure logging for chatbot module
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("chatbot")
logger.setLevel(logging.INFO)

import time

COOLDOWNS = {}

def is_service_cooldown(service_name: str) -> bool:
    expiry = COOLDOWNS.get(service_name, 0)
    if time.time() < expiry:
        remaining = int(expiry - time.time())
        logger.info(f"[Circuit Breaker] Bo qua goi {service_name} (Thoi gian hoi: con {remaining} giay)")
        return True
    return False

def set_service_cooldown(service_name: str, seconds: int = 60):
    COOLDOWNS[service_name] = time.time() + seconds
    logger.warning(f"[Circuit Breaker] Thiet lap thoi gian hoi cho {service_name} trong {seconds} giay do loi/rate limit/timeout.")


# Paths for claim imports - use from claim module
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CLAIM_IMPORTS_DIR = os.path.join(BACKEND_DIR, "static", "uploads", "claim_imports")
JSON_DIR = os.path.join(CLAIM_IMPORTS_DIR, "json")
STATIC_DIR = os.path.join(BACKEND_DIR, "static")

def load_claims_from_db(db) -> list:
    """
    Loads all claim records from Database only (JSON save disabled).
    """
    if db is None:
        return []
    
    try:
        from modules.claim.controllers import claim_controller
        from modules.claim.models.claim_models import CustomerClaim
        
        claims = []
        
        # Load from database only
        try:
            actual_count = db.query(CustomerClaim).count()
            
            db_items, total = claim_controller.get_claims(db, skip=0, limit=10000)
            
            for item in db_items:
                claims.append({
                    "id": item.id,
                    "cabinet_no": None, # Will be extracted from claim_code
                    "claim_code": item.claim_code,
                    "product_name": item.product_name,
                    "sku": item.product_name,
                    "order_code": item.order_code,
                    "defect_code": item.order_code,
                    "description": item.description,
                    "claim_description": item.description,
                    "action": item.action,
                    "penalty": item.action,
                    "period": item.period,
                    "date": item.period,
                    "container_no": item.container_no,
                    "cont": item.container_no,
                    "lpn": item.lpn,
                    "image_paths": item.image_paths,
                    "image_captions": item.image_captions,
                    "status": item.status,
                    "severity": item.severity,
                    "company_error_code": item.company_error_code,
                    "stt": getattr(item, 'stt', None)
                })
        except Exception as db_err:
            logger.error(f"Error loading claims from database: {db_err}")
        
        return claims
    except Exception as e:
        logger.error(f"Error loading claims for chatbot: {e}")
        return []

def normalize_claim_record(r: dict, db = None) -> dict:
    """
    Normalizes a claim record dict to standard keys and resolves aliases.
    """
    cabinet_no = r.get("cabinet_no")
    claim_code = r.get("claim_code") or r.get("claim_item")
    if not claim_code and cabinet_no is not None:
        claim_code = f"Cabinet #{cabinet_no}"
    elif claim_code and cabinet_no is None:
        # Try different formats for cabinet_no extraction
        match = re.search(r'Cabinet\s*#\s*(\d+)', str(claim_code), re.IGNORECASE)
        if match:
            cabinet_no = int(match.group(1))
        else:
            # Try CLAIM-CABINET1-1 format
            match = re.search(r'CABINET(\d+)', str(claim_code), re.IGNORECASE)
            if match:
                cabinet_no = int(match.group(1))
            
    sku = r.get("sku") or r.get("product_name") or ""
    product_name = sku
    
    defect_code = r.get("defect_code") or r.get("order_code") or ""
    order_code = defect_code
    
    description = r.get("description") or r.get("claim_description") or ""
    claim_description = description
    
    action = r.get("action") or r.get("penalty") or ""
    penalty = action
    
    period = r.get("period") or r.get("date") or ""
    date = period
    
    container = r.get("container") or r.get("container_no") or r.get("cont") or ""
    container_no = container
    cont = container
    
    lpn = r.get("lpn") or ""
    
    # Normalize image paths to absolute static URLs
    raw_images = r.get("image_paths") or []
    image_paths = []
    for img in raw_images:
        if not img:
            continue
        if img.startswith("/api/v1/claims/"):
            image_paths.append(img)
        else:
            clean_img = img.replace("\\", "/").lstrip("/")
            if clean_img.startswith("claim_imports/"):
                image_paths.append(f"/api/v1/claims/{clean_img}")
            else:
                image_paths.append(f"/api/v1/claims/claim_imports/{clean_img}")
                
    image_captions = r.get("image_captions") or []
    status = r.get("status") or "Mới"
    severity = r.get("severity") or "Low"
    company_error_code = r.get("company_error_code") or ""
    parse_warnings = r.get("parse_warnings") or []
    capa_link = r.get("capa_link") or r.get("link_capa") or ""
    
    # Tự động lấy Tên lỗi tiếng Việt từ database nếu câu query không JOIN với client_defects
    defect_name = r.get("defect_name") or r.get("name") or ""
    if not defect_name and db and order_code:
        try:
            codes = [c.strip() for c in str(order_code).split(",") if c.strip()]
            if codes:
                from modules.inspection.models.defect_type import ClientDefect
                defect_records = db.query(ClientDefect).filter(ClientDefect.code.in_(codes)).all()
                if defect_records:
                    defect_name = ", ".join([d.name for d in defect_records if d.name])
        except Exception as db_err:
            logger.warning(f"Error looking up defect name: {db_err}")
    
    return {
        "id": r.get("id"),
        "cabinet_no": cabinet_no,
        "claim_code": claim_code,
        "product_name": product_name,
        "sku": sku,
        "order_code": order_code,
        "defect_code": defect_code,
        "defect_name": defect_name,
        "description": description,
        "claim_description": claim_description,
        "action": action,
        "penalty": penalty,
        "period": period,
        "date": date,
        "container": container,
        "container_no": container_no,
        "cont": cont,
        "lpn": lpn,
        "image_paths": image_paths,
        "image_captions": image_captions,
        "status": status,
        "severity": severity,
        "company_error_code": company_error_code,
        "parse_warnings": parse_warnings,
        "capa_link": capa_link
    }

def is_asking_for_details(message: str) -> bool:
    """
    Checks if the user message is asking for details.
    """
    msg = message.lower()
    keywords = ["chi tiết", "chi tiet", "danh sách", "danh sach", "liệt kê", "liet ke", "show details", "details", "list", "detail"]
    return any(k in msg for k in keywords)

def is_follow_up_message(message: str) -> bool:
    """
    Checks if the message refers to pronouns/entities in the previous context.
    """
    msg = message.lower()
    
    pronouns = [
        "nó", "no",
        "tủ đó", "tu do", "tủ đo",
        "cái đó", "cai do",
        "claim đó", "claim do",
        "dòng đó", "dong do",
        "mã đó", "ma do",
        "ảnh của nó", "anh cua no",
        "hình của nó", "hinh cua no",
        "còn cái này", "con cai nay",
        "đối với tủ đó thì sao", "doi voi tu do thi sao",
        "tủ này", "tu nay",
        "dòng này", "dong nay",
        "claim này", "claim nay",
        "mã này", "ma nay",
        "lỗi đó", "loi do",
        "lỗi này", "loi nay",
        "ảnh lỗi", "anh loi", "hình lỗi", "hinh loi"
    ]
    if any(p in msg for p in pronouns):
        return True
        
    pure_commands = [
        "chi tiết", "chi tiet", "dòng đầu", "dong dau", "dòng đó", "dong do",
        "có ảnh không", "co anh khong", "có hình không", "co hinh khong",
        "xem ảnh", "xem anh", "xem hình", "xem hinh", "ảnh đâu", "anh dau", "hình đâu", "hinh dau",
        "action là gì", "action la gi", "biện pháp là gì", "bien phap la gi", "phạt gì", "phat gi",
        "biện pháp gì", "bien phap gi", "capa là gì", "capa la gi", "xin capa", "link capa"
    ]
    if any(c in msg for c in pure_commands):
        return True
        
    return False

def is_context_empty(context: dict) -> bool:
    """
    Checks if the given context has no active filters/items stored.
    """
    if not context:
        return True
    
    has_entity = (
        context.get("last_cabinet_no") is not None or
        context.get("last_sku") or
        context.get("last_period") or
        context.get("last_defect_code") or
        context.get("last_action") or
        context.get("last_container") or
        context.get("last_lpn") or
        context.get("last_status") or
        context.get("last_severity") or
        context.get("last_items") or
        context.get("last_intent")
    )
    return not has_entity

def _update_context_with_filters(context: dict, filters: dict):
    """
    Helper function to update context with filters.
    """
    if not filters:
        return
    if "cabinet_no" in filters and filters["cabinet_no"] is not None:
        context["last_cabinet_no"] = filters["cabinet_no"]
    if "sku" in filters and filters["sku"]:
        context["last_sku"] = filters["sku"]
    if "period" in filters and filters["period"]:
        context["last_period"] = filters["period"]
    elif ("month" in filters and filters["month"]) or ("year" in filters and filters["year"]):
        month = filters.get("month", "")
        year = filters.get("year", "")
        if month and year:
            context["last_period"] = f"{int(month):02d}-{year}"
        elif year:
            context["last_period"] = f"%-{year}"
    if "defect_code" in filters and filters["defect_code"]:
        context["last_defect_code"] = filters["defect_code"]
    if "action" in filters and filters["action"]:
        context["last_action"] = filters["action"]
    if "container_no" in filters and filters["container_no"]:
        context["last_container"] = filters["container_no"]
    if "lpn" in filters and filters["lpn"]:
        context["last_lpn"] = filters["lpn"]
    if "status" in filters and filters["status"]:
        context["last_status"] = filters["status"]
    if "severity" in filters and filters["severity"]:
        context["last_severity"] = filters["severity"]

def _should_normalize_as_claim(item: dict) -> bool:
    """
    Checks if a dictionary item resembles a customer claim record.
    Returns True if it has typical claim identifiers, False otherwise.
    """
    if not isinstance(item, dict):
        return False
    claim_keys = {"claim_code", "product_name", "order_code", "lpn", "container_no"}
    return any(k in item for k in claim_keys)

def _update_context_with_entity_details(context: dict, item: dict):
    """
    Updates context with specific entity identification details from a matched database record.
    Does NOT update query filters like status, severity, action, or period to prevent pollution.
    """
    if not item or not isinstance(item, dict):
        return
        
    # Only update specific entity identifiers
    if "cabinet_no" in item and item["cabinet_no"] is not None:
        context["last_cabinet_no"] = item["cabinet_no"]
    elif "claim_code" in item and item["claim_code"]:
        m = re.search(r'#?\s*(\d+)', item["claim_code"])
        if m:
            context["last_cabinet_no"] = int(m.group(1))
            
    if "sku" in item and item["sku"]:
        context["last_sku"] = item["sku"]
    elif "product_name" in item and item["product_name"]:
        context["last_sku"] = item["product_name"]
        
    if "container_no" in item and item["container_no"]:
        context["last_container"] = item["container_no"]
    elif "container" in item and item["container"]:
        context["last_container"] = item["container"]
        
    if "lpn" in item and item["lpn"]:
        context["last_lpn"] = item["lpn"]

def _call_cloud_ai_fallback(message: str, db, context: dict, active_history: list) -> dict:
    # 1. Thử GitHub Models (GPT-4o-mini)
    if github_chatbot_service.is_available():
        try:
            logger.info("[Fallback] Đang gọi GitHub Models (GPT-4o-mini)...")
            res = github_chatbot_service.chat_with_ai(message, db, context, active_history)
            if res and res.get("intent") != "error":
                return res
            else:
                logger.warning(f"[Fallback] GitHub Models trả lỗi: {res.get('message') if res else 'None'}")
        except Exception as e:
            logger.error(f"[Fallback] Lỗi khi gọi GitHub Models: {e}")
            
    # 2. Thử Groq (Llama 3.3 70B)
    if groq_chatbot_service.is_available():
        try:
            logger.info("[Fallback] Đang gọi Groq (Llama 3.3 70B)...")
            res = groq_chatbot_service.chat_with_ai(message, db, context, active_history)
            if res and res.get("intent") != "error":
                return res
            else:
                logger.warning(f"[Fallback] Groq trả lỗi: {res.get('message') if res else 'None'}")
        except Exception as e:
            logger.error(f"[Fallback] Lỗi khi gọi Groq: {e}")
            
    # 3. Thử OpenRouter
    if openrouter_chatbot_service.is_available():
        try:
            logger.info("[Fallback] Đang gọi OpenRouter...")
            res = openrouter_chatbot_service.chat_with_ai(message, db, context, active_history)
            if res and res.get("intent") != "error":
                return res
            else:
                logger.warning(f"[Fallback] OpenRouter trả lỗi: {res.get('message') if res else 'None'}")
        except Exception as e:
            logger.error(f"[Fallback] Lỗi khi gọi OpenRouter: {e}")
            
    return None


def _process_ai_response(ai_res: dict, message: str, db, context: dict, user_id: int, session_id: str = "default", session_title: str = None) -> dict:
    raw_items = ai_res.get("items") or []
    normalized_items = []
    for item in raw_items:
        if isinstance(item, dict):
            try:
               if _should_normalize_as_claim(item):
                   normalized_items.append(normalize_claim_record(item, db))
               else:
                   normalized_items.append(item)
            except Exception as norm_err:
                logger.warning(f"Error normalizing retrieved item: {norm_err}")
                normalized_items.append(item)
        else:
            normalized_items.append(item)
    
    # Cập nhật context từ bản ghi đầu tiên nếu có
    if normalized_items:
        _update_context_with_entity_details(context, normalized_items[0])
    
    ans_text = ai_res.get("message") or ""
    
    # Lưu câu trả lời của AI vào database
    if db is not None and user_id is not None:
        try:
            from modules.chatbot.models.chatbot_history import ChatbotHistory
            bot_msg = ChatbotHistory(
                account_id=user_id,
                session_id=session_id,
                session_title=session_title,
                role="assistant",
                content=ans_text,
                items_json=json.dumps(normalized_items, ensure_ascii=False),
                suggestions_json=json.dumps([], ensure_ascii=False),
                context_json=json.dumps(context, ensure_ascii=False)
            )
            db.add(bot_msg)
            db.commit()
        except Exception as save_err:
            logger.error(f"Error saving AI message to DB: {save_err}")
            
    return {
        "answer": ans_text,
        "intent": "ai_agent",
        "filters": {},
        "matched_count": len(normalized_items),
        "items": normalized_items,
        "suggestions": [],
        "context": context,
        "source": ai_res.get("source", "unknown")
    }


def handle_claim_chat(message: str, context: dict = None, db = None, history: list = None, current_user = None, session_id: str = "default") -> dict:
    """
    Chatbot entrypoint. Tải lịch sử tin nhắn từ database cho người dùng hiện tại (nếu có),
    chỉ gọi AI Local (Ollama) và lưu tin nhắn mới vào SQL Server.
    Nếu AI Local gặp sự cố hoặc người dùng yêu cầu rõ ràng, tự động chuyển sang Cloud AI (GitHub, Groq...).
    Nếu tất cả đều lỗi, tự động fallback về Rule-based chatbot.
    """
    if context is None:
        context = {}
    if history is None:
        history = []
        
    user_id = current_user.id if current_user else None
    
    # 1. Tải lịch sử chat từ database của người dùng hiện tại cho phiên này (lấy tối đa 15 tin nhắn gần nhất)
    db_history = []
    if db is not None and user_id is not None:
        try:
            from modules.chatbot.models.chatbot_history import ChatbotHistory
            histories = db.query(ChatbotHistory).filter(
                ChatbotHistory.account_id == user_id,
                ChatbotHistory.session_id == session_id
            ).order_by(ChatbotHistory.created_at.asc()).all()
            
            for h in histories[-15:]:
                role_val = h.role if h.role in ["user", "assistant"] else "assistant"
                db_history.append({
                    "role": role_val,
                    "content": h.content
                })
        except Exception as e:
            logger.error(f"Error loading chat history from DB: {e}")
            
    # Ưu tiên lịch sử lấy từ DB, nếu trống mới dùng history truyền vào (cho tương thích ngược)
    active_history = db_history if db_history else history

    # 2. Lưu câu hỏi của người dùng vào database
    title = None
    if db is not None and user_id is not None:
        try:
            from modules.chatbot.models.chatbot_history import ChatbotHistory
            existing_session = db.query(ChatbotHistory).filter(
                ChatbotHistory.account_id == user_id,
                ChatbotHistory.session_id == session_id
            ).first()
            
            if not existing_session:
                title = message[:50] + "..." if len(message) > 50 else message
            else:
                title = existing_session.session_title
                
            user_msg = ChatbotHistory(
                account_id=user_id,
                session_id=session_id,
                session_title=title,
                role="user",
                content=message,
                context_json=json.dumps(context, ensure_ascii=False)
            )
            db.add(user_msg)
            db.commit()
        except Exception as save_err:
            logger.error(f"Error saving user message to DB: {save_err}")
            
            
    # [IMAGE GENERATION INTEGRATION]
    msg_lower = message.lower().strip()
    image_keywords = ["vẽ", "tạo ảnh", "tạo hình", "generate image", "gen ảnh", "gen anh", "vẽ hình", "ve hinh", "vẽ tranh", "ve tranh", "dựng hình", "draw"]
    chart_keywords = ["biểu đồ", "bieu do", "đồ thị", "do thi", "chart", "diagram", "pareto", "cơ cấu", "co cau", "tỷ lệ", "ty le", "pie", "bar", "line"]
    
    is_image_request = False
    for kw in image_keywords:
        if kw in msg_lower:
            is_image_request = True
            break
            
    # Bỏ qua image generator nếu câu hỏi thực chất là yêu cầu vẽ biểu đồ/đồ thị
    if is_image_request:
        for ckw in chart_keywords:
            if ckw in msg_lower:
                is_image_request = False
                break
            
    if is_image_request:
        import urllib.parse
        import uuid
        import requests
        
        # Trích xuất mô tả chi tiết từ tin nhắn
        clean_prompt = message
        for kw in image_keywords:
            clean_prompt = re.sub(rf'\b{kw}\b', '', clean_prompt, flags=re.IGNORECASE)
        # Loại bỏ các từ nối và phụ từ phổ biến để có prompt sạch
        fillers = ["hộ tôi", "cho tôi", "ảnh", "hình", "tranh", "vẽ", "cái", "một", "bức", "chi tiết", "về", "vẽ một", "vẽ bức", "thiết kế", "thiet ke"]
        for f in fillers:
            clean_prompt = re.sub(rf'\b{f}\b', '', clean_prompt, flags=re.IGNORECASE)
        clean_prompt = clean_prompt.strip()
        if not clean_prompt:
            clean_prompt = "beautiful wooden cabinet design, high detail"
            
        # Encode URL
        encoded_prompt = urllib.parse.quote(clean_prompt)
        # Sử dụng API của Pollinations để generate ảnh chất lượng cao
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&nologo=true"
        
        # Lưu ảnh về server local để lưu trữ ổn định
        static_gen_dir = os.path.join(STATIC_DIR, "uploads", "generated_images")
        os.makedirs(static_gen_dir, exist_ok=True)
        filename = f"gen_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(static_gen_dir, filename)
        local_url = f"/static/uploads/generated_images/{filename}"
        
        try:
            response = requests.get(image_url, timeout=30)
            if response.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(response.content)
            else:
                local_url = image_url
        except Exception as img_err:
            logger.error(f"Error saving generated image: {img_err}")
            local_url = image_url
            
        ans_text = f"Dưới đây là hình ảnh thiết kế **{clean_prompt}** được tạo tự động theo yêu cầu của bạn:\n\n![{clean_prompt}]({local_url})"
        
        # Lưu vào lịch sử chat
        if db is not None and user_id is not None:
            try:
                from modules.chatbot.models.chatbot_history import ChatbotHistory
                bot_msg = ChatbotHistory(
                    account_id=user_id,
                    session_id=session_id,
                    session_title=title,
                    role="assistant",
                    content=ans_text,
                    items_json=json.dumps([], ensure_ascii=False),
                    suggestions_json=json.dumps([], ensure_ascii=False),
                    context_json=json.dumps(context, ensure_ascii=False)
                )
                db.add(bot_msg)
                db.commit()
            except Exception as save_err:
                logger.error(f"Error saving AI image response to DB: {save_err}")
                
        return {
            "answer": ans_text,
            "intent": "generate_image",
            "filters": {},
            "matched_count": 0,
            "items": [],
            "suggestions": [
                "Vẽ thiết kế tủ bếp gỗ sồi cổ điển",
                "Vẽ tủ quần áo hiện đại cánh kính âm led",
                "Vẽ kệ tivi gỗ óc chó cao cấp"
            ],
            "context": context,
            "source": "LocalImageGenerator"
        }

    # Cập nhật ngữ cảnh hiện tại dựa trên tin nhắn mới
    current_filters = extract_filters(message)
    _update_context_with_filters(context, current_filters)
        
    # Chuẩn bị tin nhắn gửi cho LLM (thay thế "vẽ" thành "tạo" để tránh LLM từ chối tạo hình ảnh)
    gemini_message = message
    if not is_image_request:
        gemini_message = re.sub(r'\bvẽ\b', 'tạo', gemini_message, flags=re.IGNORECASE)
        gemini_message = re.sub(r'\bve\b', 'tao', gemini_message, flags=re.IGNORECASE)

    # 3. Định tuyến duy nhất tới Local Gemini (Không dùng các AI Cloud/Local khác làm fallback)
    ai_res = None
    try:
        logger.info("[ChatRouter] Chạy duy nhất dịch vụ Local Gemini...")
        res = local_gemini_chatbot_service.chat_with_ai(gemini_message, db, context, active_history)
        if res:
            ai_res = res
    except Exception as e:
        logger.error(f"[ChatRouter] Lỗi khi chạy Local Gemini: {e}")


    if ai_res:
        return _process_ai_response(ai_res, message, db, context, user_id, session_id=session_id, session_title=title)

    # 4. Fallback: Hệ thống tìm kiếm cơ bản (Rule-based chatbot)
    raw_claims = load_claims_from_db(db)
    all_claims = [normalize_claim_record(c) for c in raw_claims]
    
    # Tải bảng giá tủ gỗ để tính toán giá trị phạt
    cabinet_prices = {}
    db_loaded_count = 0
    temp_loaded_count = 0
    
    if db is not None:
        try:
            from modules.claim.models.claim_models import CabinetPrice
            prices_db = db.query(CabinetPrice).all()
            db_loaded_count = len(prices_db)
            for p in prices_db:
                if p.cabinet_code:
                    cabinet_prices[p.cabinet_code.strip().upper()] = p.sale_price or 0.0
                if p.cabinet_name:
                    cabinet_prices[p.cabinet_name.strip().upper()] = p.sale_price or 0.0
        except Exception as price_err:
            logger.error(f"Error loading cabinet prices from DB: {price_err}")
    temp_json_path = r"c:\SmartFlow_v2\BackEnd\modules\price_imports\temp_cabinet_prices.json"
    if os.path.exists(temp_json_path):
        try:
            with open(temp_json_path, "r", encoding="utf-8") as f:
                temp_prices_data = json.load(f)
                if isinstance(temp_prices_data, list):
                    temp_loaded_count = len(temp_prices_data)
                    for item in temp_prices_data:
                        code = item.get("cabinet_code")
                        name = item.get("cabinet_name")
                        material = item.get("material")
                        sale_price = item.get("sale_price") or item.get("price") or 0.0
                        
                        if code:
                            cabinet_prices[str(code).strip().upper()] = float(sale_price)
                        if name:
                            cabinet_prices[str(name).strip().upper()] = float(sale_price)
                        if material:
                            cabinet_prices[str(material).strip().upper()] = float(sale_price)
        except Exception as json_err:
            logger.error(f"Error loading temp cabinet prices: {json_err}")

    fallback_note = "\n\n*Lưu ý: Hiện tại AI đang không khả dụng, hệ thống đang sử dụng chế độ tìm kiếm cơ bản.*"
    
    filters = extract_filters(message)
    is_follow_up = is_follow_up_message(message)
    intent = detect_intent(message)
    is_follow_up_intent = intent in ["show_images", "explain_action", "show_capa", "follow_up_detail"]
    
    has_query_entities = (
        filters.get("cabinet_no") is not None or
        filters.get("sku") or
        filters.get("period") or
        filters.get("month") or
        filters.get("year") or
        filters.get("defect_code") or
        filters.get("container_no") or
        filters.get("lpn")
    )
    
    if (is_follow_up or is_follow_up_intent) and not has_query_entities and is_context_empty(context):
        fallback_ans = "Bạn đang hỏi tiếp về claim nào? Vui lòng nhập Cabinet, SKU hoặc tháng để mình tra cứu chính xác."
        # Lưu câu trả lời của AI vào database
        if db is not None and user_id is not None:
            try:
                from modules.chatbot.models.chatbot_history import ChatbotHistory
                bot_msg = ChatbotHistory(
                    account_id=user_id,
                    session_id=session_id,
                    session_title=title,
                    role="assistant",
                    content=fallback_ans,
                    items_json=json.dumps([], ensure_ascii=False),
                    suggestions_json=json.dumps([], ensure_ascii=False),
                    context_json=json.dumps(context, ensure_ascii=False)
                )
                db.add(bot_msg)
                db.commit()
            except Exception as save_err:
                logger.error(f"Error saving fallback response to DB: {save_err}")
                
        return {
            "answer": fallback_ans,
            "intent": intent,
            "filters": {},
            "matched_count": 0,
            "items": [],
            "suggestions": [
                "Tháng 2 có bao nhiêu claim?",
                "Cabinet 12 bị lỗi gì?",
                "SKU A042S-L-BC-WOA bị lỗi gì?"
            ],
            "context": context
        }
    
    should_merge = is_follow_up or is_follow_up_intent or is_asking_for_details(message) or (not has_query_entities and not is_context_empty(context))
    if should_merge:
        if "cabinet_no" not in filters and context.get("last_cabinet_no") is not None:
            filters["cabinet_no"] = context["last_cabinet_no"]
        if "sku" not in filters and context.get("last_sku"):
            filters["sku"] = context["last_sku"]
        if "period" not in filters and context.get("last_period"):
            filters["period"] = context["last_period"]
        if "defect_code" not in filters and context.get("last_defect_code"):
            filters["defect_code"] = context["last_defect_code"]
        if "action" not in filters and context.get("last_action"):
            filters["action"] = context["last_action"]
        if "container_no" not in filters and context.get("last_container"):
            filters["container_no"] = context["last_container"]
        if "lpn" not in filters and context.get("last_lpn"):
            filters["lpn"] = context["last_lpn"]
        if "status" not in filters and context.get("last_status"):
            filters["status"] = context["last_status"]
        if "severity" not in filters and context.get("last_severity"):
            filters["severity"] = context["last_severity"]
            
    if should_merge and "keyword" in filters and any(k in filters for k in ["period", "cabinet_no", "sku"]):
        filters.pop("keyword", None)
    
    filters = correct_typos(filters, all_claims)
    
    if intent == "count_all" and "period" in filters:
        intent = "count_by_date"
    
    results = query_claims(intent, filters, all_claims)
    answer = build_answer(intent, filters, results, all_claims, message, cabinet_prices)
    
    context["last_intent"] = intent
    if "cabinet_no" in filters:
        context["last_cabinet_no"] = filters["cabinet_no"]
    if "sku" in filters:
        context["last_sku"] = filters["sku"]
    if "period" in filters:
        context["last_period"] = filters["period"]
    if "defect_code" in filters:
        context["last_defect_code"] = filters["defect_code"]
    if "action" in filters:
        context["last_action"] = filters["action"]
    if "container_no" in filters:
        context["last_container"] = filters["container_no"]
    if "lpn" in filters:
        context["last_lpn"] = filters["lpn"]
    if "status" in filters:
        context["last_status"] = filters["status"]
    if "severity" in filters:
        context["last_severity"] = filters["severity"]
    context["last_items"] = results[:10]
    
    default_limit = 1 if intent == "find_latest" else None
    limit = filters.get("limit", default_limit)
    
    final_answer = answer + fallback_note
    
    is_asking_for_money = any(k in message.lower() for k in ["phạt", "phat", "tiền", "tien", "đền", "den", "giá", "gia", "bảng giá", "bang gia", "bc", "x2"])
    return_items = (is_asking_for_details(message) or intent == "find_latest") and not is_asking_for_money
    
    matched_results = (results[:limit] if limit is not None else results) if return_items else []
    
    # Lưu câu trả lời fallback vào database
    if db is not None and user_id is not None:
        try:
            from modules.chatbot.models.chatbot_history import ChatbotHistory
            bot_msg = ChatbotHistory(
                account_id=user_id,
                session_id=session_id,
                session_title=title,
                role="assistant",
                content=final_answer,
                items_json=json.dumps(matched_results, ensure_ascii=False),
                suggestions_json=json.dumps([], ensure_ascii=False),
                context_json=json.dumps(context, ensure_ascii=False)
            )
            db.add(bot_msg)
            db.commit()
        except Exception as save_err:
            logger.error(f"Error saving fallback response to DB: {save_err}")
            
    return {
        "answer": final_answer,
        "intent": intent,
        "filters": filters,
        "matched_count": len(results),
        "items": matched_results,
        "suggestions": [],
        "context": context
    }
