import sys
sys.stdout.reconfigure(encoding='utf-8')
from config.database import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Check and add target_role to kpi_item_pool
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('kpi_item_pool') AND name = 'target_role'
                )
                BEGIN
                    ALTER TABLE kpi_item_pool ADD target_role NVARCHAR(100) NULL;
                END
            """))
            
            # Check and add target_role to kpi_employee_items
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('kpi_employee_items') AND name = 'target_role'
                )
                BEGIN
                    ALTER TABLE kpi_employee_items ADD target_role NVARCHAR(100) NULL;
                END
            """))
            trans.commit()
            print("Successfully migrated target_role column to kpi_item_pool and kpi_employee_items.")
        except Exception as e:
            trans.rollback()
            print("Error in migration:", e)
            raise e

if __name__ == '__main__':
    run_migration()

