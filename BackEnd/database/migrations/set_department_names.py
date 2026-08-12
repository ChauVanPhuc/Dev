"""
Migration: Set default name for departments where name is NULL
so dropdowns in HR forms don't show blank entries.
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Set department name from code or default string."""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE departments
                SET name = ISNULL(code, N'Bộ phận ' + CAST(id AS NVARCHAR(10)))
                WHERE name IS NULL;
            """))

            result = conn.execute(text("SELECT @@ROWCOUNT AS rows"))
            updated = result.scalar()
            print(f"[OK] Updated {updated} department(s) with default names.")

    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
