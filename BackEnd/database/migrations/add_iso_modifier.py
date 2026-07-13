"""
Migration: Add modifier column to iso_revision_logs table
"""

import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def add_columns():
    """Add modifier column to iso_revision_logs table"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if columns already exist
            check_query = text("""
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'iso_revision_logs' 
                AND COLUMN_NAME = 'modifier'
            """)
            result = conn.execute(check_query).fetchone()
            
            if result[0] > 0:
                print("[WARN] Column already exists, skipping migration")
                return
            
            # Add new column
            print("Adding modifier column to iso_revision_logs table...")
            
            conn.execute(text("ALTER TABLE iso_revision_logs ADD modifier NVARCHAR(100) NULL"))
            print("[OK] Added column: modifier")
            
            conn.commit()
            print("[OK] Migration completed successfully!")
            
    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")

if __name__ == "__main__":
    add_columns()
