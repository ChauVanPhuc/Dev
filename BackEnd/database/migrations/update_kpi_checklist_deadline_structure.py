# -*- coding: utf-8 -*-
"""
Migration:
1. Xóa toàn bộ dữ liệu hiện có trong bảng kpi_checklists và reset identity seed.
2. Thêm các cột phục vụ phân loại 'Cố định' (FIXED) và 'Thời hạn' (DEADLINE: lặp lại chu kỳ hoặc 1 lần ngày/tuần/tháng).
"""
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text, inspect
from config.database import engine

def migrate():
    print("[MIGRATION] Bắt đầu nâng cấp cấu trúc bảng kpi_checklists và làm sạch dữ liệu...")

    columns_to_add = [
        ("checklist_type", "NVARCHAR(20) DEFAULT 'FIXED'"),
        ("deadline_mode", "NVARCHAR(20) NULL"),
        ("recurring_cycle", "NVARCHAR(20) NULL"),
        ("recurring_day_of_week", "NVARCHAR(50) NULL"),
        ("recurring_day_of_month", "INT NULL"),
        ("once_period_type", "NVARCHAR(20) NULL"),
        ("due_date", "NVARCHAR(50) NULL"),
        ("target_week", "NVARCHAR(20) NULL"),
        ("target_month", "NVARCHAR(20) NULL"),
        ("due_time", "NVARCHAR(10) NULL"),
        ("priority", "NVARCHAR(20) DEFAULT 'MEDIUM'")
    ]

    # 1. Kiểm tra các cột hiện có trước khi mở transaction
    insp = inspect(engine)
    existing_cols = [c['name'].lower() for c in insp.get_columns('kpi_checklists')]

    with engine.begin() as conn:
        # 2. Xóa toàn bộ dữ liệu kpi_checklists
        try:
            conn.execute(text("DELETE FROM kpi_checklists"))
            print("[CLEAN] Đã xóa toàn bộ bản ghi cũ trong kpi_checklists.")
            try:
                conn.execute(text("DBCC CHECKIDENT ('kpi_checklists', RESEED, 0)"))
                print("[RESEED] Đã reset IDENTITY seed của kpi_checklists về 0.")
            except Exception as e:
                print(f"[RESEED INFO] Không cần reset identity hoặc đã ở mức 0: {e}")
        except Exception as e:
            print(f"[CLEAN ERROR] Lỗi khi dọn dẹp kpi_checklists: {e}")

        # 3. Thêm các cột mới nếu chưa có
        for col_name, col_def in columns_to_add:
            if col_name.lower() not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE kpi_checklists ADD {col_name} {col_def}"))
                    print(f"[ADD COLUMN] Đã thêm cột '{col_name}' vào kpi_checklists.")
                except Exception as ex:
                    print(f"[ADD COLUMN ERROR] Lỗi khi thêm cột '{col_name}': {ex}")
            else:
                print(f"[EXIST] Cột '{col_name}' đã tồn tại.")

    print("[SUCCESS] Hoàn thành migration nâng cấp kpi_checklists!")

if __name__ == "__main__":
    migrate()
