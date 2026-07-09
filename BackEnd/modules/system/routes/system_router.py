from fastapi import APIRouter, Depends
from pydantic import BaseModel
import os
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from config.database import get_db


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


@router.get("/monitor")
async def get_system_status(db: Session = Depends(get_db)):
    """Lấy thông tin tài nguyên hệ thống (CPU, RAM, Disk, SQL Server)"""
    import os
    
    # 1. Đo lường cơ sở dữ liệu (SQL Server)
    db_stats = {}
    try:
        from sqlalchemy import text
        # Lấy số kết nối đang hoạt động
        active_sessions = db.execute(text("SELECT COUNT(*) FROM sys.dm_exec_sessions")).scalar()
        active_connections = db.execute(text("SELECT COUNT(*) FROM sys.dm_exec_connections")).scalar()
        max_connections = db.execute(text("SELECT @@MAX_CONNECTIONS")).scalar()
        active_locks = db.execute(text("SELECT COUNT(*) FROM sys.dm_tran_locks")).scalar()
        sql_version = db.execute(text("SELECT @@VERSION")).scalar()
        
        # Lấy kích thước database
        db_size_query = """
            SELECT SUM(size * 8 / 1024) AS DatabaseSizeMB
            FROM sys.master_files
            WHERE database_id = DB_ID()
        """
        db_size = db.execute(text(db_size_query)).scalar()
        
        db_stats = {
            "status": "Healthy",
            "active_sessions": active_sessions,
            "active_connections": active_connections,
            "max_connections": max_connections,
            "active_locks": active_locks,
            "database_size_mb": round(db_size, 2) if db_size else 0,
            "version": sql_version.split("\n")[0] if sql_version else "Unknown"
        }
    except Exception as e:
        db_stats = {
            "status": "Unhealthy",
            "error": str(e)
        }

    # 2. Đo lường CPU, RAM, Disk bằng psutil
    try:
        import psutil
    except ImportError:
        try:
            import subprocess
            import sys
            subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
            import psutil
        except Exception:
            psutil = None

    system_stats = {}
    if psutil:
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=None)
            cpu_count = psutil.cpu_count()
            
            # RAM
            virtual_mem = psutil.virtual_memory()
            ram_stats = {
                "total": virtual_mem.total,
                "available": virtual_mem.available,
                "used": virtual_mem.used,
                "percent": virtual_mem.percent
            }
            
            # Process Memory & CPU
            process = psutil.Process(os.getpid())
            proc_mem = process.memory_info().rss
            proc_cpu = process.cpu_percent(interval=None)
            
            # Disk
            disk = psutil.disk_usage('/')
            disk_stats = {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            }
            
            system_stats = {
                "status": "Available",
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count,
                    "process_percent": proc_cpu
                },
                "ram": ram_stats,
                "process_ram": proc_mem,
                "disk": disk_stats,
                "uptime_seconds": int(psutil.boot_time())
            }
        except Exception as e:
            system_stats = {
                "status": "Error",
                "error": f"Lỗi lấy thông tin hệ thống: {str(e)}"
            }
    else:
        system_stats = {
            "status": "Unavailable",
            "error": "Không thể tự động cài đặt thư viện psutil"
        }

    # 3. Đo lường số lượng thiết bị truy cập hoạt động
    active_devices = {"web": 0, "mobile": 0, "total": 0}
    try:
        from shared.utils.device_tracker import device_tracker
        active_devices = device_tracker.get_active_counts()
    except Exception as e:
        pass

    return {
        "database": db_stats,
        "system": system_stats,
        "active_devices": active_devices
    }


