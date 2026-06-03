"""
Migration: Add SX confirmation columns to delivery_returns table
Uses the same database connection pattern as other scripts in the project
"""

import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def add_columns():
    """Add SX confirmation columns to delivery_returns table"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if columns already exist
            check_query = text("""
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'delivery_returns' 
                AND COLUMN_NAME = 'sx_confirmed_by'
            """)
            result = conn.execute(check_query).fetchone()
            
            if result[0] > 0:
                print("⚠️ Columns already exist, skipping migration")
                return
            
            # Add new columns
            print("Adding columns to delivery_returns table...")
            
            conn.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_by INT NULL"))
            print("✅ Added column: sx_confirmed_by")
            
            conn.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_at DATETIME NULL"))
            print("✅ Added column: sx_confirmed_at")
            
            conn.execute(text("ALTER TABLE delivery_returns ADD sx_confirmation_note NVARCHAR(500) NULL"))
            print("✅ Added column: sx_confirmation_note")
            
            conn.commit()
            print("\n✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    add_columns()
