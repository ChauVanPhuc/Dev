"""
Run all database migrations without emoji characters
"""
import sys
import os
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db
from database.migrations.update_account_email_phone import run_migration as run_account_migration
from database.migrations.add_reporter_to_screen_bugs import run_migration as run_screen_bug_reporter_migration
from database.migrations.add_missing_input_inspection_columns import run_migration as run_missing_input_inspection_columns_migration
from database.migrations.add_inspection_confirmation import run_migration as run_inspection_confirmation_migration
from database.migrations.add_inspection_guide_sidebar import add_inspection_guide_sidebar as run_inspection_guide_sidebar_migration
from database.migrations.add_is_mobile_allowed_to_accounts import run_migration as run_is_mobile_allowed_migration
from database.migrations.add_is_web_allowed_to_accounts import run_migration as run_is_web_allowed_migration
from database.migrations.add_order_columns_to_purchase_requisitions import run_migration as run_purchase_requisition_columns_migration
from database.migrations.add_account_department_permission_factory import run_migration as run_account_dept_perm_factory_migration
from database.migrations.add_department_columns import run_migration as run_department_columns_migration
from database.migrations.drop_hr_catalog_tables import run_migration as run_drop_hr_catalog_migration
from database.migrations.seed_positions import run_migration as run_seed_positions_migration
from database.migrations.set_department_names import run_migration as run_set_department_names_migration
from database.migrations.fix_hr_screens import run_migration as run_fix_hr_screens_migration
from database.migrations.restructure_mobile_sidebar import run_migration as run_restructure_mobile_sidebar_migration
from database.migrations.update_worker_accounts_to_sx import run as run_worker_accounts_migration
from database.migrations.update_reports_inspectors_to_qlcl import run as run_reports_inspectors_migration
from database.migrations.fix_reports_stages_and_inspectors_migration import run as run_fix_reports_stages_migration
from database.migrations.update_roles_ql_departments import run as run_roles_ql_departments_migration
from database.migrations.create_pallet_check_tables import run as run_pallet_check_tables_migration

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

def run_iso_process_revision_logs_migration():
    """Add process_id column and make document_id nullable in iso_revision_logs table"""
    db = next(get_db())
    try:
        check_sql = text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'iso_revision_logs' 
            AND COLUMN_NAME = 'process_id'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result[0] == 0:
            db.execute(text("ALTER TABLE iso_revision_logs ALTER COLUMN document_id INT NULL"))
            db.execute(text("ALTER TABLE iso_revision_logs ADD process_id INT NULL"))
            db.commit()
            print("[OK] Altered iso_revision_logs table (document_id nullable, added process_id)")
        else:
            print("[SKIP] process_id column already exists in iso_revision_logs")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] iso_revision_logs migration failed: {str(e)}")
        raise

def run_stage_inspection_new_columns_migration():
    """Add specification, image_path_1, image_path_2, image_path_3 columns to stage_inspections table"""
    db = next(get_db())
    try:
        columns_to_add = {
            'specification': 'NVARCHAR(255) NULL',
            'image_path_1': 'NVARCHAR(500) NULL',
            'image_path_2': 'NVARCHAR(500) NULL',
            'image_path_3': 'NVARCHAR(500) NULL'
        }
        for col_name, col_type in columns_to_add.items():
            check_sql = text(f"""
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'stage_inspections' 
                AND COLUMN_NAME = '{col_name}'
            """)
            result = db.execute(check_sql).fetchone()
            if result[0] == 0:
                db.execute(text(f"ALTER TABLE stage_inspections ADD {col_name} {col_type}"))
                db.commit()
                print(f"[OK] Added {col_name} column to stage_inspections table")
            else:
                print(f"[SKIP] {col_name} column already exists in stage_inspections")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] stage_inspection new columns migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    print("Running database migrations...")
    print("-" * 50)
    
    try:
        run_allocation_method_migration()
        run_sx_confirmation_migration()
        run_input_inspection_specification_migration()
        run_input_inspection_cont_name_migration()
        run_missing_input_inspection_columns_migration()
        run_account_migration()
        run_screen_bug_reporter_migration()
        run_iso_process_revision_logs_migration()
        run_stage_inspection_new_columns_migration()
        run_inspection_guide_sidebar_migration()
        run_inspection_confirmation_migration()
        run_is_mobile_allowed_migration()
        run_is_web_allowed_migration()
        run_purchase_requisition_columns_migration()
        run_account_dept_perm_factory_migration()
        run_department_columns_migration()
        run_drop_hr_catalog_migration()
        run_seed_positions_migration()
        run_set_department_names_migration()
        run_fix_hr_screens_migration()
        run_restructure_mobile_sidebar_migration()
        run_worker_accounts_migration()
        run_reports_inspectors_migration()
        run_fix_reports_stages_migration()
        run_roles_ql_departments_migration()
        run_pallet_check_tables_migration()
        print("-" * 50)
        print("[SUCCESS] All migrations completed successfully!")
    except Exception as e:
        print("-" * 50)
        print(f"[FAILED] Migration failed: {str(e)}")
        sys.exit(1)
