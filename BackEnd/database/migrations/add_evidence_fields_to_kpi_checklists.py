# -*- coding: utf-8 -*-
"""
Migration:
Thêm các cột lưu bằng chứng và ghi chú thực hiện vào bảng kpi_checklists:
- evidence_url: NVARCHAR(1000) NULL (Đường link ảnh chụp hiện trường, file biên bản, hoặc chữ ký)
- performer_note: NVARCHAR(1000) NULL (Ghi chú / số liệu đo đạc thực tế của nhân sự khi thực hiện)
- completed_at: NVARCHAR(50) NULL (Thời điểm hoàn thành thực tế)
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
    print("[MIGRATION] Bắt đầu bổ sung các trường evidence vào kpi_checklists...")

    columns_to_add = [
        ("evidence_url", "NVARCHAR(1000) NULL"),
        ("performer_note", "NVARCHAR(1000) NULL"),
        ("completed_at", "NVARCHAR(50) NULL")
    ]

    insp = inspect(engine)
    existing_cols = [c['name'].lower() for c in insp.get_columns('kpi_checklists')]

    with engine.begin() as conn:
        for col_name, col_def in columns_to_add:
            if col_name.lower() not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE kpi_checklists ADD {col_name} {col_def}"))
                    print(f"[ADD COLUMN] Đã thêm cột '{col_name}' thành công.")
                except Exception as e:
                    print(f"[ERROR] Lỗi khi thêm cột '{col_name}': {e}")
            else:
                print(f"[EXIST] Cột '{col_name}' đã tồn tại.")

    print("[SUCCESS] Hoàn thành migration bổ sung trường evidence vào kpi_checklists!")

if __name__ == "__main__":
    migrate()
