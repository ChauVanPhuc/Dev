import os
# Cap thread count for CPU-bound computation (PyTorch, OpenCV, OpenMP, MKL, BLAS)
# Prevents OCR/AI inference from starving FastAPI/Uvicorn event loop on 56-core server
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "2")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "2")

try:
    import cv2
    cv2.setNumThreads(2)
except Exception:
    pass

try:
    import torch
    torch.set_num_threads(2)
except Exception:
    pass

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

from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

from contextlib import asynccontextmanager

import colorama

from sqlalchemy import text



# Cấu hình MIME type để Android không tự đổi đuôi .apk thành .zip

mimetypes.add_type('application/vnd.android.package-archive', '.apk')



# pyrefly: ignore [missing-import]
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

    # Pre-warm AI OCR Engine in background thread to eliminate initial 6-8s cold-start latency
    def _bg_warmup_ocr():
        try:
            import time
            time.sleep(1.0)
            from lpn_crawler.ai_ocr_train.core.ocr_engine import OcrEngine
            eng = OcrEngine()
            eng.warmup()
            print("[OcrEngine] GPU DirectML & CRNN models pre-warmed in background successfully!")
        except Exception as e:
            print(f"[OcrEngine] Background warmup notice: {e}")

    import threading
    threading.Thread(target=_bg_warmup_ocr, daemon=True).start()

    yield



Base.metadata.create_all(bind=engine)

# [MIGRATION] Add Inspection Guide sidebar to Quản lý chất lượng
try:
    from database.migrations.add_inspection_guide_sidebar import add_inspection_guide_sidebar
    add_inspection_guide_sidebar()
except Exception:
    pass

# [MIGRATION] Add approver_bgd column to iso_documents & iso_processes
try:
    from database.migrations.add_approver_bgd_column import run_migration as migrate_approver_bgd
    migrate_approver_bgd()
except Exception as err:
    print(f"[MIGRATION] ISO approver_bgd warning: {err}")

# [MIGRATION] Create iso_master_records table & seed initial data
try:
    from database.migrations.create_iso_master_records_table import migrate_and_seed
    migrate_and_seed()
except Exception as err:
    print(f"[MIGRATION] ISO Master records warning: {err}")

# [MIGRATION] Seed all 5 ISO items into system_sidebars
try:
    from database.migrations.seed_all_iso_sidebars import seed_iso_sidebars
    seed_iso_sidebars()
except Exception as err:
    print(f"[MIGRATION] ISO sidebars warning: {err}")

# [MIGRATION] Check/Create defect_categories table & seed
try:
    from database.migrations.create_defect_categories_table import migrate_and_seed_defect_categories
    migrate_and_seed_defect_categories()
except Exception:
    pass

# [MIGRATION] Seed QLCL Departments & responsibility_scope column
try:
    from database.migrations.seed_qlcl_departments import seed_qlcl_departments
    seed_qlcl_departments()
except Exception as err:
    print(f"[MIGRATION] Seed QLCL departments warning: {err}")

# [MIGRATION] Seed QLCL Checklists & department_code column
try:
    from database.migrations.seed_qlcl_checklists import seed_qlcl_checklists
    seed_qlcl_checklists()
except Exception as err:
    print(f"[MIGRATION] Seed QLCL checklists warning: {err}")

# [MIGRATION] Seed HR Assessment & Quiz data
try:
    from database.seeders.seed_assessments import seed_assessments_data
    seed_assessments_data()
except Exception as ass_err:
    print(f"[MIGRATION] Seed HR assessments warning: {ass_err}")

# [MIGRATION] Add Assessment sidebar menu
try:
    from database.migrations.add_assessment_sidebar import add_assessment_sidebar
    add_assessment_sidebar()
except Exception as side_err:
    print(f"[MIGRATION] Add assessment sidebar warning: {side_err}")





# [MIGRATION] Add workshop column to machines table
from sqlalchemy import text
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE machines ADD workshop NVARCHAR(255) NULL"))
except Exception as migration_err:
    # Ignore if column already exists
    pass

# [MIGRATION] Expand kpi_training_plans target, file_name, and file_url columns to NVARCHAR(MAX)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN target NVARCHAR(MAX) NOT NULL"))
        conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN file_name NVARCHAR(MAX) NULL"))
        conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN file_url NVARCHAR(MAX) NULL"))
except Exception as alter_err:
    print(f"[MIGRATION] Alter kpi_training_plans columns warning: {alter_err}")

# [MIGRATION] Add created_at column to roles table (fix SQL error 42S22)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE roles ADD created_at DATETIME NULL"))
except Exception:
    # Ignore if column already exists
    pass

# [MIGRATION] Add root_cause, solution, capa_reference columns to defect_types table
try:
    with engine.begin() as conn:
        for _col, _type in [
            ("root_cause", "NVARCHAR(1000) NULL"),
            ("solution", "NVARCHAR(1000) NULL"),
            ("capa_reference", "NVARCHAR(250) NULL")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE defect_types ADD {_col} {_type}"))
            except Exception:
                pass
except Exception:
    pass

# [MIGRATION] Add missing columns to master_products table
try:
    with engine.begin() as conn:
        for _col, _type in [
            ("new_name", "NVARCHAR(255) NULL"),
            ("brand_name", "NVARCHAR(100) NULL"),
            ("adjusted_date", "DATETIME NULL"),
            ("image_url", "NVARCHAR(500) NULL"),
            ("total_category_count", "INT NULL DEFAULT 0")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE master_products ADD {_col} {_type}"))
            except Exception:
                pass
except Exception:
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

# [MIGRATION] Add main_category column to master_categories table & seed default values
try:
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE master_categories ADD main_category NVARCHAR(50) NULL"))
        except Exception:
            pass
        vanity_names = ['ADV', 'ADVANCE', 'BEZ', 'EYC', 'FOL', 'TPH']
        furniture_names = ['APT', 'ATL', 'ATLAS', 'COV', 'HOR', 'MBC', 'TIN']
        for _vname in vanity_names:
            conn.execute(text("UPDATE master_categories SET main_category = 'Vanity' WHERE name = :n AND (main_category IS NULL OR main_category = '')"), {"n": _vname})
        for _fname in furniture_names:
            conn.execute(text("UPDATE master_categories SET main_category = 'Furniture' WHERE name = :n AND (main_category IS NULL OR main_category = '')"), {"n": _fname})
except Exception as cat_mig_err:
    print(f"[MIGRATION] Alter master_categories warning: {cat_mig_err}")

# [MIGRATION] Seed master_categories & categories and link master_products + production_routings by SKU prefix
try:
    with engine.begin() as conn:
        # 1. Seed known categories if not exists
        known_categories = [
            ('APT', 'APT'),
            ('ATL', 'ATL'),
            ('FOL', 'FOL'),
            ('ADV', 'ADV'),
            ('TPH', 'TPH'),
            ('HOR', 'HOR'),
            ('EYC', 'EYC'),
            ('COV', 'COV'),
            ('TIN', 'TIN'),
            ('BEZ', 'BEZ'),
            ('MBC', 'MBC'),
        ]
        for prefix, cat_name in known_categories:
            # Seed master_categories
            conn.execute(text(
                "IF NOT EXISTS (SELECT 1 FROM master_categories WHERE name = :name) "
                "INSERT INTO master_categories (name, description, status, created_at) VALUES (:name, :desc, 1, GETDATE())"
            ), {"name": cat_name, "desc": f"Dòng hàng {prefix}"})
            # Seed categories (Production)
            conn.execute(text(
                "IF NOT EXISTS (SELECT 1 FROM categories WHERE name = :name) "
                "INSERT INTO categories (name, description) VALUES (:name, :desc)"
            ), {"name": cat_name, "desc": f"Dòng hàng {prefix}"})

        # 2. Link master_products to categories by SKU prefix (first 3-6 chars)
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

# [STATIC FILES] Static files are mounted after router registration (see below)



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
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
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
        # pyrefly: ignore [missing-import]
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
            "/api/v1/master-products/upload-image",
            "/api/v1/inspections/upload-image",
            "/api/v1/inspections/upload",
            "/api/v1/deliveries/upload-image",
            "/api/v1/assessment",
            "/api/v1/iso-documents/onlyoffice/callback",
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
                    from modules.auth.models.departments import Department as DepartmentModel
                    from modules.auth.models.role import Role as RoleModel
                    from modules.auth.controllers.account_controller import resolve_user_permissions
                    import json

                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    username = payload.get("sub")
                    
                    if username:
                        db = SessionLocal()
                        try:
                            user = db.query(AccountModel).filter(AccountModel.username == username).first()
                            if user:
                                # Determine candidate permission keys based on path
                                candidate_keys = []
                                
                                # 1. Inspections / QC
                                if path.startswith("/api/v1/inspections/stage"):
                                    candidate_keys = [
                                        "/inspection-stage", "inspection-stage",
                                        "/inspection-stage-moisture", "/inspection-stage-process",
                                        "/inspection-first-article", "/inspection-stage-adhesion",
                                        "/input-inspection", "reports", "/admin/reports",
                                        "defects", "/admin/defects", "mobile_inspection-stage"
                                    ]
                                elif path.startswith("/api/v1/inspections/daily"):
                                    candidate_keys = [
                                        "/inspection-daily", "inspection-daily",
                                        "/inspection-daily-shaping", "/inspection-daily-assembly",
                                        "/inspection-daily-painting", "/inspection-daily-packaging",
                                        "defects", "/admin/defects", "reports", "/admin/reports",
                                        "mobile_inspection-daily"
                                    ]
                                elif path.startswith("/api/v1/inspections/upload") or path.startswith("/api/v1/inspections/upload-ocr"):
                                    candidate_keys = [
                                        "/inspection-stage", "/inspection-daily", "/inspection-first-article",
                                        "reports", "/admin/reports", "defects", "/admin/defects"
                                    ]
                                elif path.startswith("/api/v1/inspections/defect-types"):
                                    candidate_keys = [
                                        "/inspection-stage", "/inspection-daily", "defects", "/admin/defects"
                                    ]
                                elif path.startswith("/api/v1/inspections"):
                                    candidate_keys = [
                                        "/inspection-stage", "/input-inspection", "/production_v2/inspection",
                                        "/admin/reports", "reports", "/admin/defects", "defects",
                                        "/admin/quality", "admin/quality", "quality-records", "/admin/quality-records"
                                    ]
                                elif path.startswith("/api/v1/qc"):
                                    candidate_keys = [
                                        "/inspection-stage", "/inspection-daily", "/admin/defects",
                                        "defects", "/admin/reports", "reports",
                                        "/admin/quality", "admin/quality", "quality-records", "/admin/quality-records"
                                    ]
                                    
                                # 2. Deliveries
                                elif path.startswith("/api/v1/deliveries/confirm") or path.startswith("/api/v1/deliveries/receive"):
                                    candidate_keys = [
                                        "/delivery-receive", "/delivery-info", "/delivery-history",
                                        "/admin/delivery-tracking", "delivery-tracking", "mobile_delivery-receive"
                                    ]
                                elif path.startswith("/api/v1/deliveries/backup-qrs"):
                                    candidate_keys = [
                                        "/admin/backup-qrs", "backup-qrs", "/delivery-info"
                                    ]
                                elif path.startswith("/api/v1/deliveries"):
                                    candidate_keys = [
                                        "/delivery-create", "/delivery-info", "/delivery-history",
                                        "/admin/delivery-tracking", "delivery-tracking",
                                        "/production_v2/transfer", "mobile_delivery-create"
                                    ]
                                elif path.startswith("/api/v1/pallet-cards"):
                                    candidate_keys = [
                                        "/admin/exception-deliveries", "exception-deliveries", "/delivery-info"
                                    ]
                                    
                                # 3. Production & Plans
                                elif path.startswith("/api/v1/plans") or path.startswith("/api/v1/production-plans"):
                                    candidate_keys = [
                                        "/plan", "/admin/plan", "plan", "/production/plans",
                                        "/production/orders", "/admin/production-orders"
                                    ]
                                elif path.startswith("/api/v1/production-orders"):
                                    candidate_keys = [
                                        "/production/orders", "/admin/production-orders",
                                        "/production/plans", "/admin/plan", "plan"
                                    ]
                                elif path.startswith("/api/v1/production-routings"):
                                    candidate_keys = ["/admin/production-routing", "production-routing"]
                                elif path.startswith("/api/v1/products") or path.startswith("/api/v1/master-products") or path.startswith("/api/v1/master-categories"):
                                    candidate_keys = ["/admin/products", "products", "/products", "/admin/master-products", "master-products"]
                                    
                                # 4. KPI & HR
                                elif path.startswith("/api/v1/kpis") or path.startswith("/api/v1/kpi"):
                                    candidate_keys = [
                                        "/kpi", "/kpi-staff", "/admin/kpi", "kpi",
                                        "/admin/kpi/checklist", "/admin/kpi/list", "/admin/kpi/rules", "/admin/kpi/feedback"
                                    ]
                                elif path.startswith("/api/v1/awards-discipline"):
                                    candidate_keys = ["/awards", "/kpi", "/admin/kpi", "kpi"]
                                elif path.startswith("/api/v1/staff-evaluations"):
                                    candidate_keys = ["/kpi-staff", "/staff-evaluation", "/kpi", "/admin/kpi", "kpi"]
                                elif path.startswith("/api/v1/hr"):
                                    candidate_keys = ["/admin/hr/employees", "/admin/hr/org-chart", "users", "/admin/users"]
                                    
                                # 5. Capa, Feedback, Claims, Quick Report
                                elif path.startswith("/api/v1/capas"):
                                    candidate_keys = [
                                        "/capa-list", "/capa-report", "/capa-detail",
                                        "/admin/capa", "capa", "feedback", "/admin/feedback"
                                    ]
                                elif path.startswith("/api/v1/quick-report"):
                                    candidate_keys = [
                                        "/quick-report-create", "/quick-report-list", "/ctq-sos",
                                        "/warnings", "/feedback", "/reports", "/admin/reports"
                                    ]
                                elif path.startswith("/api/v1/claims/cabinet-prices"):
                                    candidate_keys = ["/admin/prices", "prices"]
                                elif path.startswith("/api/v1/claims/shipments"):
                                    candidate_keys = ["/admin/shipments", "shipments"]
                                elif path.startswith("/api/v1/claims"):
                                    candidate_keys = ["/admin/claims", "claim"]
                                    
                                # 6. Purchasing
                                elif path.startswith("/api/v1/purchase-requisitions") or path.startswith("/api/v1/purchase-order-items"):
                                    candidate_keys = [
                                        "/admin/purchase-requisitions", "purchase-requisitions",
                                        "/inspection-stage", "/plan"
                                    ]
                                    
                                # 7. Equipments & Machinery
                                elif path.startswith("/api/v1/equipments"):
                                    candidate_keys = ["/admin/equipment", "equipment", "/equipment-list"]
                                elif path.startswith("/api/v1/machines"):
                                    candidate_keys = ["/admin/machines", "machines", "/equipment-list"]
                                    
                                # 8. System, Auth, Accounts
                                elif path.startswith("/api/v1/accounts") or path.startswith("/accounts") or path.startswith("/api/v1/roles") or path.startswith("/api/v1/permissions"):
                                    candidate_keys = ["/admin/users", "users"]
                                elif path.startswith("/api/v1/screens") or path.startswith("/api/v1/screen-bugs"):
                                    candidate_keys = ["/admin/screens", "/admin/screens/bugs", "screens", "bugs"]
                                elif path.startswith("/api/v1/system/incidents") or path.startswith("/api/v1/system/logs"):
                                    candidate_keys = ["/admin/logs", "logs", "/logs"]
                                elif path.startswith("/api/v1/system/data-packages") or path.startswith("/api/v1/system/backup"):
                                    candidate_keys = ["/admin/data", "data"]
                                elif path.startswith("/api/v1/system/monitor"):
                                    candidate_keys = ["/admin/monitor", "monitor"]

                                if candidate_keys:
                                    # Phân giải quyền thực tế của User
                                    resolved_perms = resolve_user_permissions(user, db)
                                    
                                    # Lấy thông tin Role của user
                                    dept = db.query(DepartmentModel).filter(DepartmentModel.account_id == user.id).first()
                                    role_name = ""
                                    if dept and dept.role_id:
                                        role_obj = db.query(RoleModel).filter(RoleModel.id == dept.role_id).first()
                                        if role_obj:
                                            role_name = role_obj.name or ""

                                    # Root Admin, Toàn quyền hệ thống hoặc IT/BGD luôn có full quyền
                                    if (
                                        user.username == "admin"
                                        or getattr(user, "permission_level", "") == "Toàn quyền hệ thống"
                                        or role_name in ("IT", "BGD")
                                    ):
                                        allowed_actions_set = {"read", "create", "edit", "delete", "approve", "export_import"}
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
                                        allowed_actions_set = set()
                                        for raw_key in candidate_keys:
                                            variations = [
                                                raw_key,
                                                f"/{raw_key.lstrip('/')}",
                                                raw_key.lstrip('/'),
                                                f"mobile_{raw_key.lstrip('/')}",
                                                f"/admin/{raw_key.lstrip('/')}",
                                                f"/admin/{raw_key.replace('mobile_', '').lstrip('/')}"
                                            ]
                                            for key in variations:
                                                if key in resolved_perms:
                                                    perm_val = resolved_perms[key]
                                                    if isinstance(perm_val, list):
                                                        allowed_actions_set.update(perm_val)
                                                    elif isinstance(perm_val, str) and perm_val != "none":
                                                        if "," in perm_val:
                                                            allowed_actions_set.update(a.strip() for a in perm_val.split(",") if a.strip())
                                                        else:
                                                            allowed_actions_set.update(legacy_rank_map.get(perm_val, []))

                                    # Nếu endpoint cho phép bypass mặc định nếu chưa cấu hình
                                    if any(p in path for p in ("purchase-requisitions", "purchase-order-items", "order-shipping-monitoring")) and not allowed_actions_set:
                                        allowed_actions_set = {"read", "create", "edit", "delete", "approve", "export_import"}

                                    # Xác định hành động được yêu cầu
                                    path_lower = path.lower()
                                    if any(kw in path_lower for kw in ("upload-ocr", "upload")):
                                        # Tải ảnh kiểm tra mẫu / OCR trong quy trình kiểm tra được phép với quyền create hoặc edit hoặc export_import
                                        required_action = "create"
                                    elif any(kw in path_lower for kw in ("export", "import", "download")):
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
                                        required_action = "read"

                                    # Kiểm tra quyền hạn
                                    if required_action not in allowed_actions_set:
                                        from fastapi.responses import JSONResponse
                                        action_names_vi = {
                                            "create": "Thêm mới",
                                            "edit": "Chỉnh sửa",
                                            "delete": "Xóa",
                                            "approve": "Phê duyệt",
                                            "export_import": "Xuất nhập file",
                                            "read": "Xem",
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

# [COMPATIBILITY] Mount trực tiếp /api/ai-ocr để phục vụ frontend không bị 404
try:
    from lpn_crawler.ai_ocr_train.api.router import router as ai_ocr_compat_router
    # Router đã có sẵn prefix "/ai-ocr" nên chỉ cần thêm "/api" -> /api/ai-ocr/...
    app.include_router(ai_ocr_compat_router, prefix="/api", tags=["ai-ocr-compat"])
except Exception as e:
    print(f"[Warning] Failed to mount /api/ai-ocr compat router: {e}")



# [TEST] Hỗ trợ login trực tiếp không cần /api/v1 theo yêu cầu người dùng

from modules.auth.routes import account_router

app.include_router(account_router.router, prefix="/accounts", tags=["test_accounts"])



# [STATIC FILES] Mount thư mục static chứa uploads (screen_bugs, component_samples, products, v.v.)
from config.settings import STATIC_DIR, UPLOADS_DIR, get_upload_dir

# Tạo sẵn các thư mục con upload phổ biến
get_upload_dir("screen_bugs")
get_upload_dir("component_samples")
get_upload_dir("products")
get_upload_dir("violations")
get_upload_dir("inspections")

class SmartStaticFiles(StaticFiles):
    """
    StaticFiles với cơ chế Fallback thông minh:
    Tự động tìm kiếm file thay thế nếu định dạng yêu cầu không tồn tại (VD: yêu cầu .webp nhưng đĩa lưu .jpg, hoặc ngược lại).
    """
    def lookup_path(self, path: str):
        full_path, stat_result = super().lookup_path(path)
        if stat_result is not None:
            return full_path, stat_result

        stem, ext = os.path.splitext(path)
        ext_lower = ext.lower()
        if ext_lower in [".webp", ".jpg", ".jpeg", ".png"]:
            candidates = [".jpg", ".png", ".jpeg", ".webp"]
            for alt_ext in candidates:
                if alt_ext != ext_lower:
                    alt_path = stem + alt_ext
                    alt_full_path, alt_stat = super().lookup_path(alt_path)
                    if alt_stat is not None:
                        return alt_full_path, alt_stat
        return "", None

app.mount("/static", SmartStaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", SmartStaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/api/v1/static", SmartStaticFiles(directory=STATIC_DIR), name="api_v1_static")
app.mount("/api/v1/uploads", SmartStaticFiles(directory=UPLOADS_DIR), name="api_v1_uploads")

# [QUALITY REPORT] Mount static assets cho báo cáo điều hành infographic
REPORT_ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Report", "templates", "assets"))
if os.path.exists(REPORT_ASSETS_DIR):
    app.mount("/report-assets", StaticFiles(directory=REPORT_ASSETS_DIR), name="report-assets")
    app.mount("/api/v1/quality-reports/assets", StaticFiles(directory=REPORT_ASSETS_DIR), name="quality-reports-assets")

# [CANVAS EDITOR] Mount ứng dụng Canvas Editor (cho iframe soạn thảo văn bản ISO)
CANVAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist", "canvas-editor"))
if not os.path.exists(CANVAS_DIR) or not os.path.exists(os.path.join(CANVAS_DIR, "index.html")):
    CANVAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "WS", "canvas-editor", "dist"))
if not os.path.exists(CANVAS_DIR) or not os.path.exists(os.path.join(CANVAS_DIR, "index.html")):
    CANVAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "public", "canvas-editor"))

if os.path.exists(CANVAS_DIR):
    app.mount("/canvas-editor", StaticFiles(directory=CANVAS_DIR, html=True), name="canvas_editor")



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

    # [CANVAS EDITOR] Phục vụ Canvas Editor nếu truy cập qua SPA route
    if full_path_clean == "canvas-editor" or full_path_clean.startswith("canvas-editor/"):
        sub_path = full_path_clean[len("canvas-editor"):].lstrip("/")
        if not sub_path:
            sub_path = "index.html"
            
        candidate_dirs = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist", "canvas-editor")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "WS", "canvas-editor", "dist")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "public", "canvas-editor")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "Mobile", "dist", "canvas-editor")),
        ]
        for cdir in candidate_dirs:
            target_f = os.path.join(cdir, sub_path)
            if os.path.isfile(target_f):
                headers = {}
                if sub_path.endswith(".html"):
                    headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                return FileResponse(target_f, headers=headers)
        # Fallback về index.html của canvas-editor
        for cdir in candidate_dirs:
            target_idx = os.path.join(cdir, "index.html")
            if os.path.isfile(target_idx):
                return FileResponse(target_idx, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        raise HTTPException(status_code=404, detail="Canvas Editor not found")

    # Phục vụ file tĩnh và uploads với cơ chế SmartStaticFiles fallback
    if full_path_clean.startswith("static/"):
        sub_path = full_path_clean[len("static/"):]
        ssf = SmartStaticFiles(directory=STATIC_DIR)
        full_p, stat_res = ssf.lookup_path(sub_path)
        if stat_res is not None:
            return FileResponse(full_p)
        raise HTTPException(status_code=404)

    if full_path_clean.startswith("uploads/"):
        sub_path = full_path_clean[len("uploads/"):]
        ssf = SmartStaticFiles(directory=UPLOADS_DIR)
        full_p, stat_res = ssf.lookup_path(sub_path)
        if stat_res is not None:
            return FileResponse(full_p)
        raise HTTPException(status_code=404)

    # Hỗ trợ phục vụ uploads kể cả khi đi kèm prefix api/v1 hoặc double slash
    if "uploads/" in full_path_clean:
        sub_path = full_path_clean.split("uploads/", 1)[-1]
        ssf = SmartStaticFiles(directory=UPLOADS_DIR)
        full_p, stat_res = ssf.lookup_path(sub_path)
        if stat_res is not None:
            return FileResponse(full_p)

    # Loại trừ các đường dẫn hệ thống
    if full_path_clean.startswith(("api/", "accounts/")):
        raise HTTPException(status_code=404)

    # Nhận diện tên miền và nguồn gốc (referer) để phục vụ đúng UI (Dashboard vs Mobile)
    forwarded_host = request.headers.get("x-forwarded-host", "").lower()
    host = request.headers.get("host", "").lower()
    referer = request.headers.get("referer", "").lower()
    
    is_dashboard = (
        "dashboard" in host or 
        "dashboard" in forwarded_host or
        "/dashboard" in referer or 
        full_path_clean.startswith("dashboard") or
        full_path_clean.startswith("admin") or
        "/admin" in referer
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
                err_msg = "Client Gemini chưa được khởi tạo"
        except Exception as api_err:
            err_msg = f"Gọi Gemini API thất bại: {str(api_err)}"
            
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
