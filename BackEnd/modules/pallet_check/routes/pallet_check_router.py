# -*- coding: utf-8 -*-
"""
Pallet Check Router for Mobi Backend.
Cung cấp API cho chức năng Kiểm tra Pallet (MB30) & Quản lý Container:
- GET /api/v1/pallet-check/models: Lấy danh sách mô hình AI OCR từ ai_ocr_train
- POST /api/v1/pallet-check/scan: Phân tích ảnh chụp pallet, trả về bảng LPN - SKU và các bước chi tiết
- POST /api/v1/pallet-check/containers: Lưu / Hoàn thành hồ sơ Container & Pallets vào CSDL SQL Server
- PUT /api/v1/pallet-check/containers/{id}: Chỉnh sửa hồ sơ Container & Pallets (Admin)
- GET /api/v1/pallet-check/containers: Lấy lịch sử danh sách Container từ CSDL
- GET /api/v1/pallet-check/containers/{id}: Lấy chi tiết Container kèm danh sách Pallet
- DELETE /api/v1/pallet-check/containers/{id}: Xóa Container
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import settings
from jose import jwt
from modules.auth.models.accounts import Account as AccountModel

from ..services.pallet_ocr_service import PalletOcrService
from ..schemas.pallet_check_schema import ContainerCreatePayload, ContainerUpdatePayload
from ..controllers.pallet_check_controller import PalletCheckController

router = APIRouter()

class ScanImagePayload(BaseModel):
    image_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    model_id: Optional[str] = None
    inference_mode: Optional[str] = "hybrid"

@router.get("/models")
def get_models():
    """Lấy danh sách các mô hình checkpoint thực tế áp dụng cho Mobile."""
    return PalletOcrService.get_available_models()

@router.post("/scan")
def scan_pallet(payload: ScanImagePayload):
    """Quét 1 đến 4 ảnh pallet qua chuỗi Base64 và phân tích LPN/SKU."""
    inputs = []
    if payload.images_base64 and len(payload.images_base64) > 0:
        inputs = [img for img in payload.images_base64 if img]
    elif payload.image_base64:
        inputs = [payload.image_base64]

    if not inputs:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp ít nhất 1 ảnh Base64 để quét.")
    
    result = PalletOcrService.scan_pallet_images(
        images_input=inputs[:4],
        model_id=payload.model_id,
        inference_mode=payload.inference_mode or "hybrid"
    )
    return result

def _decode_and_scan_bytes(content: bytes, model_id: Optional[str]) -> Dict[str, Any]:
    import cv2
    import numpy as np
    nparr = np.frombuffer(content, np.uint8)
    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_cv is None:
        raise ValueError("File ảnh không hợp lệ.")
    return PalletOcrService.scan_pallet_image(
        image_input=img_cv,
        model_id=model_id
    )

@router.post("/scan-file")
async def scan_pallet_file(
    file: UploadFile = File(...),
    model_id: Optional[str] = Form(None)
):
    """Quét ảnh pallet tải lên trực tiếp dưới dạng Multipart File (Chạy trên threadpool không chặn event loop)."""
    try:
        content = await file.read()
        result = await run_in_threadpool(_decode_and_scan_bytes, content, model_id)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý file ảnh: {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# API LƯU TRỮ VÀ ĐỒNG BỘ CSDL CHO CONTAINER & PALLET (SQL SERVER)
# ═════════════════════════════════════════════════════════════════════════════

def _resolve_inspector_from_request(request: Request, db: Session) -> Optional[str]:
    """Trích xuất họ tên hoặc username của tài khoản đang đăng nhập từ JWT Bearer Token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if username:
            user = db.query(AccountModel).filter(AccountModel.username == username).first()
            if user:
                return (user.full_name or user.username or "").strip() or None
    except Exception:
        pass
    return None


@router.post("/containers")
def save_container(
    payload: ContainerCreatePayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Lưu toàn bộ hồ sơ Container kiểm tra kèm các Pallet vào CSDL SQL Server.
    """
    try:
        auth_inspector = _resolve_inspector_from_request(request, db)
        if auth_inspector and (not payload.inspector or payload.inspector.strip() in ("", "Nguyễn A", "Chưa rõ", "Chưa xác định")):
            payload.inspector = auth_inspector

        saved = PalletCheckController.save_container(payload, db)
        return {
            "success": True,
            "message": f"Container [{payload.name}] đã được lưu vào Database thành công!",
            "data": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu Container vào Database: {str(e)}")


@router.put("/containers/{container_id}")
def update_container(
    container_id: str,
    payload: ContainerUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin Container và Pallet trong Database SQL Server (Admin/Quản lý).
    """
    try:
        updated = PalletCheckController.update_container(container_id, payload, db)
        if not updated:
            raise HTTPException(status_code=404, detail="Không tìm thấy Container trong Database để cập nhật.")
        return {
            "success": True,
            "message": f"Container [{container_id}] đã được cập nhật thành công!",
            "data": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật Container: {str(e)}")


@router.get("/stats")
def get_container_stats(
    db: Session = Depends(get_db)
):
    """
    Lấy số liệu thống kê tổng quan (4 thẻ KPI) cho màn hình Quét Cont Web.
    """
    try:
        stats = PalletCheckController.get_stats(db)
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải thống kê Container: {str(e)}")


@router.get("/containers")
def list_containers(
    limit: Optional[int] = Query(None, ge=1, le=500),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các Container đã kiểm tra từ Database SQL Server (hỗ trợ phân trang qua page và page_size, tìm kiếm và lọc).
    """
    try:
        import math
        actual_limit = limit or 100
        containers, total_count = PalletCheckController.get_containers(
            db, 
            limit=actual_limit,
            page=page,
            page_size=page_size,
            search=search,
            status=status
        )
        response_data = {
            "success": True,
            "total": total_count,
            "data": containers
        }
        if page is not None and page_size is not None:
            response_data["page"] = page
            response_data["page_size"] = page_size
            response_data["total_pages"] = math.ceil(total_count / page_size) if page_size > 0 else 1
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải danh sách Container từ Database: {str(e)}")


@router.get("/containers/{container_id}")
def get_container_detail(
    container_id: str,
    db: Session = Depends(get_db)
):
    """
    Lấy chi tiết một Container kèm danh sách toàn bộ Pallet từ Database.
    """
    cont = PalletCheckController.get_container(container_id, db)
    if not cont:
        raise HTTPException(status_code=404, detail="Không tìm thấy Container trong Database.")
    return {
        "success": True,
        "data": cont
    }


@router.delete("/containers/{container_id}")
def delete_container(
    container_id: str,
    db: Session = Depends(get_db)
):
    """
    Xóa một Container và các Pallet liên quan khỏi Database.
    """
    success = PalletCheckController.delete_container(container_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy Container để xóa.")
    return {
        "success": True,
        "message": f"Đã xóa Container [{container_id}] khỏi Database."
    }
