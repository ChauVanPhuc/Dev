# Reload triggered: Change active device tracking window to 25 minutes

import logging

# Configure global logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Set specific log levels for external libraries to reduce noise
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)
logging.getLogger("groq._base_client").setLevel(logging.WARNING)

from fastapi import FastAPI, HTTPException, Request

import mimetypes

import os

from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

from contextlib import asynccontextmanager

import colorama

from sqlalchemy import text



# Cấu hình MIME type để Android không tự đổi đuôi .apk thành .zip

mimetypes.add_type('application/vnd.android.package-archive', '.apk')



from shared.utils.banner import print_banner

from app.routes import api_router

from config.database import engine, SessionLocal

from config.database import Base

from app import models  # Đảm bảo tất cả Model được import để tránh lỗi Mapper
from modules.kpi.models.kpi_management import KPIChecklist, KPIEmployeeItem, KPIViolation, KPIFeedback, KPIPointRule, KPIChecklistPool, KPIItemPool
from modules.quick_report.models.quick_report import QuickReport
from modules.system.models.data_package import DataPackage



# Initialize colorama for Windows ANSI support

colorama.init(autoreset=True)



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tăng giới hạn thread pool của AnyIO để tránh nghẽn hàng đợi (queue bottleneck) khi có 500+ users
    import anyio
    try:
        limiter = anyio.to_thread.current_default_thread_limiter()
        limiter.total_tokens = 800
        print(f"Set AnyIO thread pool limit (tokens) to: {limiter.total_tokens}")
    except Exception as thread_err:
        print(f"Error setting AnyIO thread pool: {thread_err}")

    import sys

    import os

    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    if backend_path not in sys.path:

        sys.path.insert(0, backend_path)

    
    # Print the beautiful startup banner

    print_banner()

    db = SessionLocal()



    yield



Base.metadata.create_all(bind=engine)

# [MIGRATION] Add workshop column to machines table
from sqlalchemy import text
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE machines ADD workshop NVARCHAR(255) NULL"))
except Exception as migration_err:
    # Ignore if column already exists
    pass

# [MIGRATION] Add created_at column to roles table (fix SQL error 42S22)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE roles ADD created_at DATETIME NULL"))
except Exception:
    # Ignore if column already exists
    pass

# [MIGRATION] Add category_id (FK -> master_categories) to production_routings table
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE production_routings ADD category_id INT NULL"))
except Exception:
    # Ignore if column already exists
    pass
try:
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE production_routings ADD CONSTRAINT FK_production_routings_category "
            "FOREIGN KEY (category_id) REFERENCES master_categories(id)"
        ))
except Exception:
    # Ignore if constraint already exists
    pass

# [MIGRATION] Seed master_categories and link master_products + production_routings by SKU prefix
try:
    with engine.begin() as conn:
        # 1. Seed known categories if not exists
        known_categories = [
            ('APT', 'Dòng hàng APT'),
            ('ATL', 'Dòng hàng ATL'),
            ('FOL', 'Dòng hàng FOL'),
            ('ADV', 'Dòng hàng ADV'),
            ('TPH', 'Dòng hàng TPH'),
            ('HOR', 'Dòng hàng HOR'),
            ('EYC', 'Dòng hàng EYC'),
            ('COV', 'Dòng hàng COV'),
            ('TIN', 'Dòng hàng TIN'),
            ('BEZ', 'Dòng hàng BEZ'),
            ('MBC', 'Dòng hàng MBC'),
            ('TU', 'Dòng hàng TU'),
            ('BAN', 'Dòng hàng BAN'),
            ('GIUONG', 'Dòng hàng GIUONG'),
        ]
        for prefix, cat_name in known_categories:
            conn.execute(text(
                "IF NOT EXISTS (SELECT 1 FROM master_categories WHERE name = :name) "
                "INSERT INTO master_categories (name, description, status, created_at) VALUES (:name, :desc, 1, GETDATE())"
            ), {"name": cat_name, "desc": f"Dòng hàng {prefix}"})

        # 2. Link master_products to categories by SKU prefix (first 3-6 chars)
        #    Try longer prefixes first (GIUONG, BAN) then shorter (APT, ATL, etc.)
        for prefix, cat_name in known_categories:
            conn.execute(text(
                "UPDATE mp SET mp.category_id = mc.id "
                "FROM master_products mp "
                "CROSS JOIN master_categories mc "
                "WHERE mc.name = :cat_name "
                "AND (mp.category_id IS NULL) "
                "AND UPPER(mp.sku) LIKE :prefix_pattern"
            ), {"cat_name": cat_name, "prefix_pattern": f"{prefix}%"})

        # 3. Link production_routings to categories by matching category text
        for prefix, cat_name in known_categories:
            conn.execute(text(
                "UPDATE pr SET pr.category_id = mc.id "
                "FROM production_routings pr "
                "CROSS JOIN master_categories mc "
                "WHERE mc.name = :cat_name "
                "AND (pr.category_id IS NULL) "
                "AND (pr.category LIKE :pattern OR pr.routing_code LIKE :code_pattern)"
            ), {"cat_name": cat_name, "pattern": f"%{prefix}%", "code_pattern": f"%{prefix}%"})
except Exception as seed_err:
    print(f"[MIGRATION] Seed master_categories warning: {seed_err}")

# [MIGRATION] Enforce 1 SKU -> 1 routing: dedupe rows then add unique index on product_sku
try:
    with engine.begin() as conn:
        conn.execute(text("""
            ;WITH dedupe_cte AS (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY product_sku ORDER BY id DESC) AS rn
                FROM production_routing_products
            )
            DELETE FROM production_routing_products WHERE id IN (SELECT id FROM dedupe_cte WHERE rn > 1)
        """))
except Exception:
    pass
try:
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE UNIQUE INDEX UQ_production_routing_products_sku ON production_routing_products (product_sku)"
        ))
except Exception:
    # Ignore if index already exists
    pass



from fastapi import WebSocket, WebSocketDisconnect

from shared.services.websocket_service import socket_manager



app = FastAPI(

    title="ERP_G7 Backend API",

    description="Backend API for ERP_G7_v2 using FastAPI and SQL Server",

    version="1.0.0",

    lifespan=lifespan

)



# [HEALTH CHECK] Endpoint đơn giản để Cloudflare Tunnel và monitoring tools kiểm tra server

@app.get("/health")
async def health_check():
    return {"status": "ok"}



@app.websocket("/ws/{user_id}")

async def websocket_endpoint(websocket: WebSocket, user_id: int):

    """Cổng kết nối Realtime cho Mobile App"""

    await socket_manager.connect(user_id, websocket)

    try:

        while True:

            # Client có thể gửi tin nhắn để giữ kết nối (ping/pong)

            await websocket.receive_text()

    except WebSocketDisconnect:

        socket_manager.disconnect(user_id, websocket)



# CORS configuration - Mở rộng tối đa cho App Mobile

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

    allow_methods=["*"],

    allow_headers=["*"],

)



# [DEBUG] Middleware ghi nhật ký mọi yêu cầu gửi đến Server và theo dõi thiết bị hoạt động
@app.middleware("http")
async def log_requests(request: Request, call_next):
    url_str = str(request.url)
    # Không ghi log ra file trong môi trường production để tránh nghẽn I/O đồng bộ
            
    # Ghi nhận hoạt động thiết bị truy cập
    try:
        from shared.utils.device_tracker import device_tracker
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        url_path = request.url.path
        
        # Bỏ qua các tài nguyên tĩnh và kiểm tra sức khỏe
        if not any(url_path.startswith(prefix) for prefix in ["/static", "/favicon", "/health"]):
            device_tracker.record_activity(ip=client_host, user_agent=user_agent)
    except Exception as e:
        pass

    response = await call_next(request)
    return response

# [NEW] Authorization checking middleware for write operations
@app.middleware("http")
async def check_write_permissions(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        path = request.url.path
        
        # Bypass public/auth endpoints, healthcheck, and socket connections
        bypass_prefixes = (
            "/accounts/login",
            "/api/v1/accounts/login",
            "/api/v1/claims/chat",
            "/api/v1/screen-bugs/upload-image",
            "/health",
            "/ws",
        )
        if not any(path.startswith(prefix) for prefix in bypass_prefixes):
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    from jose import jwt
                    from config.settings import settings
                    from config.database import SessionLocal
                    from modules.auth.models.accounts import Account as AccountModel
                    from modules.auth.controllers.account_controller import resolve_user_permissions
                    import json

                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    username = payload.get("sub")
                    
                    if username:
                        db = SessionLocal()
                        try:
                            user = db.query(AccountModel).filter(AccountModel.username == username).first()
                            if user:
                                # Determine the screen key based on path
                                screen_key = None
                                PATH_TO_SCREEN_KEY = [
                                    # --- Mobile-specific routes (must be BEFORE generic /api/v1/inspections) ---
                                    ("/api/v1/inspections/stage", "mobile_inspection-stage"),
                                    ("/api/v1/inspections/upload-ocr", "mobile_inspection-stage"),
                                    ("/api/v1/inspections/defect-types", "mobile_inspection-stage"),
                                    ("/api/v1/inspections/daily", "mobile_inspection-daily"),
                                    ("/api/v1/inspections/by-plan", "mobile_inspection-stage"),
                                    ("/api/v1/inspections/upload", "mobile_inspection-stage"),
                                    # --- Web routes ---
                                    ("/api/v1/deliveries/backup-qrs", "backup-qrs"),
                                    ("/api/v1/claims/cabinet-prices", "prices"),
                                    ("/api/v1/claims/shipments", "shipments"),
                                    ("/api/v1/claims/claims", "claim"),
                                    ("/api/v1/inspections", "reports"),
                                    ("/api/v1/products", "products"),
                                    ("/api/v1/equipments", "equipment"),
                                    ("/api/v1/kpis", "kpi"),
                                    ("/api/v1/awards-discipline", "kpi"),
                                    ("/api/v1/staff-evaluations", "kpi"),
                                    ("/api/v1/accounts", "users"),
                                    ("/accounts", "users"),
                                    ("/api/v1/roles", "users"),
                                    ("/api/v1/permissions", "users"),
                                    ("/api/v1/screens", "screens"),
                                    ("/api/v1/screen-bugs", "bugs"),
                                    ("/api/v1/capas", "feedback"),
                                    ("/api/v1/pallet-cards", "exception-deliveries"),
                                    ("/api/v1/plans", "plan"),
                                    ("/api/v1/production-plans", "plan"),
                                    ("/api/v1/deliveries", "delivery-tracking"),
                                    ("/api/v1/qc", "defects"),
                                    ("/api/v1/system/incidents", "logs"),
                                    ("/api/v1/system/logs", "logs"),
                                    ("/api/v1/system/data-packages", "data"),
                                    ("/api/v1/system/backup", "data"),
                                    ("/api/v1/system/monitor", "monitor"),
                                    ("/api/v1/purchase-requisitions", "purchase-requisitions"),
                                    ("/api/v1/purchase-order-items", "purchase-order-items"),
                                ]
                                for prefix, key in PATH_TO_SCREEN_KEY:
                                    if path.startswith(prefix):
                                        screen_key = key
                                        break
                                
                                # Override base inspections write actions to use mobile_inspection-stage screen permission
                                if path.startswith("/api/v1/inspections"):
                                    if path in ("/api/v1/inspections", "/api/v1/inspections/"):
                                        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                                            screen_key = "mobile_input-inspection"
                                    elif screen_key == "reports":
                                        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                                            screen_key = "mobile_inspection-stage"
                                
                                # Override deliveries actions to use mobile screen permissions
                                if path.startswith("/api/v1/deliveries"):
                                    if path.endswith("/confirm"):
                                        screen_key = "mobile_delivery-receive"
                                    else:
                                        screen_key = "mobile_delivery-create"
                                
                                # Override QC actions to use mobile screen permissions
                                if path.startswith("/api/v1/qc"):
                                    screen_key = "mobile_inspection-stage"
                                
                                if screen_key:
                                    # Phân giải quyền thực tế của User cho screen này
                                    resolved_perms = resolve_user_permissions(user, db)
                                    
                                    keys_to_check = [screen_key]
                                    if screen_key == "mobile_inspection-stage":
                                        keys_to_check.extend([
                                            "mobile_inspection-first-article",
                                            "mobile_inspection-stage-moisture",
                                            "mobile_inspection-stage-process",
                                            "mobile_inspection-stage-adhesion",
                                            "defects"
                                        ])
                                    elif screen_key == "mobile_input-inspection":
                                        keys_to_check.extend(["reports"])
                                    elif screen_key in ("mobile_delivery-create", "mobile_delivery-receive"):
                                        keys_to_check = ["mobile_delivery-create", "mobile_delivery-receive", "delivery-tracking"]
                                    
                                    # Admin và Toàn quyền hệ thống luôn có full quyền
                                    if user.username == "admin" or getattr(user, "permission_level", "") == "Toàn quyền hệ thống":
                                        allowed_actions_list = ["read", "create", "edit", "delete", "approve", "export_import"]
                                    else:
                                        allowed_actions_list = []
                                        for key in keys_to_check:
                                            perm_val = resolved_perms.get(key, [])
                                            if isinstance(perm_val, list):
                                                if perm_val:
                                                    allowed_actions_list = perm_val
                                                    break
                                            elif isinstance(perm_val, str) and perm_val != "none":
                                                if "," in perm_val:
                                                    allowed_actions_list = [a.strip() for a in perm_val.split(",") if a.strip()]
                                                else:
                                                    legacy_rank_map = {
                                                        "none": [],
                                                        "read": ["read"],
                                                        "create": ["read", "create", "export_import"],
                                                        "edit": ["read", "create", "edit", "export_import"],
                                                        "delete": ["read", "create", "edit", "delete", "export_import"],
                                                        "approve": ["read", "create", "edit", "delete", "approve", "export_import"],
                                                        "export_import": ["read", "create", "edit", "delete", "approve", "export_import"],
                                                        "write": ["read", "create", "edit", "delete", "approve", "export_import"],
                                                    }
                                                    allowed_actions_list = legacy_rank_map.get(perm_val, [])
                                                break

                                    if screen_key in ("purchase-requisitions", "purchase-order-items", "order-shipping-monitoring") and not allowed_actions_list:
                                        allowed_actions_list = ["read", "create", "edit", "delete", "approve", "export_import"]

                                    # Xác định hành động được yêu cầu
                                    path_lower = path.lower()
                                    if any(kw in path_lower for kw in ("export", "import", "upload", "download")):
                                        required_action = "export_import"
                                    elif any(kw in path_lower for kw in ("approve", "confirm", "accept", "reject", "verify")):
                                        required_action = "approve"
                                    elif request.method == "POST":
                                        required_action = "create"
                                    elif request.method in ("PUT", "PATCH"):
                                        required_action = "edit"
                                    elif request.method == "DELETE":
                                        required_action = "delete"
                                    else:
                                        required_action = "view"

                                    # Kiểm tra quyền hạn
                                    if required_action not in allowed_actions_list:
                                        from fastapi.responses import JSONResponse
                                        # Dịch tên quyền sang tiếng Việt để hiển thị thông báo
                                        action_names_vi = {
                                            "create": "Thêm mới",
                                            "edit": "Chỉnh sửa",
                                            "delete": "Xóa",
                                            "approve": "Phê duyệt",
                                            "export_import": "Xuất nhập file",
                                            "view": "Xem"
                                        }
                                        act_vi = action_names_vi.get(required_action, required_action)
                                        response = JSONResponse(
                                            status_code=403,
                                            content={"detail": f"Bạn không có quyền thực hiện hành động này ({act_vi}) trên phân hệ này."}
                                        )
                                        origin = request.headers.get("origin")
                                        if origin:
                                            response.headers["Access-Control-Allow-Origin"] = origin
                                            response.headers["Access-Control-Allow-Credentials"] = "true"
                                        else:
                                            response.headers["Access-Control-Allow-Origin"] = "*"
                                        response.headers["Access-Control-Allow-Methods"] = "*"
                                        response.headers["Access-Control-Allow-Headers"] = "*"
                                        return response
                        finally:
                            db.close()
                except Exception:
                    pass
                    
    response = await call_next(request)
    return response




# [NEW] Gzip compression middleware

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)



from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print("!!! UNHANDLED 500 EXCEPTION !!!", exc)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()}
    )

app.include_router(api_router, prefix="/api/v1")



# [TEST] Hỗ trợ login trực tiếp không cần /api/v1 theo yêu cầu người dùng

from modules.auth.routes import account_router

app.include_router(account_router.router, prefix="/accounts", tags=["test_accounts"])



# Mount static files for uploads - Sử dụng BackEnd/static
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
if os.path.exists(UPLOADS_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")



# [NEW] Cấu hình Production Mode: Phân phối giao diện từ Backend

from fastapi.responses import FileResponse



MOBILE_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "Mobile", "dist"))

DASHBOARD_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist"))



# 1. Toàn bộ file tĩnh và giao diện sẽ được xử lý bởi hàm serve_ui bên dưới



# 2. Logic phục vụ giao diện (SPA Serving Logic)

from fastapi import Request



@app.get("/{full_path:path}")

async def serve_ui(request: Request, full_path: str):

    # Loại bỏ leading slashes để chuẩn hóa đường dẫn tránh bypass (ví dụ: //static/...)
    full_path_clean = full_path.lstrip("/")

    # Loại trừ các đường dẫn hệ thống
    if full_path_clean.startswith(("api/", "static/", "accounts/")):
        raise HTTPException(status_code=404)

    # Nhận diện tên miền và nguồn gốc (referer) để phục vụ đúng UI (Dashboard vs Mobile)
    forwarded_host = request.headers.get("x-forwarded-host", "").lower()
    host = request.headers.get("host", "").lower()
    referer = request.headers.get("referer", "").lower()
    
    is_dashboard = (
        "dashboard" in host or 
        "dashboard" in forwarded_host or
        "/dashboard" in referer or 
        full_path_clean.startswith("dashboard")
    )

    # Nếu được xác định là Dashboard
    if is_dashboard:
        # Xử lý đường dẫn cho Dashboard
        clean_path = full_path_clean.replace("dashboard/", "", 1) if full_path_clean.startswith("dashboard/") else full_path_clean
        if clean_path == "dashboard": clean_path = ""
        
        target_file = os.path.join(DASHBOARD_DIST, clean_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        
        # Fallback về index.html của Dashboard
        index_dashboard = os.path.join(DASHBOARD_DIST, "index.html")
        if os.path.exists(index_dashboard):
            return FileResponse(index_dashboard, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    
    # Mặc định là Mobile
    target_file = os.path.join(MOBILE_DIST, full_path_clean)
    if os.path.isfile(target_file):
        if full_path_clean.endswith("index.html"):
            return FileResponse(target_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        return FileResponse(target_file)
        
    # Fallback về index.html của Mobile
    index_mobile = os.path.join(MOBILE_DIST, "index.html")
    if os.path.exists(index_mobile):
        return FileResponse(index_mobile, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        
    return {"message": "ERP_G7 API is running. UI builds not found."}

@app.get("/test-direct")
def test_direct_endpoint():
    import os
    try:
        from modules.chatbot.services.ai_chatbot_service import ai_chatbot_service
        available = ai_chatbot_service.is_available()
        api_key_env = os.getenv("GEMINI_API_KEY")
        
        # Test Gemini client call directly
        err_msg = None
        response_text = None
        try:
            if ai_chatbot_service.client:
                # Direct test call to Gemini API
                direct_res = ai_chatbot_service.client.models.generate_content(
                    model="gemini-1.0-pro",  # Use gemini-1.0-pro (available in v1beta)
                    contents="Xin chào"
                )
                response_text = direct_res.text
            else:
                err_msg = "Gemini client is None"
        except Exception as api_err:
            err_msg = f"Gemini API call failed: {str(api_err)}"
            
        return {
            "status": "ok",
            "is_available": available,
            "api_key_present": api_key_env is not None,
            "api_key_preview": api_key_env[:10] + "..." if api_key_env else "None",
            "direct_response": response_text,
            "direct_error": err_msg
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }


