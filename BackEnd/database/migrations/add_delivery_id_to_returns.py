"""
Migration: Add delivery_id column to delivery_returns table
Date: 2026-05-22
Description: Add delivery_id column to associate return slips directly with delivery slips
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def upgrade():
    """
    Add delivery_id column and foreign key constraint to delivery_returns table
    """
    db = next(get_db())
    try:
        # Check if column already exists
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'delivery_returns' 
            AND COLUMN_NAME = 'delivery_id'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            # Add delivery_id column
            db.execute(text("ALTER TABLE delivery_returns ADD delivery_id INT NULL"))
            # Add foreign key constraint
            db.execute(text("ALTER TABLE delivery_returns ADD CONSTRAINT FK_delivery_returns_deliveries FOREIGN KEY (delivery_id) REFERENCES deliveries(id)"))
            db.commit()
            print("Successfully added delivery_id column and foreign key to delivery_returns table")
        else:
            print("Column delivery_id already exists, skipping migration")
            
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {str(e)}")
        raise

def downgrade():
    """
    Remove delivery_id column (rollback)
    """
    db = next(get_db())
    try:
        # Drop foreign key first
        db.execute(text("ALTER TABLE delivery_returns DROP CONSTRAINT IF EXISTS FK_delivery_returns_deliveries"))
        # Drop column
        db.execute(text("ALTER TABLE delivery_returns DROP COLUMN IF EXISTS delivery_id"))
        db.commit()
        print("Successfully removed delivery_id column from delivery_returns table")
    except Exception as e:
        db.rollback()
        print(f"Error during rollback: {str(e)}")
        raise

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
