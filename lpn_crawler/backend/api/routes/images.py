# -*- coding: utf-8 -*-
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import LpnImage

router = APIRouter()


def resolve_image_file_path(raw_path: str) -> Optional[str]:
    """
    Tìm và chuẩn hóa đường dẫn tuyệt đối của file ảnh trên ổ đĩa từ relative path
    """
    if not raw_path:
        return None
    clean_p = raw_path.replace("\\", "/").strip().lstrip("/")
    
    candidates = [
        os.path.abspath(os.path.join(settings.PROJECT_ROOT, clean_p)),
        os.path.abspath(os.path.join(settings.MODULE_ROOT, clean_p)),
        os.path.abspath(os.path.join(settings.STORAGE_IMAGES_DIR, clean_p)),
    ]
    
    if "storage/images/" in clean_p:
        sub = clean_p.split("storage/images/", 1)[1]
        candidates.append(os.path.abspath(os.path.join(settings.STORAGE_IMAGES_DIR, sub)))
    if "images/" in clean_p:
        sub = clean_p.split("images/", 1)[1]
        candidates.append(os.path.abspath(os.path.join(settings.STORAGE_IMAGES_DIR, sub)))
        
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


from fastapi.responses import FileResponse, RedirectResponse

@router.get("/images/{image_id}/file")
def serve_lpn_image_by_id(image_id: int, db: Session = Depends(get_db)):
    """
    Phục vụ hình ảnh trực tiếp từ CSDL và ổ đĩa theo LpnImage ID.
    Nếu chưa tải về máy cục bộ nhưng có source_url, tự động chuyển hướng (Redirect) tới source_url.
    """
    img = db.query(LpnImage).filter(LpnImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image record not found")
    
    if img.local_path and img.local_path != 'None':
        abs_path = resolve_image_file_path(img.local_path)
        if abs_path:
            ext = os.path.splitext(abs_path)[1].lower()
            mime_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".gif": "image/gif"
            }
            mime = img.file_mime or mime_map.get(ext, "image/jpeg")
            return FileResponse(abs_path, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})
    
    if img.source_url and img.source_url.startswith("http"):
        return RedirectResponse(url=img.source_url, status_code=307)

    raise HTTPException(status_code=404, detail="Image file not found on disk or online")


@router.get("/images/view")
def serve_lpn_image_by_path(path: str = Query(...)):
    """
    Phục vụ hình ảnh trực tiếp theo đường dẫn relative path
    """
    abs_path = resolve_image_file_path(path)
    if not abs_path:
        raise HTTPException(status_code=404, detail=f"Image file not found: {path}")
    
    ext = os.path.splitext(abs_path)[1].lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif"
    }
    mime = mime_map.get(ext, "image/jpeg")
    return FileResponse(abs_path, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})
