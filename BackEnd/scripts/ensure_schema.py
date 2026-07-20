# -*- coding: utf-8 -*-
"""
Tự động đồng bộ schema SQL Server với SQLAlchemy models:
- Tạo các bảng còn thiếu
- Thêm các cột còn thiếu vào bảng đã có
Chạy: python scripts/ensure_schema.py [--dry-run]
"""
import argparse
import os
import sys

# Đảm bảo import được app và config từ thư mục BackEnd
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import inspect, text
from app.models import Base
from config.database import engine


def quote(name):
    return f"[{name}]"


def compile_type(col):
    return str(col.type.compile(dialect=engine.dialect))


def ensure_tables(dry_run):
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    model_tables = list(Base.metadata.tables.values())
    missing = [t for t in model_tables if t.name not in existing]
    if missing:
        print(f"[INFO] {len(missing)} table(s) missing: {[t.name for t in missing]}")
        if dry_run:
            for t in missing:
                print(f"[DRY] Would create table {t.name}")
            return
        # create_all sẽ tạo các bảng còn thiếu theo đúng thứ tự phụ thuộc FK
        Base.metadata.create_all(engine, checkfirst=True)
        print(f"[OK] Created/verified tables")
    else:
        print("[INFO] No missing tables")


def ensure_columns(dry_run):
    inspector = inspect(engine)
    changes = 0
    for table in Base.metadata.tables.values():
        try:
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
        except Exception as e:
            print(f"[WARN] Could not inspect {table.name}: {e}")
            continue
        for col in table.columns:
            if col.name in existing_cols:
                continue
            changes += 1
            col_type = compile_type(col)
            nullable_str = "NULL" if col.nullable else "NOT NULL"
            sql = f"ALTER TABLE {quote(table.name)} ADD {quote(col.name)} {col_type} {nullable_str}"
            print(f"[{'DRY' if dry_run else 'RUN'}] Missing column {table.name}.{col.name}: {col_type} (nullable={col.nullable})")
            if dry_run:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(text(sql))
            except Exception as e:
                if not col.nullable:
                    print(f"[WARN] {e}; retrying as NULL")
                    try:
                        with engine.begin() as conn:
                            null_sql = f"ALTER TABLE {quote(table.name)} ADD {quote(col.name)} {col_type} NULL"
                            conn.execute(text(null_sql))
                            # Nếu bảng rỗng thì set NOT NULL ngay
                            cnt = conn.execute(text(f"SELECT COUNT(*) FROM {quote(table.name)}")).scalar()
                            if cnt == 0:
                                conn.execute(text(f"ALTER TABLE {quote(table.name)} ALTER COLUMN {quote(col.name)} {col_type} NOT NULL"))
                            else:
                                print(f"[WARN] {table.name} has {cnt} rows; leaving {col.name} NULL. Manual data migration required.")
                    except Exception as e2:
                        print(f"[ERROR] Failed to add {table.name}.{col.name}: {e2}")
                        raise
                else:
                    print(f"[ERROR] Failed to add {table.name}.{col.name}: {e}")
                    raise
    if changes == 0:
        print("[INFO] No missing columns")
    else:
        print(f"[OK] Processed {changes} missing column(s)")


def main():
    parser = argparse.ArgumentParser(description="Đồng bộ SQL Server schema với SQLAlchemy models")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ hiển thị các bảng/cột còn thiếu mà không thay đổi DB")
    args = parser.parse_args()

    print("=" * 60)
    print("[START] Schema sync")
    print("=" * 60)
    ensure_tables(args.dry_run)
    ensure_columns(args.dry_run)
    print("=" * 60)
    print("[DONE] Schema sync finished")


if __name__ == "__main__":
    main()
