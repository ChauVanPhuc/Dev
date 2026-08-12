"""
Migration: Hide Quản lý chức vụ from system_sidebars because the route was removed.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

        with engine.begin() as conn:
            result = conn.execute(text("""
                UPDATE system_sidebars
                SET is_active = 0
                WHERE title = N'Quản lý chức vụ' AND route_path = '/admin/users/positions';
            """))
            print(f"[OK] Hidden 'Quản lý chức vụ' from sidebar (rows={result.rowcount}).")

    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
