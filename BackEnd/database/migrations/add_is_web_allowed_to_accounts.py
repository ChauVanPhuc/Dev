"""
Migration: Add is_web_allowed column to accounts table
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Add is_web_allowed column to accounts table if it doesn't exist"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            check_col_query = text("""
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'accounts' 
                AND COLUMN_NAME = 'is_web_allowed'
            """)
            result = conn.execute(check_col_query).fetchone()
            
            if result[0] == 0:
                print("Adding is_web_allowed column to accounts table...")
                conn.execute(text("ALTER TABLE accounts ADD is_web_allowed BIT NOT NULL DEFAULT 1"))
                conn.commit()
                print("[OK] Added column: is_web_allowed (default 1)")
            else:
                print("[SKIP] Column is_web_allowed already exists")

            # Update all NULL or existing records to ensure is_web_allowed is 1 (True)
            print("Ensuring is_web_allowed = 1 for existing accounts...")
            conn.execute(text("UPDATE accounts SET is_web_allowed = 1 WHERE is_web_allowed IS NULL"))
            conn.commit()
            print("[OK] Existing accounts updated to is_web_allowed = 1")
                
            print("\n[OK] Migration completed successfully!")
            
    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
