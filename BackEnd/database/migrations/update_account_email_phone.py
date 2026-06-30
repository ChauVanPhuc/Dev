"""
Migration: Add phone column and make email non-unique in accounts table
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def run_migration():
    """Migrate accounts table constraints and columns"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # 1. Check and add phone column
            check_phone_query = text("""
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'accounts' 
                AND COLUMN_NAME = 'phone'
            """)
            result = conn.execute(check_phone_query).fetchone()
            
            if result[0] == 0:
                print("Adding phone column to accounts table...")
                conn.execute(text("ALTER TABLE accounts ADD phone NVARCHAR(20) NULL"))
                conn.commit()
                print("[OK] Added column: phone")
            else:
                print("[SKIP] Column phone already exists")

            # 2. Find and drop UNIQUE constraints or UNIQUE indexes on email column
            # In SQL Server, unique constraints on email are key_constraints or indexes
            print("Checking for unique constraints/indexes on email column...")
            
            # Find unique key constraint
            find_constraint_query = text("""
                SELECT dc.name
                FROM sys.key_constraints dc
                JOIN sys.tables t ON dc.parent_object_id = t.object_id
                WHERE t.name = 'accounts' AND dc.type = 'UQ' AND dc.name LIKE '%email%'
            """)
            constraints = conn.execute(find_constraint_query).fetchall()
            for r in constraints:
                constraint_name = r[0]
                print(f"Dropping unique constraint {constraint_name}...")
                conn.execute(text(f"ALTER TABLE accounts DROP CONSTRAINT {constraint_name}"))
                conn.commit()
                print(f"[OK] Dropped constraint: {constraint_name}")

            # Find unique index
            find_index_query = text("""
                SELECT i.name
                FROM sys.indexes i
                JOIN sys.tables t ON i.object_id = t.object_id
                WHERE t.name = 'accounts' AND i.is_unique = 1 AND i.name LIKE '%email%'
            """)
            indexes = conn.execute(find_index_query).fetchall()
            for r in indexes:
                index_name = r[0]
                print(f"Dropping unique index {index_name}...")
                conn.execute(text(f"DROP INDEX {index_name} ON accounts"))
                conn.commit()
                print(f"[OK] Dropped index: {index_name}")

            # 3. Create non-unique index on email if not exists
            check_email_idx_query = text("""
                SELECT COUNT(*) as count 
                FROM sys.indexes 
                WHERE name = 'ix_accounts_email' AND object_id = OBJECT_ID('accounts')
            """)
            email_idx_exists = conn.execute(check_email_idx_query).fetchone()[0]
            if email_idx_exists == 0:
                print("Creating non-unique index ix_accounts_email on accounts(email)...")
                conn.execute(text("CREATE NONCLUSTERED INDEX ix_accounts_email ON accounts(email)"))
                conn.commit()
                print("[OK] Created index: ix_accounts_email")
            else:
                print("[SKIP] Index ix_accounts_email already exists")

            # 4. Create filtered unique index on phone if not exists
            check_phone_idx_query = text("""
                SELECT COUNT(*) as count 
                FROM sys.indexes 
                WHERE name = 'ux_accounts_phone' AND object_id = OBJECT_ID('accounts')
            """)
            phone_idx_exists = conn.execute(check_phone_idx_query).fetchone()[0]
            if phone_idx_exists == 0:
                print("Creating filtered unique index ux_accounts_phone on accounts(phone)...")
                conn.execute(text("CREATE UNIQUE NONCLUSTERED INDEX ux_accounts_phone ON accounts(phone) WHERE phone IS NOT NULL"))
                conn.commit()
                print("[OK] Created filtered unique index: ux_accounts_phone")
            else:
                print("[SKIP] Index ux_accounts_phone already exists")
                
            print("\n[OK] Migration completed successfully!")
            
    except Exception as e:
        print(f"[FAIL] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()
