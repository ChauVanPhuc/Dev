import sys
import os
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        # Check if reporter column already exists
        check_sql = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'screen_bugs' 
            AND COLUMN_NAME = 'reporter'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result:
            print("[SKIP] Column 'reporter' already exists in screen_bugs table.")
            return
        
        # Add reporter column
        alter_sql = text("""
            ALTER TABLE screen_bugs 
            ADD reporter NVARCHAR(100) NULL
        """)
        db.execute(alter_sql)
        db.commit()
        print("[OK] Added 'reporter' column to screen_bugs table.")
        
    except Exception as e:
        print(f"[ERROR] Failed to add reporter column: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
