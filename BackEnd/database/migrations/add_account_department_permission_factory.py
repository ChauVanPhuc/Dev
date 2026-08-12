"""
Migration: Add department_id, permission_id, factory_id, factory_name to accounts table
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Add department/permission/factory columns to accounts table if they don't exist"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

        columns_to_add = {
            'department_id': 'INT NULL',
            'permission_id': 'INT NULL',
            'factory_id': 'INT NULL',
            'factory_name': 'NVARCHAR(100) NULL',
        }

        with engine.connect() as conn:
            for col_name, col_type in columns_to_add.items():
                check_sql = text(f"""
                    SELECT COUNT(*) as count
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'accounts'
                    AND COLUMN_NAME = '{col_name}'
                """)
                result = conn.execute(check_sql).fetchone()

                if result[0] == 0:
                    print(f"Adding {col_name} column to accounts table...")
                    conn.execute(text(f"ALTER TABLE accounts ADD {col_name} {col_type}"))
                    conn.commit()
                    print(f"[OK] Added column: {col_name}")
                else:
                    print(f"[SKIP] Column {col_name} already exists")

            print("\n[OK] Migration completed successfully!")

    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
