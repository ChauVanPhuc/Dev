import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import get_db


def add_master_product_materials_columns():
    """Bổ sung các cột stt, group_type, color vào bảng master_product_materials nếu chưa có."""
    db = next(get_db())
    try:
        # Check existing columns in master_product_materials
        columns_res = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'master_product_materials'
        """)).fetchall()
        existing_cols = [c[0].lower() for c in columns_res]

        if 'stt' not in existing_cols:
            db.execute(text("ALTER TABLE master_product_materials ADD stt INT DEFAULT 1"))
            print("[OK] Added 'stt' column to master_product_materials.")

        if 'group_type' not in existing_cols:
            db.execute(text("ALTER TABLE master_product_materials ADD group_type NVARCHAR(100) DEFAULT N'VẬT TƯ HÀNG TRẮNG'"))
            print("[OK] Added 'group_type' column to master_product_materials.")

        if 'color' not in existing_cols:
            db.execute(text("ALTER TABLE master_product_materials ADD color NVARCHAR(100)"))
            print("[OK] Added 'color' column to master_product_materials.")

        db.commit()
        print("[OK] Migration master_product_materials completed.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_master_product_materials_columns()
