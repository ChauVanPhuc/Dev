from fastapi import APIRouter
from pydantic import BaseModel
import os
from fastapi.responses import FileResponse

router = APIRouter()

class AppVersionResponse(BaseModel):
    version: str
    download_url: str
    release_notes: str
    force_update: bool

@router.get("/app-version", response_model=AppVersionResponse)
async def get_app_version():
    """Lấy thông tin phiên bản mới nhất của ứng dụng di động"""
    latest_version = "1.5.4"
    return {
        "version": latest_version, 
        "download_url": "/api/v1/system/download-apk",
        "release_notes": "Ban cap nhat 1.5.4",
        "force_update": False
    }

@router.get("/download-apk")
async def download_apk():
    """Endpoint tải xuống file APK phiên bản mới nhất"""
    # Đường dẫn thư mục chứa APK (Sử dụng đường dẫn tương đối để linh hoạt)
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "apps"))
    file_name = "SmartFlow_v1.5.4.apk" 
    full_path = os.path.join(base_path, file_name)
    
    if not os.path.exists(full_path):
        return {"error": "File APK không tồn tại trên Server. Vui lòng liên hệ Admin."}

    headers = {
        "Content-Disposition": 'attachment; filename="SmartFlow_v1.5.4.apk"',
        "Content-Encoding": "identity"
    }
    
    return FileResponse(
        path=full_path,
        filename="SmartFlow_v1.5.4.apk",
        media_type="application/vnd.android.package-archive",
        headers=headers
    )
