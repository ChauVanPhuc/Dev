import os
import uuid
import base64
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from config.database import get_db

from modules.iso_signature.schemas.iso_signature_schema import (
    ISOSignatureCreate,
    ISOSignatureUpdate,
    ISOSignatureStatsResponse
)
from modules.iso_signature.services.iso_signature_service import ISOSignatureService, SIGNATURE_UPLOAD_DIR

router = APIRouter()

@router.get("/stats", response_model=ISOSignatureStatsResponse)
def get_signature_stats(db: Session = Depends(get_db)):
    """Lấy số liệu thống kê chữ ký (Tổng số, Ảnh tay, Vẽ tay, Điện tử, Hoạt động, Tạm khóa)"""
    try:
        return ISOSignatureService.get_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn thống kê chữ ký: {str(e)}")

@router.get("/list")
def get_signatures_list(
    keyword: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tên, chức vụ, mã nhân viên"),
    signature_type: Optional[str] = Query("all", description="Loại chữ ký: all, HANDWRITTEN_IMAGE, HANDWRITTEN_DRAW, DIGITAL"),
    department: Optional[str] = Query("all", description="Phòng ban: all, CL, SX, KT, BGD..."),
    approval_level: Optional[str] = Query("all", description="Cấp duyệt áp dụng: all, Cấp phòng, Cấp công ty, Cả hai"),
    is_active: Optional[str] = Query("all", description="Trạng thái: all, active, inactive"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách chữ ký ISO theo các tiêu chí bộ lọc"""
    try:
        return ISOSignatureService.get_signatures_list(
            db=db,
            keyword=keyword,
            signature_type=signature_type,
            department=department,
            approval_level=approval_level,
            is_active=is_active
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách chữ ký: {str(e)}")

@router.get("/{signature_id}")
def get_signature_detail(signature_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một chữ ký"""
    try:
        item = ISOSignatureService.get_by_id(db, signature_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy chữ ký ID #{signature_id}")
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn chi tiết chữ ký: {str(e)}")

@router.post("/create")
def create_signature(payload: ISOSignatureCreate, db: Session = Depends(get_db)):
    """Khởi tạo mới chữ ký (ảnh tay, vẽ tay, hoặc điện tử)"""
    try:
        return ISOSignatureService.create_signature(db, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tạo chữ ký: {str(e)}")

@router.put("/{signature_id}")
def update_signature(signature_id: int, payload: ISOSignatureUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin chữ ký"""
    try:
        return ISOSignatureService.update_signature(db, signature_id, payload)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật chữ ký: {str(e)}")

@router.patch("/{signature_id}/toggle-status")
def toggle_signature_status(signature_id: int, db: Session = Depends(get_db)):
    """Chuyển đổi trạng thái kích hoạt / tạm khóa chữ ký"""
    try:
        return ISOSignatureService.toggle_status(db, signature_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi chuyển trạng thái: {str(e)}")

@router.delete("/{signature_id}")
def delete_signature(signature_id: int, db: Session = Depends(get_db)):
    """Xóa bỏ chữ ký khỏi hệ thống"""
    try:
        return ISOSignatureService.delete_signature(db, signature_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa chữ ký: {str(e)}")

@router.post("/upload-image")
async def upload_signature_image(file: UploadFile = File(...)):
    """Tải lên tệp tin hình ảnh chữ ký tay (PNG, JPG, SVG)"""
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".svg", ".webp"]:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp ảnh định dạng PNG, JPG, JPEG, SVG hoặc WEBP")

        filename = f"sig_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(SIGNATURE_UPLOAD_DIR, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        # Tạo chuỗi base64 data url để phòng trường hợp static path
        mime = "image/png" if ext == ".png" else "image/svg+xml" if ext == ".svg" else "image/jpeg"
        b64_data = f"data:{mime};base64,{base64.b64encode(contents).decode('utf-8')}"

        rel_path = f"/uploads/signatures/{filename}"
        return {
            "success": True,
            "filename": filename,
            "image_path": rel_path,
            "signature_data": b64_data,
            "message": "Đã tải lên tệp ảnh chữ ký thành công!"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý tải tệp ảnh chữ ký: {str(e)}")
