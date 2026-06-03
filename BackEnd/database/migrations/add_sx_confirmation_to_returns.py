"""
Migration: Add SX confirmation columns to delivery_returns table
Date: 2026-05-21
Description: Add columns for SX confirmation workflow in return process
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def upgrade():
    """
    Add new columns to delivery_returns table for SX confirmation
    """
    db = next(get_db())
    try:
        # Check if columns already exist
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'delivery_returns' 
            AND COLUMN_NAME = 'sx_confirmed_by'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            # Add new columns
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_by INT NULL"))
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_at DATETIME NULL"))
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmation_note NVARCHAR(500) NULL"))
            db.commit()
            print("✅ Successfully added SX confirmation columns to delivery_returns table")
        else:
            print("⚠️ Columns already exist, skipping migration")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error during migration: {str(e)}")
        raise

def downgrade():
    """
    Remove SX confirmation columns from delivery_returns table (rollback)
    """
    db = next(get_db())
    try:
        # Note: SQL Server doesn't support DROP COLUMN directly in all cases
        # This is a simplified rollback - may need manual intervention
        db.execute(text("ALTER TABLE delivery_returns DROP COLUMN IF EXISTS sx_confirmation_note"))
        db.execute(text("ALTER TABLE delivery_returns DROP COLUMN IF EXISTS sx_confirmed_at"))
        db.execute(text("ALTER TABLE delivery_returns DROP COLUMN IF EXISTS sx_confirmed_by"))
        db.commit()
        print("✅ Successfully removed SX confirmation columns from delivery_returns table")
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
