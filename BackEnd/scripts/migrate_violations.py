"""
Migration Script: Thêm các cột mở rộng cho bảng award_disciplines.
Chạy script này để cập nhật cấu trúc bảng hiện có.

Usage: python scripts/migrate_violations.py
"""
import sys
import os

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from sqlalchemy import create_engine, text
from config.settings import settings

def main():
    print("=== Migration: Mở rộng bảng award_disciplines ===")
    print(f"Server: {settings.DB_SERVER}")
    print(f"Database: {settings.DB_NAME}")

    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

    # Danh sách cột cần thêm: (tên_cột, kiểu_dữ_liệu, giá_trị_mặc_định)
    new_columns = [
        ("rule_code", "NVARCHAR(50)", None),
        ("rule_name", "NVARCHAR(255)", None),
        ("severity", "NVARCHAR(50)", None),
        ("employee_id", "NVARCHAR(50)", None),
        ("department", "NVARCHAR(100)", None),
        ("position", "NVARCHAR(100)", None),
        ("section", "NVARCHAR(100)", None),
        ("violation_time", "NVARCHAR(100)", None),
        ("reporter_name", "NVARCHAR(255)", None),
        ("description", "NVARCHAR(1000)", None),
        ("status", "NVARCHAR(50)", "'pending'"),
        ("created_at", "DATETIME", "GETUTCDATE()"),
    ]

    with engine.connect() as conn:
        for col_name, col_type, default_val in new_columns:
            try:
                # Kiểm tra cột đã tồn tại chưa
                check_sql = text("""
                    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'award_disciplines' AND COLUMN_NAME = :col_name
                """)
                result = conn.execute(check_sql, {"col_name": col_name}).fetchone()

                if result[0] > 0:
                    print(f"  [SKIP] Cột '{col_name}' đã tồn tại.")
                    continue

                # Thêm cột mới
                alter_sql = f"ALTER TABLE award_disciplines ADD [{col_name}] {col_type} NULL"
                if default_val:
                    alter_sql += f" DEFAULT {default_val}"
                
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"  [OK]   Đã thêm cột '{col_name}' ({col_type})")
            except Exception as e:
                print(f"  [ERR]  Lỗi khi thêm cột '{col_name}': {e}")

        # Thêm index cho employee_id nếu chưa có
        try:
            idx_check = text("""
                SELECT COUNT(*) FROM sys.indexes 
                WHERE name = 'idx_award_disciplines_employee_id' AND object_id = OBJECT_ID('award_disciplines')
            """)
            idx_result = conn.execute(idx_check).fetchone()
            if idx_result[0] == 0:
                conn.execute(text("CREATE INDEX idx_award_disciplines_employee_id ON award_disciplines(employee_id)"))
                conn.commit()
                print("  [OK]   Đã tạo index cho employee_id")
            else:
                print("  [SKIP] Index employee_id đã tồn tại")
        except Exception as e:
            print(f"  [ERR]  Lỗi khi tạo index: {e}")

    print("\n=== Migration hoàn tất! ===")

if __name__ == "__main__":
    main()
