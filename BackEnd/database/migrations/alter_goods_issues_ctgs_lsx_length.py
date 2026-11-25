# -*- coding: utf-8 -*-
"""
Migration an toàn (Idempotent):
Nới rộng cột goods_issues.ctgs và goods_issue_items.lsx từ NVARCHAR(100) lên NVARCHAR(500)
để hỗ trợ lưu nhiều mã PO/LSX trên cùng 1 phiếu bàn giao kho (/warehouse/handover/new).
"""
import os
import sys

# Thêm thư mục BackEnd vào sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import text
from config.database import engine


def run_migration():
    targets = [
        ("goods_issues", "ctgs", 500),
        ("goods_issue_items", "lsx", 500),
    ]
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            for table_name, col_name, target_len in targets:
                row = conn.execute(
                    text("""
                        SELECT CHARACTER_MAXIMUM_LENGTH
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = :tbl AND COLUMN_NAME = :col
                    """),
                    {"tbl": table_name, "col": col_name},
                ).fetchone()

                if not row:
                    print(f"[SKIP] Không tìm thấy cột {table_name}.{col_name}")
                    continue

                cur_len = row[0]
                if cur_len is not None and cur_len != -1 and cur_len < target_len:
                    conn.execute(
                        text(f"ALTER TABLE [{table_name}] ALTER COLUMN [{col_name}] NVARCHAR({target_len}) NULL")
                    )
                    print(f"[OK] Đã nâng {table_name}.{col_name}: NVARCHAR({cur_len}) -> NVARCHAR({target_len})")
                else:
                    print(f"[SKIP] {table_name}.{col_name} đã đạt độ dài {cur_len}")

            trans.commit()
            print("[DONE] Migration hoàn tất thành công.")
        except Exception as exc:
            trans.rollback()
            print(f"[ERROR] Migration thất bại, đã rollback: {exc}")
            raise


if __name__ == "__main__":
    run_migration()

