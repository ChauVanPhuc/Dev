import sys
import os
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal

def add_images_column():
    db = SessionLocal()
    try:
        # Check if images column already exists in defect_types
        check_sql = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'defect_types' 
            AND COLUMN_NAME = 'images'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result:
            print("Column 'images' already exists in defect_types table. Skipping migration.")
            return
        
        # Add images column (NVARCHAR(MAX) to store JSON array of image URLs)
        alter_sql = text("""
            ALTER TABLE defect_types 
            ADD images NVARCHAR(MAX) NULL
        """)
        db.execute(alter_sql)
        db.commit()
        print("SUCCESS: Added 'images' column to defect_types table.")
        
    except Exception as e:
        print(f"ERROR: Failed to add images column: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_images_column()
