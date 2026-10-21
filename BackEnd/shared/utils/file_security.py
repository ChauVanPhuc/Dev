# -*- coding: utf-8 -*-
"""
Tiện ích kiểm tra an toàn cho tệp tải lên (File Upload Security Validator)
Ngăn chặn các lỗ hổng Upload mã độc, Shell script, XSS payload và DoS dung lượng.
"""

import os
from fastapi import UploadFile, HTTPException

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_EXCEL_EXTENSIONS = {".xlsx", ".xls"}
ALLOWED_DOCUMENT_EXTENSIONS = {".xlsx", ".xls", ".pdf", ".docx", ".doc"}

MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024       # 20 MB (rất thoải mái cho ảnh chụp xưởng độ phân giải cao)
MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024    # 50 MB (thoải mái cho file Excel BOM lớn)


def validate_image_upload(file: UploadFile) -> str:
    """
    Xác thực an toàn file ảnh tải lên.
    Trả về phần mở rộng chuẩn dạng chữ thường (VD: '.jpg', '.png').
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Không có tệp nào được gửi lên.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp '{ext}' không hợp lệ. Hệ thống chỉ cho phép tải lên hình ảnh (.jpg, .jpeg, .png, .webp)."
        )
    return ext


def validate_excel_upload(file: UploadFile) -> str:
    """
    Xác thực an toàn file Excel tải lên.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Không có tệp nào được gửi lên.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXCEL_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp '{ext}' không hợp lệ. Vui lòng tải lên đúng file Excel (.xlsx, .xls)."
        )
    return ext
