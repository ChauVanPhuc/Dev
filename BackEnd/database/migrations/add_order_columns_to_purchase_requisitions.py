import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def run_migration():
    """Add missing columns to purchase_requisitions table and seed initial real orders."""
    db = next(get_db())
    try:
        columns_to_add = [
            ("priority", "NVARCHAR(50) DEFAULT 'Bình thường'"),
            ("reviewer", "NVARCHAR(100) NULL"),
            ("reviewed_at", "DATETIME NULL"),
            ("material_type", "NVARCHAR(100) NULL"),
            ("est_completion_date", "DATETIME NULL"),
            ("real_completion_date", "DATETIME NULL"),
            ("production_date", "DATETIME NULL"),
            ("warehouse_in_date", "DATETIME NULL"),
            ("storage_date", "DATETIME NULL"),
            ("warehouse_out_date", "DATETIME NULL"),
            ("completed_date", "DATETIME NULL")
        ]

        for col_name, col_def in columns_to_add:
            check_sql = text(f"""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'purchase_requisitions' 
                AND COLUMN_NAME = '{col_name}'
            """)
            exists = db.execute(check_sql).fetchone()[0]
            if exists == 0:
                print(f"Adding column '{col_name}' to purchase_requisitions...")
                db.execute(text(f"ALTER TABLE purchase_requisitions ADD {col_name} {col_def}"))
                db.commit()
                print(f"[OK] Added column '{col_name}'.")

        print("[SUCCESS] All purchase_requisitions columns are up to date.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
