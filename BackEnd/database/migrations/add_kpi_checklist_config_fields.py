# -*- coding: utf-8 -*-
"""
Migration:
Thêm các trường cấu hình chuyên sâu vào bảng kpi_checklists:
- target_role: Vị trí áp dụng (ALL, INSPECTOR, LEADER, MANAGER)
- weight_score: Điểm trọng số KPI khi hoàn thành (mặc định 10)
- evidence_type: Yêu cầu bằng chứng (NONE, PHOTO, FILE, NUMERIC)
- guide_code: Mã tiêu chuẩn kiểm tra / HDKT tham chiếu
- is_active: Trạng thái hiệu lực áp dụng (1 - Áp dụng, 0 - Tạm khóa)
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
    print("[MIGRATION] Bắt đầu bổ sung các trường cấu hình chuyên sâu vào kpi_checklists...")

    columns_to_add = [
        ("target_role", "NVARCHAR(100) DEFAULT 'ALL'"),
        ("weight_score", "INT DEFAULT 10"),
        ("evidence_type", "NVARCHAR(50) DEFAULT 'NONE'"),
        ("guide_code", "NVARCHAR(100) NULL"),
        ("is_active", "BIT DEFAULT 1")
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

    print("[SUCCESS] Hoàn thành migration bổ sung trường cấu hình kpi_checklists!")

if __name__ == "__main__":
    migrate()
