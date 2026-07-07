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

    # [MANDATORY MIGRATION] Tự động thêm cột độ ẩm nếu chưa có

    db = SessionLocal()

    try:
        print("Checking for missing columns in accounts table...")
        try:
            db.execute(text("ALTER TABLE accounts ADD screen_permissions NVARCHAR(MAX) NULL"))
            db.commit()
            print("Successfully added screen_permissions column to accounts table.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE accounts ADD permission_level NVARCHAR(50) NULL"))
            db.commit()
            print("Successfully added permission_level column to accounts table.")
        except Exception:
            db.rollback()

        print("Checking for missing columns in roles table...")
        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('roles') AND name = 'is_active'
                )
                ALTER TABLE roles ADD is_active BIT NOT NULL DEFAULT 1
            """))
            db.commit()
            print("Successfully checked/added is_active to roles table.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('roles') AND name = 'default_permissions'
                )
                ALTER TABLE roles ADD default_permissions NVARCHAR(MAX) NULL
            """))
            db.commit()
            print("Successfully checked/added default_permissions to roles table.")
        except Exception:
            db.rollback()

        print("Checking for missing columns in permissions table...")
        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('permissions') AND name = 'is_active'
                )
                ALTER TABLE permissions ADD is_active BIT NOT NULL DEFAULT 1
            """))
            db.commit()
            print("Successfully checked/added is_active to permissions table.")
        except Exception:
            db.rollback()

        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('permissions') AND name = 'default_permissions'
                )
                ALTER TABLE permissions ADD default_permissions NVARCHAR(MAX) NULL
            """))
            db.commit()
            print("Successfully checked/added default_permissions to permissions table.")
        except Exception:
            db.rollback()

        print("Checking for missing columns in deliveries table...")
        # Sử dụng lệnh ALTER TABLE trực tiếp (SQL Server syntax)
        try:
            db.execute(text("ALTER TABLE deliveries ADD moisture_min FLOAT NULL"))
            db.commit()
            print("Successfully added moisture_min column.")
        except Exception:
            db.rollback() # Cột có thể đã tồn tại



        try:

            db.execute(text("ALTER TABLE deliveries ADD moisture_max FLOAT NULL"))

            db.commit()

            print("Successfully added moisture_max column.")

        except Exception:

            db.rollback() # Cột có thể đã tồn tại



        print("Checking for missing columns in kpis table...")

        try:

            db.execute(text("ALTER TABLE kpis ADD period_type NVARCHAR(50) NULL"))

            db.commit()

            print("Successfully added period_type column to kpis table.")

        except Exception:

            db.rollback()



        try:

            db.execute(text("ALTER TABLE kpis ADD period_name NVARCHAR(50) NULL"))

            db.commit()

            print("Successfully added period_name column to kpis table.")

        except Exception:

            db.rollback()

        # Check and create machines table if not exists
        print("Checking/creating machines table...")
        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.objects 
                    WHERE object_id = OBJECT_ID('machines') AND type = 'U'
                )
                CREATE TABLE machines (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(255) NOT NULL,
                    code NVARCHAR(100) NOT NULL UNIQUE,
                    status NVARCHAR(100) NULL,
                    factory NVARCHAR(255) NULL,
                    department NVARCHAR(255) NULL,
                    receive_date DATE NULL,
                    origin NVARCHAR(255) NULL,
                    supplier NVARCHAR(255) NULL,
                    maintenance_cycle INT NULL,
                    next_maintenance_date DATE NULL,
                    last_maintenance_date DATE NULL,
                    notes NVARCHAR(1000) NULL,
                    images NVARCHAR(MAX) NULL,
                    qr_code NVARCHAR(255) NULL,
                    daily_run_time FLOAT NULL,
                    productivity NVARCHAR(255) NULL,
                    production_year NVARCHAR(50) NULL,
                    owner_name NVARCHAR(255) NULL,
                    created_at DATETIME NULL DEFAULT GETDATE()
                )
            """))
            db.commit()
            print("Successfully checked/created machines table.")
        except Exception as e:
            db.rollback()
            print(f"Error checking/creating machines table: {e}")

        # Check and create machine_maintenances table if not exists
        print("Checking/creating machine_maintenances table...")
        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.objects 
                    WHERE object_id = OBJECT_ID('machine_maintenances') AND type = 'U'
                )
                CREATE TABLE machine_maintenances (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_id INT NOT NULL FOREIGN KEY REFERENCES machines(id) ON DELETE CASCADE,
                    performed_by NVARCHAR(255) NULL,
                    verified_by NVARCHAR(255) NULL,
                    check_date DATE NULL,
                    maintenance_date DATE NULL,
                    status NVARCHAR(100) NULL,
                    notes NVARCHAR(500) NULL,
                    created_at DATETIME NULL DEFAULT GETDATE()
                )
            """))
            db.commit()
            print("Successfully checked/created machine_maintenances table.")
        except Exception as e:
            db.rollback()
            print(f"Error checking/creating machine_maintenances table: {e}")

        # Check and create machine_documents table if not exists
        print("Checking/creating machine_documents table...")
        try:
            db.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.objects 
                    WHERE object_id = OBJECT_ID('machine_documents') AND type = 'U'
                )
                CREATE TABLE machine_documents (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_id INT NOT NULL FOREIGN KEY REFERENCES machines(id) ON DELETE CASCADE,
                    file_name NVARCHAR(255) NOT NULL,
                    file_path NVARCHAR(1000) NOT NULL,
                    category NVARCHAR(100) NOT NULL,
                    upload_date DATETIME NULL DEFAULT GETDATE(),
                    uploader NVARCHAR(255) NULL
                )
            """))
            db.commit()
            print("Successfully checked/created machine_documents table.")
        except Exception as e:
            db.rollback()
            print(f"Error checking/creating machine_documents table: {e}")

        # [AUTO-MIGRATION] Auto-run screen migrations

        try:

            import sys

            sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

            from database.migrations.create_system_screens_table import upgrade as upgrade_screens

            print("Running auto-migration for system screens...")

            upgrade_screens()

        except Exception as e:

            print(f"Auto-migration screens error: {e}")



        # [AUTO-SEED] Auto-run component seeding

        try:

            from database.seeders.seed_system_components import seed_components

            print("Running auto-seeding for system components...")

            seed_components()

        except Exception as e:

            print(f"Auto-seeding components error: {e}")

        # [AUTO-MIGRATION] Defect Classification Columns & Table
        try:
            print("Checking for defect classification columns & tables...")
            try:
                db.execute(text("ALTER TABLE defect_types ADD code NVARCHAR(50) NULL"))
                db.commit()
                db.execute(text("CREATE UNIQUE INDEX ix_defect_types_code ON defect_types (code) WHERE code IS NOT NULL"))
                db.commit()
                print("Successfully added 'code' column and unique index to defect_types.")
            except Exception:
                db.rollback()

            try:
                db.execute(text("ALTER TABLE defect_types ADD aql_class NVARCHAR(50) NULL"))
                db.commit()
                print("Successfully added 'aql_class' column to defect_types.")
            except Exception:
                db.rollback()

            # Kiểm tra bảng client_defects
            table_check = db.execute(text("""
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'client_defects'
            """)).fetchone()

            if not table_check:
                db.execute(text("""
                    CREATE TABLE client_defects (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        code NVARCHAR(50) NOT NULL UNIQUE,
                        name NVARCHAR(250) NOT NULL,
                        name_en NVARCHAR(250) NULL,
                        minor_criteria NVARCHAR(500) NULL,
                        major_criteria NVARCHAR(500) NULL,
                        critical_criteria NVARCHAR(500) NULL,
                        detection_method NVARCHAR(250) NULL,
                        g7_code NVARCHAR(50) NULL,
                        defect_type_id INT NULL,
                        is_active BIT NOT NULL DEFAULT 1,
                        CONSTRAINT FK_client_defects_defect_types FOREIGN KEY (defect_type_id) 
                            REFERENCES defect_types(id) ON DELETE CASCADE
                    )
                """))
                db.commit()
                db.execute(text("CREATE INDEX ix_client_defects_code ON client_defects (code)"))
                db.commit()
                print("Successfully created client_defects table and index.")
        except Exception as e:
            db.rollback()
            print(f"Failed to auto-migrate defect classification: {e}")

        # [AUTO-SEED] Excel Defect Ingestion
        try:
            print("Running auto-import for defect classifications from Excel...")
            import sys
            import os
            sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
            from scripts.import_defects import import_defects
            import_defects()
        except Exception as e:
            print(f"Auto-import defect classifications error: {e}")

        # [AUTO-INDEX MIGRATION] Tự động tạo index cho các cột khóa ngoại hay truy vấn
        try:
            print("Checking and creating missing database indexes...")
            indexes_to_create = [
                ("input_inspections", "plan_id", "ix_input_inspections_plan_id"),
                ("deliveries", "plan_id", "ix_deliveries_plan_id"),
                ("deliveries", "order_id", "ix_deliveries_order_id"),
                ("delivery_details", "order_id", "ix_delivery_details_order_id"),
                ("delivery_details", "delivery_id", "ix_delivery_details_delivery_id"),
                ("delivery_returns", "plan_id", "ix_delivery_returns_plan_id"),
                ("delivery_returns", "delivery_id", "ix_delivery_returns_delivery_id"),
                ("products", "order_id", "ix_products_order_id"),
                ("bom_details", "product_id", "ix_bom_details_product_id"),
                ("bom_details", "parent_id", "ix_bom_details_parent_id"),
                ("orders", "plan_id", "ix_orders_plan_id"),
                ("equipment_inspections", "equipment_id", "ix_equipment_inspections_eq_id"),
                ("equipment_trainings", "equipment_id", "ix_equipment_trainings_eq_id"),
                ("kpi_checklists", "employee_id", "ix_kpi_checklists_employee_id"),
                ("kpi_employee_items", "employee_id", "ix_kpi_employee_items_employee_id"),
                ("kpi_violations", "employee_id", "ix_kpi_violations_employee_id"),
                ("kpi_feedbacks", "employee_id", "ix_kpi_feedbacks_employee_id")
            ]
            for table, col, index_name in indexes_to_create:
                try:
                    # Kiểm tra xem index đã tồn tại hay chưa (SQL Server syntax)
                    check_sql = text(f"""
                        SELECT 1 FROM sys.indexes 
                        WHERE name = '{index_name}' AND object_id = OBJECT_ID('{table}')
                    """)
                    exists = db.execute(check_sql).fetchone()
                    if not exists:
                        print(f"Creating index {index_name} on {table}({col})...")
                        db.execute(text(f"CREATE INDEX {index_name} ON {table} ({col})"))
                        db.commit()
                except Exception as index_err:
                    db.rollback()
                    print(f"Error creating index {index_name}: {index_err}")
            print("Successfully processed database indexes.")
        except Exception as e:
            print(f"Auto-index migration error: {e}")

        # [AUTO-SYNC] Synchronize cabinet prices from temp JSON to DB
        try:
            print("Running auto-sync for cabinet prices from temp JSON to DB...")
            from modules.claim.controllers.import_controller import load_temp_cabinet_prices
            from modules.claim.models.claim_models import CabinetPrice
            
            prices = load_temp_cabinet_prices()
            if prices:
                print(f"Loaded {len(prices)} prices from temp JSON. Syncing to DB...")
                # Get existing prices in DB
                existing_prices = {p.cabinet_code: p for p in db.query(CabinetPrice).all()}
                
                new_count = 0
                update_count = 0
                
                for p_data in prices:
                    code = p_data.get("cabinet_code")
                    if not code:
                        continue
                        
                    name = p_data.get("cabinet_name") or code
                    material = p_data.get("material") or ""
                    dims = p_data.get("dimensions") or ""
                    base = float(p_data.get("base_price") or 0.0)
                    sale = float(p_data.get("sale_price") or 0.0)
                    status = p_data.get("status") or "Active"
                    
                    if code in existing_prices:
                        db_price = existing_prices[code]
                        if db_price.sale_price != sale or db_price.cabinet_name != name or db_price.material != material:
                            db_price.cabinet_name = name
                            db_price.material = material
                            db_price.dimensions = dims
                            db_price.base_price = base
                            db_price.sale_price = sale
                            db_price.status = status
                            update_count += 1
                    else:
                        db_price = CabinetPrice(
                            cabinet_code=code,
                            cabinet_name=name,
                            material=material,
                            dimensions=dims,
                            base_price=base,
                            sale_price=sale,
                            status=status
                        )
                        db.add(db_price)
                        new_count += 1
                
                db.commit()
                print(f"Cabinet prices sync success: {new_count} new, {update_count} updated.")
            else:
                print("No temp cabinet prices found to sync.")
        except Exception as sync_err:
            db.rollback()
            print(f"Auto-sync cabinet prices error: {sync_err}")

        # [AUTO-MIGRATION] Chatbot histories sessions self-healing schema update
        try:
            print("Checking and upgrading chatbot_histories table schema...")
            # Check and add session_id
            db.execute(text("""
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chatbot_histories') AND name = 'session_id')
                BEGIN
                    ALTER TABLE chatbot_histories ADD session_id NVARCHAR(100) NULL;
                END
            """))
            # Check and add session_title
            db.execute(text("""
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chatbot_histories') AND name = 'session_title')
                BEGIN
                    ALTER TABLE chatbot_histories ADD session_title NVARCHAR(200) NULL;
                END
            """))
            # Backfill NULL session_ids to 'default'
            db.execute(text("""
                UPDATE chatbot_histories SET session_id = 'default' WHERE session_id IS NULL;
            """))
            db.commit()
            print("Successfully processed chatbot_histories schema updates.")
        except Exception as schema_err:
            db.rollback()
            print(f"Chatbot histories schema updates migration error: {schema_err}")

        # [AUTO-MIGRATION] ISO documents and processes level schema update
        try:
            print("Checking and upgrading iso_documents and iso_processes tables schema...")
            # Check and add document_level to iso_documents
            db.execute(text("""
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('iso_documents') AND name = 'document_level')
                BEGIN
                    ALTER TABLE iso_documents ADD document_level NVARCHAR(100) NULL;
                END
            """))
            # Check and add document_level to iso_processes
            db.execute(text("""
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('iso_processes') AND name = 'document_level')
                BEGIN
                    ALTER TABLE iso_processes ADD document_level NVARCHAR(100) NULL;
                END
            """))
            db.commit()
            print("Successfully processed iso_documents & iso_processes schema updates.")
        except Exception as schema_err:
            db.rollback()
            print(f"ISO documents/processes schema updates migration error: {schema_err}")






            

    except Exception as e:

        print(f"Migration error: {e}")

    finally:

        db.close()



    yield



# Create database tables

Base.metadata.create_all(bind=engine)



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
                                
                                if screen_key:
                                    # Phân giải quyền thực tế của User cho screen này
                                    resolved_perms = resolve_user_permissions(user, db)
                                    user_perm = resolved_perms.get(screen_key, "none")
                                    
                                    # Phân tích danh sách các hành động được cho phép
                                    allowed_actions_list = []
                                    if user_perm:
                                        if "," in user_perm:
                                            allowed_actions_list = [p.strip() for p in user_perm.split(",") if p.strip()]
                                        else:
                                            legacy_rank_map = {
                                                "none": [],
                                                "read": ["read"],
                                                "create": ["read", "create"],
                                                "edit": ["read", "create", "edit"],
                                                "delete": ["read", "create", "edit", "delete"],
                                                "approve": ["read", "create", "edit", "delete", "approve"],
                                                "export_import": ["read", "create", "edit", "delete", "approve", "export_import"],
                                                "write": ["read", "create", "edit", "delete", "approve", "export_import"],
                                            }
                                            allowed_actions_list = legacy_rank_map.get(user_perm, [])

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



# Include API Router

app.include_router(api_router, prefix="/api/v1")



# [TEST] Hỗ trợ login trực tiếp không cần /api/v1 theo yêu cầu người dùng

from modules.auth.routes import account_router

app.include_router(account_router.router, prefix="/accounts", tags=["test_accounts"])



# Mount static files for uploads - Sử dụng BackEnd/static
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")



# [NEW] Cấu hình Production Mode: Phân phối giao diện từ Backend

from fastapi.responses import FileResponse



MOBILE_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "Mobile", "dist"))

DASHBOARD_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist"))



# 1. Toàn bộ file tĩnh và giao diện sẽ được xử lý bởi hàm serve_ui bên dưới



# 2. Logic phục vụ giao diện (SPA Serving Logic)

from fastapi import Request



@app.get("/{full_path:path}")

async def serve_ui(request: Request, full_path: str):

    # Loại trừ các đường dẫn hệ thống

    if full_path.startswith(("api/", "static/", "accounts/")):

        raise HTTPException(status_code=404)



    # Nhận diện tên miền và nguồn gốc (referer) để phục vụ đúng UI (Dashboard vs Mobile)

    host = request.headers.get("host", "").lower()

    referer = request.headers.get("referer", "").lower()

    

    is_dashboard = (

        "dashboard" in host or 

        "/dashboard" in referer or 

        full_path.startswith("dashboard")

    )

    

    # Nếu được xác định là Dashboard

    if is_dashboard:

        # Xử lý đường dẫn cho Dashboard

        clean_path = full_path.replace("dashboard/", "", 1) if full_path.startswith("dashboard/") else full_path

        if clean_path == "dashboard": clean_path = ""

        

        target_file = os.path.join(DASHBOARD_DIST, clean_path)

        if os.path.isfile(target_file):

            return FileResponse(target_file)

        

        # Fallback về index.html của Dashboard

        index_dashboard = os.path.join(DASHBOARD_DIST, "index.html")

        if os.path.exists(index_dashboard):

            return FileResponse(index_dashboard, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

    

    # Mặc định là Mobile

    if os.path.isfile(target_file):
        if full_path.endswith("index.html"):
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


