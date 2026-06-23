# -*- coding: utf-8 -*-
"""
Migration script to add last_updated column to client_defects table
"""

from sqlalchemy import text
from config.database import SessionLocal

def upgrade():
    """Add last_updated column to client_defects table if it doesn't exist"""
    db = SessionLocal()
    
    try:
        # Check if last_updated column exists
        column_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'client_defects' AND COLUMN_NAME = 'last_updated'
        """)).fetchone()
        
        if not column_check:
            print("Adding last_updated column to client_defects table...")
            db.execute(text("ALTER TABLE client_defects ADD last_updated DATETIME DEFAULT GETDATE()"))
            db.commit()
            print("Successfully added last_updated column to client_defects table.")
        else:
            print("last_updated column already exists in client_defects table.")
            
        print("Migration completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding last_updated column: {e}")
        raise
    finally:
        db.close()

def downgrade():
    """Remove last_updated column from client_defects table"""
    db = SessionLocal()
    
    try:
        print("Removing last_updated column from client_defects table...")
        
        # SQL Server doesn't support DROP COLUMN directly in all versions, 
        # so we use ALTER TABLE
        db.execute(text("ALTER TABLE client_defects DROP COLUMN IF EXISTS last_updated"))
        
        db.commit()
        print("Successfully removed last_updated column from client_defects table.")
        
    except Exception as e:
        db.rollback()
        print(f"Error removing last_updated column: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
