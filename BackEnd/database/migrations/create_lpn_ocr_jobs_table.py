"""
Migration script to create table 'lpn_ocr_jobs' for persistent AI OCR background queue.
"""
import sys
import os
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import engine


def run_migration():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("--- Checking and creating 'lpn_ocr_jobs' table ---")
            table_check = conn.execute(text("""
                SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = 'lpn_ocr_jobs'
            """)).fetchone()

            if table_check:
                print("[INFO] Table 'lpn_ocr_jobs' already exists. Checking columns...")
                cols = {
                    row[0].lower()
                    for row in conn.execute(text(
                        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lpn_ocr_jobs'"
                    )).fetchall()
                }
                expected_cols = [
                    ("container_number", "VARCHAR(100) NULL"),
                    ("attempts", "INT NOT NULL DEFAULT 0"),
                    ("total_items", "INT NULL DEFAULT 0"),
                    ("processed_items", "INT NULL DEFAULT 0"),
                    ("matched_items", "INT NULL DEFAULT 0"),
                    ("payload_json", "NVARCHAR(MAX) NULL"),
                    ("target_phone", "VARCHAR(50) NULL"),
                    ("worker_id", "VARCHAR(100) NULL"),
                    ("last_error", "NVARCHAR(MAX) NULL"),
                    ("started_at", "DATETIME NULL"),
                    ("heartbeat_at", "DATETIME NULL"),
                    ("finished_at", "DATETIME NULL"),
                ]
                for col_name, col_def in expected_cols:
                    if col_name not in cols:
                        conn.execute(text(f"ALTER TABLE lpn_ocr_jobs ADD {col_name} {col_def}"))
                        print(f"[OK] Added column '{col_name}' to 'lpn_ocr_jobs'.")
            else:
                conn.execute(text("""
                    CREATE TABLE lpn_ocr_jobs (
                        id BIGINT IDENTITY(1,1) PRIMARY KEY,
                        container_id BIGINT NOT NULL,
                        container_number VARCHAR(100) NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending',
                        attempts INT NOT NULL DEFAULT 0,
                        total_items INT NULL DEFAULT 0,
                        processed_items INT NULL DEFAULT 0,
                        matched_items INT NULL DEFAULT 0,
                        payload_json NVARCHAR(MAX) NULL,
                        target_phone VARCHAR(50) NULL,
                        worker_id VARCHAR(100) NULL,
                        last_error NVARCHAR(MAX) NULL,
                        created_at DATETIME DEFAULT GETUTCDATE(),
                        started_at DATETIME NULL,
                        heartbeat_at DATETIME NULL,
                        finished_at DATETIME NULL
                    )
                """))
                print("[OK] Created table 'lpn_ocr_jobs' successfully.")

            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_lpn_ocr_jobs_status_created'
                      AND object_id = OBJECT_ID('lpn_ocr_jobs')
                )
                CREATE INDEX IX_lpn_ocr_jobs_status_created ON lpn_ocr_jobs (status, created_at)
            """))
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_lpn_ocr_jobs_container_status'
                      AND object_id = OBJECT_ID('lpn_ocr_jobs')
                )
                CREATE INDEX IX_lpn_ocr_jobs_container_status ON lpn_ocr_jobs (container_id, status)
            """))
            print("[OK] Ensured composite indexes on 'lpn_ocr_jobs'.")

            trans.commit()
            print("[SUCCESS] Migration for 'lpn_ocr_jobs' completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Migration 'lpn_ocr_jobs' failed: {e}")
            raise


def run():
    run_migration()


if __name__ == "__main__":
    run_migration()
