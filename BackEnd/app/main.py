# Reload triggered: Change active device tracking window to 1 minute

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
                ("orders", "plan_id", "ix_orders_plan_id")
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



# [NEW] Gzip compression middleware

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)



# Include API Router

app.include_router(api_router, prefix="/api/v1")



# [TEST] Hỗ trợ login trực tiếp không cần /api/v1 theo yêu cầu người dùng

from modules.auth.routes import account_router

app.include_router(account_router.router, prefix="/accounts", tags=["test_accounts"])



# Mount static files for uploads - Sử dụng đường dẫn tuyệt đối để đảm bảo hoạt động ổn định

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

    target_file = os.path.join(MOBILE_DIST, full_path)

    if os.path.isfile(target_file):

        return FileResponse(target_file)

        

    # Fallback về index.html của Mobile

    index_mobile = os.path.join(MOBILE_DIST, "index.html")

    if os.path.exists(index_mobile):

        return FileResponse(index_mobile, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

        

    return {"message": "ERP_G7 API is running. UI builds not found."}

