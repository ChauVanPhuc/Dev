"""
Migration: Drop HR catalog tables and replace them with auth tables.
Order matters because of foreign key dependencies.
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Drop HR department/position/section tables and their link tables."""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

        with engine.begin() as conn:
            # Drop link tables first to avoid FK conflicts
            conn.execute(text("""
                IF OBJECT_ID('hr_department_positions', 'U') IS NOT NULL
                    DROP TABLE hr_department_positions;
            """))
            conn.execute(text("""
                IF OBJECT_ID('hr_factory_departments', 'U') IS NOT NULL
                    DROP TABLE hr_factory_departments;
            """))
            # Drop catalog tables
            conn.execute(text("""
                IF OBJECT_ID('hr_positions', 'U') IS NOT NULL
                    DROP TABLE hr_positions;
            """))
            conn.execute(text("""
                IF OBJECT_ID('hr_sections', 'U') IS NOT NULL
                    DROP TABLE hr_sections;
            """))
            conn.execute(text("""
                IF OBJECT_ID('hr_departments', 'U') IS NOT NULL
                    DROP TABLE hr_departments;
            """))

            print("[OK] Dropped HR catalog and link tables.")

    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
