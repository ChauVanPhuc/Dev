import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.database import engine

def migrate_stages_table():
    print("Checking and migrating 'stages' table schema...")
    with engine.connect() as conn:
        # Check existing columns
        result = conn.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'stages'
        """))
        existing_cols = [row[0] for row in result.fetchall()]
        print(f"Existing columns in 'stages': {existing_cols}")

        if 'code' not in existing_cols:
            print("Adding column 'code' to 'stages'...")
            conn.execute(text("ALTER TABLE stages ADD code NVARCHAR(50) NULL"))
            conn.commit()

        if 'sequence' not in existing_cols:
            print("Adding column 'sequence' to 'stages'...")
            conn.execute(text("ALTER TABLE stages ADD sequence INT NOT NULL DEFAULT 0"))
            conn.commit()

        if 'is_active' not in existing_cols:
            print("Adding column 'is_active' to 'stages'...")
            conn.execute(text("ALTER TABLE stages ADD is_active BIT NOT NULL DEFAULT 1"))
            conn.commit()

        print("[OK] 'stages' table migration completed successfully!")

if __name__ == '__main__':
    migrate_stages_table()
