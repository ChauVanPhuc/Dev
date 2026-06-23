# -*- coding: utf-8 -*-
# FILE_VERSION_ID: 2026-06-18-09-00
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from config.database import get_db
from modules.claim.controllers import claim_controller as controllers
from modules.claim.controllers import import_controller as controllers_import
from modules.claim.schemas import claim_schemas as schemas
from modules.inspection.models.defect_type import ClientDefect
from jose import jwt, JWTError
from config.settings import settings
from modules.auth.models.accounts import Account as AccountModel

router = APIRouter()


def resolve_company_error_codes(order_code: str, db: Session = None) -> str:
    return controllers_import.resolve_company_error_codes(order_code, db)


# --- CUSTOMER CLAIMS ENDPOINTS ---
@router.get("/claims", response_model=Dict[str, Any])
def read_claims(
    page: int = 1,
    size: int = 100000,  # Load all claims by default
    search: str = None,
    status: str = None,
    year: int = None,  # No year filter by default - load all years
    db: Session = Depends(get_db)
):
    skip = (page - 1) * size if size else 0
    db_items, total = controllers.get_claims(db, skip=skip, limit=size or 100000, search=search, status=status, year=year)
    
    # Convert SQLAlchemy models to Pydantic schemas
    items = [schemas.CustomerClaimResponse.model_validate(item) for item in db_items]
    
    return {"items": items, "total": total, "page": page, "size": size or total}


@router.post("/claims/export-excel")
def export_claims_excel(
    claims_data: List[Dict[str, Any]],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        import uuid
        import os
        temp_filename = f"export_{uuid.uuid4().hex}.xlsx"
        temp_excel_path = os.path.join(controllers_import.EXCEL_DIR, temp_filename)
        
        # Normalize claims data
        normalized_claims = []
        for idx, c in enumerate(claims_data):
            defect_code = c.get("order_code") or c.get("defect_code") or ""
            claim_code = c.get("claim_code") or ""
            cabinet_no = claim_code
            if cabinet_no.startswith("Cabinet #"):
                cabinet_no = cabinet_no.replace("Cabinet #", "")
                
            normalized_claims.append({
                "stt": idx + 1,
                "cabinet_no": cabinet_no,
                "sku": c.get("product_name") or c.get("sku") or "",
                "claim_description": c.get("claim_description") or c.get("description") or "",
                "defect_code": defect_code,
                "company_error_code": c.get("company_error_code") or "",
                "action": c.get("penalty") or c.get("action") or "",
                "lpn": c.get("lpn") or "",
                "container_no": c.get("cont") or c.get("container_no") or "",
                "period": c.get("date") or c.get("period") or "",
                "image_paths": c.get("image_paths") or []
            })
            
        # Generate Excel
        controllers_import.save_claims_to_excel(normalized_claims, temp_excel_path)
        
        def remove_file(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass
        
        background_tasks.add_task(remove_file, temp_excel_path)
        
        return FileResponse(
            path=temp_excel_path,
            filename="Danh_sach_khieu_nai.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        controllers_import.logger.error(f"Error exporting claims to Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất file Excel: {str(e)}")


# --- IMPORT PDF CLAIMS ENDPOINTS ---
@router.post("/claims/import-pdf", status_code=status.HTTP_201_CREATED)
async def import_claims_from_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận các tệp tin định dạng PDF.")
    try:
        content = await file.read()
        result = controllers_import.process_pdf_import(content, file.filename, db)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@router.post("/claims/import-folder", status_code=status.HTTP_201_CREATED)
async def import_claims_from_folder(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    # Validate that all files are PDF
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"Tệp {file.filename} không đúng định dạng PDF.")
    try:
        result = await controllers_import.process_folder_import(files, db)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@router.post("/claims/import-folder-stream")
async def import_claims_from_folder_stream(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """
    SSE streaming endpoint for folder import.
    Returns Server-Sent Events with real-time progress per file.
    This prevents timeout issues for large batches (12+ PDFs).
    """
    # Validate that all files are PDF
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"Tệp {file.filename} không đúng định dạng PDF.")
    
    return StreamingResponse(
        controllers_import.process_folder_import_streaming(files, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/claims/imports/{batch_id}")
def read_import_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = controllers_import.get_import_batch_by_id(batch_id, db)
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô import này")
    return batch

@router.get("/claims/imports")
def read_import_batches():
    return controllers_import.list_import_batches()

@router.get("/claims/{claim_id}", response_model=schemas.CustomerClaimResponse)
def read_claim(claim_id: int, db: Session = Depends(get_db)):
    db_claim = controllers.get_claim_by_id(db, claim_id)
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    return db_claim

@router.post("/claims", response_model=schemas.CustomerClaimResponse, status_code=status.HTTP_201_CREATED)
def create_new_claim(claim: schemas.CustomerClaimCreate, db: Session = Depends(get_db)):
    if not claim.company_error_code:
        claim.company_error_code = resolve_company_error_codes(claim.order_code, db)
    db_claim = controllers.create_claim(db, claim)
    return db_claim

@router.put("/claims/{claim_id}", response_model=schemas.CustomerClaimResponse)
def update_existing_claim(claim_id: int, claim: schemas.CustomerClaimUpdate, db: Session = Depends(get_db)):
    db_claim = controllers.update_claim(db, claim_id, claim)
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    return db_claim

@router.delete("/claims/{claim_id}")
def delete_existing_claim(claim_id: int, db: Session = Depends(get_db)):
    success = controllers.delete_claim(db, claim_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    return {"message": "Xóa khiếu nại thành công"}

@router.patch("/claims/{claim_id}/status")
def patch_claim_status(claim_id: int, body: Dict[str, Any], db: Session = Depends(get_db)):
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Thiếu trường 'status'")
    
    # Map Vietnamese status to backend status for DB
    status_map = {
        "Mới": "Received",
        "Đang xử lý": "Processing",
        "Đã xử lý": "Resolved",
        "Chấp nhận": "Resolved"
    }
    backend_status = status_map.get(new_status, new_status)
    
    db_claim = controllers.update_claim(db, claim_id, schemas.CustomerClaimUpdate(status=backend_status))
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    
    return {"message": "Cập nhật trạng thái thành công", "status": new_status}

# --- CABINET PRICES ENDPOINTS ---
@router.get("/cabinet-prices", response_model=Dict[str, Any])
def read_cabinet_prices(
    page: int = 1,
    size: int = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    # Check if there are temporary cabinet prices loaded from excel
    temp_prices = controllers_import.load_temp_cabinet_prices()
    if temp_prices is not None:
        filtered = temp_prices
        if search:
            search_lower = search.lower()
            filtered = [
                item for item in temp_prices
                if search_lower in str(item.get("cabinet_code") or "").lower()
                or search_lower in str(item.get("cabinet_name") or "").lower()
                or search_lower in str(item.get("material") or "").lower()
            ]
        total = len(filtered)
        if size is not None and size > 0:
            skip = (page - 1) * size
            items = filtered[skip : skip + size]
        else:
            items = filtered
        return {"items": items, "total": total, "page": page, "size": size or total}

    if size is not None and size > 0:
        skip = (page - 1) * size
        limit = size
    else:
        skip = 0
        limit = None

    items, total = controllers.get_cabinet_prices(db, skip=skip, limit=limit, search=search)
    return {"items": items, "total": total, "page": page, "size": size or total}

@router.post("/cabinet-prices/temp")
def save_temporary_cabinet_prices(prices: List[Dict[str, Any]]):
    return controllers_import.save_temp_cabinet_prices(prices)

@router.get("/cabinet-prices/{price_id}", response_model=schemas.CabinetPriceResponse)
def read_cabinet_price(price_id: int, db: Session = Depends(get_db)):
    db_price = controllers.get_cabinet_price_by_id(db, price_id)
    if not db_price:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
    return db_price

@router.post("/cabinet-prices", response_model=schemas.CabinetPriceResponse, status_code=status.HTTP_201_CREATED)
def create_new_cabinet_price(price: schemas.CabinetPriceCreate, db: Session = Depends(get_db)):
    return controllers.create_cabinet_price(db, price)

@router.put("/cabinet-prices/{price_id}", response_model=schemas.CabinetPriceResponse)
def update_existing_cabinet_price(price_id: int, price: schemas.CabinetPriceUpdate, db: Session = Depends(get_db)):
    db_price = controllers.update_cabinet_price(db, price_id, price)
    if not db_price:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
    return db_price

@router.delete("/cabinet-prices/{price_id}")
def delete_existing_cabinet_price(price_id: str, db: Session = Depends(get_db)):
    db_success = False
    try:
        price_id_int = int(price_id)
        db_success = controllers.delete_cabinet_price(db, price_id_int)
    except ValueError:
        pass
        
    temp_success = False
    try:
        temp_prices = controllers_import.load_temp_cabinet_prices()
        if temp_prices is not None:
            new_prices = [p for p in temp_prices if str(p.get("id")) != str(price_id)]
            if len(new_prices) < len(temp_prices):
                controllers_import.save_temp_cabinet_prices(new_prices)
                temp_success = True
    except Exception as err:
        controllers_import.logger.warning(f"Failed to delete cabinet price from temp JSON: {err}")
        
    if not db_success and not temp_success:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giá tủ này")
        
    return {"message": "Xóa thông tin giá tủ thành công"}

# Defect catalog endpoints removed - using inspection module's ClientDefect instead

# --- CONTAINER SHIPMENT ENDPOINTS ---
@router.get("/shipments", response_model=Dict[str, Any])
def read_shipments(
    page: int = 1,
    size: int = 50,
    search: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    skip = (page - 1) * size
    items, total = controllers.get_shipments(db, skip=skip, limit=size, search=search, status=status)
    return {"items": items, "total": total, "page": page, "size": size}

@router.get("/shipments/{shipment_id}", response_model=schemas.ContainerShipmentResponse)
def read_shipment(shipment_id: int, db: Session = Depends(get_db)):
    db_shipment = controllers.get_shipment_by_id(db, shipment_id)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch trình xuất container này")
    return db_shipment

@router.post("/shipments", response_model=schemas.ContainerShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_new_shipment(shipment: schemas.ContainerShipmentCreate, db: Session = Depends(get_db)):
    return controllers.create_shipment(db, shipment)

@router.put("/shipments/{shipment_id}", response_model=schemas.ContainerShipmentResponse)
def update_existing_shipment(shipment_id: int, shipment: schemas.ContainerShipmentUpdate, db: Session = Depends(get_db)):
    db_shipment = controllers.update_shipment(db, shipment_id, shipment)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch trình xuất container này")
    return db_shipment

@router.delete("/shipments/{shipment_id}")
def delete_existing_shipment(shipment_id: int, db: Session = Depends(get_db)):
    success = controllers.delete_shipment(db, shipment_id)
    if not success:
      raise HTTPException(status_code=404, detail="Không tìm thấy lịch trình xuất container này")
    return {"message": "Xóa lịch trình xuất container thành công"}


import os

@router.get("/claim_imports/{sub_path:path}")
def serve_claim_imports(sub_path: str):
    file_path = os.path.join(controllers_import.CLAIM_IMPORTS_DIR, sub_path)
    abs_file_path = os.path.abspath(file_path)
    abs_imports_dir = os.path.abspath(controllers_import.CLAIM_IMPORTS_DIR)
    
    # Security check to prevent directory traversal
    if not abs_file_path.startswith(abs_imports_dir):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(abs_file_path) or not os.path.isfile(abs_file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(abs_file_path)

@router.get("/test-gemini")
def test_gemini_endpoint(db: Session = Depends(get_db)):
    import os
    try:
        from modules.chatbot.services.ai_chatbot_service import ai_chatbot_service
        available = ai_chatbot_service.is_available()
        api_key_env = os.getenv("GEMINI_API_KEY")
        res = ai_chatbot_service.chat_with_ai("Có bao nhiêu khiếu nại?", db)
        return {
            "is_available": available,
            "api_key_present": api_key_env is not None,
            "api_key_preview": api_key_env[:10] + "..." if api_key_env else "None",
            "result": res
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

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
        controllers_import.logger.error(f"JWT Verification failed: {str(e)}")
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


@router.post("/chat")
def chat_claim_assistant(
    body: Dict[str, Any], 
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    message = body.get("message")
    context = body.get("context") or {}
    history = body.get("history") or []
    session_id = body.get("session_id") or "default"
    if not message:
        raise HTTPException(status_code=400, detail="Thiếu nội dung câu hỏi (message)")
    try:
        from modules.chatbot.controllers.chatbot_controller import handle_claim_chat
        return handle_claim_chat(message, context, db, history, current_user=current_user, session_id=session_id)
    except Exception as e:
        controllers_import.logger.exception("Error in claim chatbot assistant:")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router.get("/chat/history")
def get_chat_history(
    session_id: str = "default",
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        import json
        
        histories = db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).order_by(ChatbotHistory.created_at.asc()).all()
        
        result = []
        for h in histories:
            items = []
            if h.items_json:
                try:
                    items = json.loads(h.items_json)
                except Exception:
                    pass
            
            suggestions = []
            if h.suggestions_json:
                try:
                    suggestions = json.loads(h.suggestions_json)
                except Exception:
                    pass
            
            result.append({
                "role": h.role,
                "content": h.content,
                "items": items,
                "suggestions": suggestions,
                "created_at": h.created_at.isoformat() if h.created_at else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải lịch sử chat: {str(e)}")


@router.delete("/chat/history")
def delete_chat_history(
    session_id: str = "default",
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).delete()
        db.commit()
        return {"message": "Đã xóa lịch sử chat thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa lịch sử chat: {str(e)}")


@router.get("/chat/sessions")
def get_chat_sessions(
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        from sqlalchemy import func
        
        # Subquery to find the latest created_at per session_id
        subq = db.query(
            ChatbotHistory.session_id,
            func.max(ChatbotHistory.created_at).label("max_created_at")
        ).filter(
            ChatbotHistory.account_id == current_user.id
        ).group_by(
            ChatbotHistory.session_id
        ).subquery()

        # Query to join and get session details
        sessions = db.query(
            ChatbotHistory.session_id,
            ChatbotHistory.session_title,
            ChatbotHistory.created_at
        ).join(
            subq,
            (ChatbotHistory.session_id == subq.c.session_id) & 
            (ChatbotHistory.created_at == subq.c.max_created_at)
        ).filter(
            ChatbotHistory.account_id == current_user.id
        ).order_by(
            ChatbotHistory.created_at.desc()
        ).all()

        # Deduplicate results just in case of identical timestamps
        seen = set()
        result = []
        for s in sessions:
            sid = s.session_id or "default"
            if sid in seen:
                continue
            seen.add(sid)
            result.append({
                "session_id": sid,
                "session_title": s.session_title or "Cuộc trò chuyện mới",
                "updated_at": s.created_at.isoformat() if s.created_at else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải danh sách phiên chat: {str(e)}")


@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).delete()
        db.commit()
        return {"message": "Đã xóa phiên chat thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa phiên chat: {str(e)}")
