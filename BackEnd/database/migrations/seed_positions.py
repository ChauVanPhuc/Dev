"""
Migration: Reset permissions table and seed 4 base positions (Vị trí)
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Clear permissions and insert 4 base positions."""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

        positions = [
            ("Quản lý", "Vị trí quản lý"),
            ("Nhân viên", "Vị trí nhân viên"),
            ("Trưởng phòng", "Vị trí trưởng phòng"),
            ("Phó phòng", "Vị trí phó phòng"),
        ]

        with engine.begin() as conn:
            print("Clearing permission associations...")
            conn.execute(text("DELETE FROM role_permission"))
            conn.execute(text("DELETE FROM permission_stage"))

            print("Clearing permissions table...")
            conn.execute(text("DELETE FROM permissions"))

            print("Seeding 4 base positions...")
            for name, desc in positions:
                conn.execute(
                    text("INSERT INTO permissions (name, description, is_active) VALUES (:name, :desc, 1)"),
                    {"name": name, "desc": desc}
                )

            print("[OK] Permissions reset and seeded successfully!")

    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
