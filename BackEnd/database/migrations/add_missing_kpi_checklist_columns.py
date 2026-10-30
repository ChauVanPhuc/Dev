# -*- coding: utf-8 -*-
"""
Migration (an toàn, KHÔNG xóa dữ liệu):
Bổ sung các cột còn thiếu của bảng kpi_checklists theo model KPIChecklist.
Khắc phục lỗi 500 'Invalid column name ...' ở GET /production-v2/dashboard.
"""
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text, inspect
from config.database import engine

COLUMNS_TO_ADD = [
    ("checklist_type", "NVARCHAR(20) NULL DEFAULT 'FIXED'"),
    ("deadline_mode", "NVARCHAR(20) NULL"),
    ("recurring_cycle", "NVARCHAR(20) NULL"),
    ("recurring_day_of_week", "NVARCHAR(50) NULL"),
    ("recurring_day_of_month", "INT NULL"),
    ("once_period_type", "NVARCHAR(20) NULL"),
    ("due_date", "NVARCHAR(50) NULL"),
    ("target_week", "NVARCHAR(20) NULL"),
    ("target_month", "NVARCHAR(20) NULL"),
    ("due_time", "NVARCHAR(10) NULL"),
    ("priority", "NVARCHAR(20) NULL DEFAULT 'MEDIUM'"),
    ("target_role", "NVARCHAR(100) NULL DEFAULT 'ALL'"),
    ("weight_score", "INT NULL DEFAULT 10"),
    ("evidence_type", "NVARCHAR(50) NULL DEFAULT 'NONE'"),
    ("guide_code", "NVARCHAR(100) NULL"),
    ("is_active", "BIT NULL DEFAULT 1"),
    ("evidence_url", "NVARCHAR(1000) NULL"),
    ("performer_note", "NVARCHAR(1000) NULL"),
    ("completed_at", "NVARCHAR(50) NULL"),
]


def migrate():
    existing = {c['name'].lower() for c in inspect(engine).get_columns('kpi_checklists')}
    with engine.begin() as conn:
        for name, definition in COLUMNS_TO_ADD:
            if name.lower() in existing:
                print(f"[EXIST] {name}")
                continue
            conn.execute(text(f"ALTER TABLE kpi_checklists ADD {name} {definition}"))
            print(f"[ADD] {name}")
    print("[SUCCESS] kpi_checklists đã đủ cột.")


if __name__ == "__main__":
    migrate()
