# -*- coding: utf-8 -*-
"""
Pallet Check Router for Mobi Backend.
Cung cấp API cho chức năng Kiểm tra Pallet (MB30) & Quản lý Container:
- GET /api/v1/pallet-check/models: Lấy danh sách mô hình AI OCR từ ai_ocr_train
- POST /api/v1/pallet-check/scan: Phân tích ảnh chụp pallet, trả về bảng LPN - SKU và các bước chi tiết
- POST /api/v1/pallet-check/containers: Lưu / Hoàn thành hồ sơ Container & Pallets vào CSDL SQL Server
- GET /api/v1/pallet-check/containers: Lấy lịch sử danh sách Container từ CSDL
- GET /api/v1/pallet-check/containers/{id}: Lấy chi tiết Container kèm danh sách Pallet
- DELETE /api/v1/pallet-check/containers/{id}: Xóa Container
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from config.database import get_db

from ..services.pallet_ocr_service import PalletOcrService
from ..schemas.pallet_check_schema import ContainerCreatePayload
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

@router.post("/scan-file")
async def scan_pallet_file(
    file: UploadFile = File(...),
    model_id: Optional[str] = Form(None)
):
    """Quét ảnh pallet tải lên trực tiếp dưới dạng Multipart File."""
    try:
        content = await file.read()
        import cv2
        import numpy as np
        nparr = np.frombuffer(content, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_cv is None:
            raise HTTPException(status_code=400, detail="File ảnh không hợp lệ.")
        
        result = PalletOcrService.scan_pallet_image(
            image_input=img_cv,
            model_id=model_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý file ảnh: {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# API LƯU TRỮ VÀ ĐỒNG BỘ CSDL CHO CONTAINER & PALLET (SQL SERVER)
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/containers")
def save_container(
    payload: ContainerCreatePayload,
    db: Session = Depends(get_db)
):
    """
    Lưu toàn bộ hồ sơ Container kiểm tra kèm các Pallet vào CSDL SQL Server.
    """
    try:
        saved = PalletCheckController.save_container(payload, db)
        return {
            "success": True,
            "message": f"Container [{payload.name}] đã được lưu vào Database thành công!",
            "data": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu Container vào Database: {str(e)}")


@router.get("/containers")
def list_containers(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các Container đã kiểm tra từ Database SQL Server.
    """
    try:
        containers = PalletCheckController.get_containers(db, limit=limit)
        return {
            "success": True,
            "total": len(containers),
            "data": containers
        }
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
