# -*- coding: utf-8 -*-
"""
SmartFlow ERP - Database Migration Shortcut
Lệnh chạy nhanh: python run_db_migration.py
"""
import os
import sys

# Forward directly to the production migration runner
migration_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "BackEnd", "database", "migrations", "run_production_v5_migration.py")

if __name__ == "__main__":
    if os.path.exists(migration_script):
        with open(migration_script, "r", encoding="utf-8") as f:
            code = f.read()
        exec(code, {"__name__": "__main__", "__file__": migration_script})
    else:
        print(f"[ERROR] Không tìm thấy file: {migration_script}")
        sys.exit(1)

