import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.main
from config.database import engine
from sqlalchemy import text, inspect

# Danh sách các bảng GIỮ LẠI (Tài khoản, Sidebar, Cấu trúc nhà máy, Công đoạn gốc)
KEEP_TABLES = {
    'accounts',
    'roles',
    'role_permission',
    'permissions',
    'permission_stage',
    'departments',
    'hr_factory_structures',
    'system_sidebars',
    'stages'
}

def clear_business_data():
    inspector = inspect(engine)
    all_tables = set(inspector.get_table_names())
    tables_to_clear = [t for t in all_tables if t not in KEEP_TABLES]

    print(f"=== ĐANG DỌN DẸP DỮ LIỆU NGHIỆP VỤ ({len(tables_to_clear)} bảng) ===")

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Tắt FK checks tạm thời tùy thuộc DB (MS SQL Server)
            conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';"))

            cleared_counts = {}
            for t in tables_to_clear:
                try:
                    count_before = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                    if count_before > 0:
                        conn.execute(text(f"DELETE FROM [{t}]"))
                        cleared_counts[t] = count_before
                except Exception as ex:
                    print(f"Lỗi khi xóa bảng [{t}]: {ex}")

            # Bật lại FK constraints
            conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';"))
            trans.commit()

            print("\n=== ĐÃ XÓA THÀNH CÔNG DỮ LIỆU NGHIỆP VỤ ===")
            for t, cnt in cleared_counts.items():
                print(f"  - [{t}]: Đã xóa {cnt} bản ghi")

            print("\n=== THỐNG KÊ BẢNG GIỮ LẠI (KEEP) ===")
            for kt in sorted(KEEP_TABLES):
                if kt in all_tables:
                    cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{kt}]")).scalar()
                    print(f"  - [{kt}]: {cnt} bản ghi (AN TOÀN)")

        except Exception as e:
            trans.rollback()
            print(f"LỖI TRANSACTION: {e}")

if __name__ == "__main__":
    clear_business_data()
