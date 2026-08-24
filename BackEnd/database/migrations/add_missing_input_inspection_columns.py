import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("Starting input_inspections missing columns migration...")
        print("-" * 50)

        columns_to_check = {
            "specification": "NVARCHAR(255) NULL",
            "cont_name": "NVARCHAR(50) NULL",
            "ticket_code": "NVARCHAR(50) NULL",
            "pallet_code": "NVARCHAR(100) NULL",
            "inspection_type": "NVARCHAR(50) DEFAULT 'first_sample'",
            "batch_no": "NVARCHAR(100) NULL",
            "product_sku": "NVARCHAR(255) NULL",
            "part_name": "NVARCHAR(255) NULL",
            "stage": "NVARCHAR(255) NULL",
            "required_qty": "INT DEFAULT 0",
            "sample_qty": "INT DEFAULT 0",
            "error_qty": "INT DEFAULT 0",
            "conclusion": "NVARCHAR(20) DEFAULT 'pass'",
            "inspector_id": "INT NULL",
            "inspector_name": "NVARCHAR(255) NULL",
            "inspected_at": "DATETIME NULL",
            "measured_length": "FLOAT NULL",
            "measured_width": "FLOAT NULL",
            "measured_height": "FLOAT NULL",
            "result": "NVARCHAR(20) DEFAULT 'pass'",
            "note": "NVARCHAR(500) NULL",
            "data_json": "NVARCHAR(MAX) NULL",
            "image_path_1": "NVARCHAR(500) NULL",
            "image_path_2": "NVARCHAR(500) NULL",
            "image_path_3": "NVARCHAR(500) NULL",
            "images_json": "NVARCHAR(MAX) NULL",
            "is_confirmed": "BIT NOT NULL DEFAULT 0",
            "confirmed_at": "DATETIME NULL",
            "confirmed_by": "INT NULL",
            "created_at": "DATETIME NULL DEFAULT GETDATE()"
        }

        for col_name, col_def in columns_to_check.items():
            check_sql = text(f"""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'input_inspections' 
                AND COLUMN_NAME = '{col_name}'
            """)
            exists = db.execute(check_sql).fetchone()[0]
            if exists == 0:
                print(f"[ADDING] Column {col_name} to input_inspections...")
                db.execute(text(f"ALTER TABLE input_inspections ADD {col_name} {col_def}"))
                db.commit()
                print(f"[OK] Added column {col_name}")
            else:
                print(f"[SKIP] Column {col_name} already exists")

        print("-" * 50)
        print("[SUCCESS] All missing columns check/migration completed!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
