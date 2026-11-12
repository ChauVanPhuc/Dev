import os
import sys
from sqlalchemy import text

# Add BackEnd and root folders to PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import engine


def migrate_daily_inspection_is_deleted():
    """
    Thêm cột is_deleted (BIT NULL DEFAULT 0) vào bảng daily_inspection_records nếu chưa tồn tại
    và gán mặc định 0 cho các bản ghi hiện có.
    """
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                check_sql = text("""
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'daily_inspection_records'
                      AND COLUMN_NAME = 'is_deleted'
                """)
                existing = conn.execute(check_sql).fetchone()
                if existing:
                    print("Column 'is_deleted' already exists in 'daily_inspection_records'.")
                    updated = conn.execute(text("""
                        UPDATE daily_inspection_records
                        SET is_deleted = 0
                        WHERE is_deleted IS NULL
                    """)).rowcount
                    if updated:
                        print(f"Updated {updated} NULL rows in 'daily_inspection_records.is_deleted' to 0.")
                    trans.commit()
                    return

                conn.execute(text("""
                    ALTER TABLE daily_inspection_records
                    ADD is_deleted BIT NULL CONSTRAINT DF_daily_inspection_records_is_deleted DEFAULT 0
                """))
                updated = conn.execute(text("""
                    UPDATE daily_inspection_records
                    SET is_deleted = 0
                    WHERE is_deleted IS NULL
                """)).rowcount
                trans.commit()
                print(f"SUCCESS: Added 'is_deleted' to 'daily_inspection_records' and initialized {updated} rows to 0.")
            except Exception as inner_err:
                trans.rollback()
                print(f"ERROR during migration of daily_inspection_records.is_deleted: {inner_err}")
                raise
    except Exception as e:
        print(f"FATAL: Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    migrate_daily_inspection_is_deleted()

