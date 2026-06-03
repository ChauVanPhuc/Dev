"""
Migration: Add part_name column to deliveries table
This migration adds the part_name column if it doesn't exist.
"""
from sqlalchemy import text
from config.database import engine, SessionLocal

def upgrade():
    """Add part_name column to deliveries table"""
    db = SessionLocal()
    try:
        print("Checking for part_name column in deliveries table...")
        
        # Try to add the column
        try:
            db.execute(text("ALTER TABLE deliveries ADD part_name NVARCHAR(250) NULL"))
            db.commit()
            print("Successfully added part_name column to deliveries table.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("part_name column already exists in deliveries table.")
            else:
                print(f"Error adding part_name column: {e}")
                raise
                
    except Exception as e:
        print(f"Migration error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
