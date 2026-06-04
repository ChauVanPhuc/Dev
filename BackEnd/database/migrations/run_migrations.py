"""
Run all database migrations without emoji characters
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def run_allocation_method_migration():
    """Add allocation_method column to delivery_returns table"""
    db = next(get_db())
    try:
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'delivery_returns' 
            AND COLUMN_NAME = 'allocation_method'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            db.execute(text("ALTER TABLE delivery_returns ADD allocation_method NVARCHAR(20) DEFAULT 'FIFO'"))
            db.commit()
            print("[OK] Added allocation_method column to delivery_returns table")
        else:
            print("[SKIP] allocation_method column already exists")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] allocation_method migration failed: {str(e)}")
        raise

def run_sx_confirmation_migration():
    """Add SX confirmation columns to delivery_returns table"""
    db = next(get_db())
    try:
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'delivery_returns' 
            AND COLUMN_NAME = 'sx_confirmed_by'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_by INT NULL"))
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmed_at DATETIME NULL"))
            db.execute(text("ALTER TABLE delivery_returns ADD sx_confirmation_note NVARCHAR(500) NULL"))
            db.commit()
            print("[OK] Added SX confirmation columns to delivery_returns table")
        else:
            print("[SKIP] SX confirmation columns already exist")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] SX confirmation migration failed: {str(e)}")
        raise

def run_input_inspection_specification_migration():
    """Add specification column to input_inspections table"""
    db = next(get_db())
    try:
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'input_inspections' 
            AND COLUMN_NAME = 'specification'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            db.execute(text("ALTER TABLE input_inspections ADD specification NVARCHAR(255) NULL"))
            db.commit()
            print("[OK] Added specification column to input_inspections table")
        else:
            print("[SKIP] specification column already exists")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] input_inspection migration failed: {str(e)}")
        raise

def run_input_inspection_cont_name_migration():
    """Add cont_name column to input_inspections table"""
    db = next(get_db())
    try:
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'input_inspections' 
            AND COLUMN_NAME = 'cont_name'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            db.execute(text("ALTER TABLE input_inspections ADD cont_name NVARCHAR(50) NULL"))
            db.commit()
            print("[OK] Added cont_name column to input_inspections table")
        else:
            print("[SKIP] cont_name column already exists")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] cont_name migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    print("Running database migrations...")
    print("-" * 50)
    
    try:
        run_allocation_method_migration()
        run_sx_confirmation_migration()
        run_input_inspection_specification_migration()
        run_input_inspection_cont_name_migration()
        print("-" * 50)
        print("[SUCCESS] All migrations completed successfully!")
    except Exception as e:
        print("-" * 50)
        print(f"[FAILED] Migration failed: {str(e)}")
        sys.exit(1)
