# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base
from lpn_crawler.backend.models.models import (
    LpnCrawlJob,
    LpnContainer,
    LpnJobContainer,
    LpnItem,
    LpnImage,
    LpnCrawlLog
)

def init_lpn_tables():
    """
    Tự động khởi tạo các bảng lpn_* nếu chưa tồn tại
    và thực hiện Startup Crash Recovery cho các job treo từ lần restart trước.
    """
    try:
        # Tạo bảng nếu chưa có
        Base.metadata.create_all(bind=engine)
        print("LPN Crawler DB tables checked/created successfully.")

        # Đảm bảo các cột lưu tiếng Việt là NVARCHAR(MAX) trong SQL Server và bổ sung Index tăng tốc độ truy vấn
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE lpn_crawl_logs ALTER COLUMN message NVARCHAR(MAX)"))
                conn.execute(text("ALTER TABLE lpn_crawl_logs ALTER COLUMN details NVARCHAR(MAX)"))
                conn.execute(text("ALTER TABLE lpn_crawl_logs ALTER COLUMN container_number NVARCHAR(100)"))
                
                # Tạo các Index hiệu năng cao cho 100k+ bản ghi
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_items_container_id') CREATE INDEX ix_lpn_items_container_id ON lpn_items (container_id)"))
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_items_sku') CREATE INDEX ix_lpn_items_sku ON lpn_items (sku)"))
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_items_lpn') CREATE INDEX ix_lpn_items_lpn ON lpn_items (lpn)"))
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_images_lpn_item_id') CREATE INDEX ix_lpn_images_lpn_item_id ON lpn_images (lpn_item_id)"))
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_images_container_id') CREATE INDEX ix_lpn_images_container_id ON lpn_images (container_id)"))
                conn.execute(text("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_lpn_containers_date_loading') CREATE INDEX ix_lpn_containers_date_loading ON lpn_containers (date_loading)"))
                conn.commit()
        except Exception:
            pass

        # Recovery: Chuyển các job trạng thái 'running' dở dang sang 'interrupted'
        db = SessionLocal()
        try:
            running_jobs = db.query(LpnCrawlJob).filter(LpnCrawlJob.status == "running").all()
            if running_jobs:
                for job in running_jobs:
                    job.status = "interrupted"
                    job.end_time = datetime.utcnow()
                    job.error_message = "Hệ thống khởi động lại khi job đang chạy (Startup Recovery)"
                db.commit()
                print(f"Startup Recovery: Updated {len(running_jobs)} interrupted crawl jobs.")
        except Exception as rec_err:
            db.rollback()
            print(f"Startup Recovery Warning: {rec_err}")
        finally:
            db.close()

    except Exception as e:
        print(f"Error initializing LPN DB tables: {e}")
