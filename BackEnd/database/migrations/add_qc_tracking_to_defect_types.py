import sys
import os
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal

def add_qc_tracking_column():
    db = SessionLocal()
    try:
        # Check if qc_tracking column already exists
        check_sql = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'defect_types' 
            AND COLUMN_NAME = 'qc_tracking'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result:
            print("Column 'qc_tracking' already exists in defect_types table. Skipping migration.")
            return
        
        # Add qc_tracking column
        alter_sql = text("""
            ALTER TABLE defect_types 
            ADD qc_tracking BIT NOT NULL DEFAULT 0
        """)
        db.execute(alter_sql)
        db.commit()
        print("SUCCESS: Added 'qc_tracking' column to defect_types table.")
        
    except Exception as e:
        print(f"ERROR: Failed to add qc_tracking column: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_qc_tracking_column()
