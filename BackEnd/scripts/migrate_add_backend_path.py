"""
Migration script to add 'backend_path' column to 'system_screens' table.
Run this on Production database to fix the missing column error.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from config.database import engine
from sqlalchemy import text

def migrate():
    """Add backend_path column to system_screens table if it doesn't exist."""
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'system_screens' 
            AND COLUMN_NAME = 'backend_path'
        """))
        exists = result.scalar() > 0
        
        if exists:
            print("Column 'backend_path' already exists in 'system_screens' table.")
        else:
            print("Adding 'backend_path' column to 'system_screens' table...")
            conn.execute(text("""
                ALTER TABLE system_screens ADD backend_path NVARCHAR(150) NULL
            """))
            conn.commit()
            print("Successfully added 'backend_path' column.")

if __name__ == "__main__":
    migrate()
