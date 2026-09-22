import sys
# Reload triggered for SQL Server exclude_ids fix
import os
import asyncio
# Reload trigger for AI OCR 4-worker parallel speedup v4

if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
claim_path = os.path.abspath(os.path.join(backend_path, ".."))
root_path = os.path.abspath(os.path.join(claim_path, ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if claim_path not in sys.path:
    sys.path.insert(0, claim_path)
if root_path not in sys.path:
    sys.path.insert(0, root_path)

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

import mimetypes
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import colorama
from sqlalchemy import text

mimetypes.add_type('application/vnd.android.package-archive', '.apk')

from app.shared.banner import print_banner
from app.routes import api_router
from app.core.database import engine, SessionLocal, Base
from app import models  # Ensure all active models are imported

colorama.init(autoreset=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    import anyio
    try:
        limiter = anyio.to_thread.current_default_thread_limiter()
        limiter.total_tokens = 800
        print(f"Set AnyIO thread pool limit to: {limiter.total_tokens}")
    except Exception as thread_err:
        print(f"Error setting AnyIO thread pool: {thread_err}")

    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    claim_path = os.path.abspath(os.path.join(backend_path, ".."))
    root_path = os.path.abspath(os.path.join(claim_path, ".."))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    if claim_path not in sys.path:
        sys.path.insert(0, claim_path)
    if root_path not in sys.path:
        sys.path.insert(0, root_path)

    print_banner()

    # [DATABASE SCHEMA INITIALIZATION]
    try:
        Base.metadata.create_all(bind=engine)
        print("Database schema verified/created successfully.")
    except Exception as db_init_err:
        print(f"[DB ERROR] Error connecting or initializing database tables: {db_init_err}")

    # [LPN CRAWLER INITIALIZATION]
    try:
        from lpn_crawler.database.init_db import init_lpn_tables
        init_lpn_tables()
    except Exception as lpn_init_err:
        print(f"LPN Crawler startup warning: {lpn_init_err}")

    db = SessionLocal()
    try:
        # [AUTO-MIGRATION] Defect Classification Columns & Table
        try:
            print("Checking for defect classification columns & tables...")
            try:
                db.execute(text("ALTER TABLE defect_types ADD code NVARCHAR(50) NULL"))
                db.commit()
                db.execute(text("CREATE UNIQUE INDEX ix_defect_types_code ON defect_types (code) WHERE code IS NOT NULL"))
                db.commit()
                print("Successfully checked 'code' column in defect_types.")
            except Exception:
                db.rollback()

            try:
                db.execute(text("ALTER TABLE defect_types ADD aql_class NVARCHAR(50) NULL"))
                db.commit()
                print("Successfully checked 'aql_class' column in defect_types.")
            except Exception:
                db.rollback()

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
                print("Successfully created client_defects table.")
        except Exception as e:
            db.rollback()
            print(f"Failed to auto-migrate defect classification: {e}")

        # [AUTO-SYNC] Synchronize cabinet prices from temp JSON to DB
        try:
            print("Running auto-sync for cabinet prices from temp JSON to DB...")
            from app.modules.price.sync_service import sync_temp_cabinet_prices_to_db
            new_count, update_count = sync_temp_cabinet_prices_to_db(db)
            print(f"Cabinet prices sync success: {new_count} new, {update_count} updated.")
        except Exception as sync_err:
            db.rollback()
            print(f"Auto-sync cabinet prices error: {sync_err}")

        # [DATA DIRECTORIES & DAILY BACKUP] Ensure directories and export daily JSON snapshot
        try:
            from app.core.path_manager import ensure_data_directories
            from app.core.backup_service import run_daily_backup
            ensure_data_directories()
            run_daily_backup(db)
        except Exception as backup_err:
            print(f"Data backup startup warning: {backup_err}")

        # [AI OCR BACKGROUND WARMUP] Khởi động trước OCR engine trong background để triệt tiêu 7-8s cold-start
        try:
            import threading
            def _bg_warmup():
                try:
                    from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline
                    pipe = get_default_pipeline()
                    pipe.ocr_engine.warmup()
                    print("[AI OCR] Background warmup completed successfully.")
                except Exception as we:
                    print(f"[AI OCR] Background warmup note: {we}")
            threading.Thread(target=_bg_warmup, daemon=True).start()
        except Exception as ocr_err:
            print(f"[AI OCR] Startup warmup launcher error: {ocr_err}")

    except Exception as e:
        print(f"Startup initialization error: {e}")
    finally:
        db.close()

    yield

app = FastAPI(
    title="SmartFlow Claim_v2 Backend API",
    description="Backend API for SmartFlow Claim_v2",
    version="2.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "Claim_v2"}

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(api_router, prefix="/api/v1")

# Route alias cho các module frontend gọi trực tiếp /api/ai-ocr
try:
    from lpn_crawler.ai_ocr_train.api.router import router as ai_ocr_direct_router
    app.include_router(ai_ocr_direct_router, prefix="/api")
except Exception as _e:
    logging.getLogger("ai_ocr").warning(f"Không thể mount direct ai_ocr_router: {_e}")

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

LPN_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "lpn_crawler", "storage", "images"))
if not os.path.exists(LPN_IMAGES_DIR):
    LPN_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "lpn_crawler", "storage", "images"))
if not os.path.exists(LPN_IMAGES_DIR):
    os.makedirs(LPN_IMAGES_DIR, exist_ok=True)
app.mount("/static/lpn_crawler/images", StaticFiles(directory=LPN_IMAGES_DIR), name="lpn_images")


FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist"))

@app.get("/{full_path:path}")
async def serve_ui(request: Request, full_path: str):
    if full_path.startswith(("api/", "static/")):
        raise HTTPException(status_code=404)

    target_file = os.path.join(FRONTEND_DIST, full_path)
    if os.path.isfile(target_file):
        return FileResponse(target_file)

    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

    return {"message": "SmartFlow Claim_v2 API is running with live LPN Crawler Telemetry."}
