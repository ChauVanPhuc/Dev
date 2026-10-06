# -*- coding: utf-8 -*-
"""
Pallet Check Router for Mobi Backend.
Cung cấp API cho chức năng Kiểm tra Pallet (MB30):
- GET /api/v1/pallet-check/models: Lấy danh sách mô hình AI OCR từ ai_ocr_train
- POST /api/v1/pallet-check/scan: Phân tích ảnh chụp pallet, trả về bảng LPN - SKU và các bước chi tiết
"""

from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from ..services.pallet_ocr_service import PalletOcrService

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
