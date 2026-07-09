"""
Migration: Add allocation_method column to delivery_returns table
Date: 2026-05-22
Description: Add column to track return allocation strategy (FIFO, LIFO, PROPORTIONAL)
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def upgrade():
    """
    Add allocation_method column to delivery_returns table
    """
    db = next(get_db())
    try:
        # Check if column already exists
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'delivery_returns' 
            AND COLUMN_NAME = 'allocation_method'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            # Add allocation_method column with default value 'FIFO'
            db.execute(text("ALTER TABLE delivery_returns ADD allocation_method NVARCHAR(20) DEFAULT 'FIFO'"))
            db.commit()
            print("✅ Successfully added allocation_method column to delivery_returns table")
        else:
            print("⚠️ Column already exists, skipping migration")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error during migration: {str(e)}")
        raise

def downgrade():
    """
    Remove allocation_method column from delivery_returns table (rollback)
    """
    db = next(get_db())
    try:
        db.execute(text("ALTER TABLE delivery_returns DROP COLUMN IF EXISTS allocation_method"))
        db.commit()
        print("✅ Successfully removed allocation_method column from delivery_returns table")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during rollback: {str(e)}")
        raise

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
