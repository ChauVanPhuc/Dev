import os
import sys
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from config.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('iso_documents') AND name = 'approver_bgd'
            )
            BEGIN
                ALTER TABLE iso_documents ADD approver_bgd NVARCHAR(150) NULL;
            END
        """))
        conn.execute(text("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('iso_processes') AND name = 'approver_bgd'
            )
            BEGIN
                ALTER TABLE iso_processes ADD approver_bgd NVARCHAR(150) NULL;
            END
        """))
        conn.commit()
    print("Migration finished successfully: approver_bgd columns created!")

if __name__ == "__main__":
    run_migration()
