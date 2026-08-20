import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import engine

def migrate():
    with engine.connect() as conn:
        # Check columns in master_product_materials
        res = conn.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'master_product_materials'
        """)).fetchall()
        existing_cols = [r[0].lower() for r in res]
        print("Existing cols in master_product_materials:", existing_cols)
        
        # Add product_sku if not exists
        if 'product_sku' not in existing_cols:
            print("Adding column product_sku...")
            conn.execute(text("ALTER TABLE master_product_materials ADD product_sku NVARCHAR(100) NULL"))
            conn.commit()
            print("Added product_sku.")
            
        # Add product_name if not exists
        if 'product_name' not in existing_cols:
            print("Adding column product_name...")
            conn.execute(text("ALTER TABLE master_product_materials ADD product_name NVARCHAR(255) NULL"))
            conn.commit()
            print("Added product_name.")
            
        # Make master_product_id nullable if it was NOT NULL
        try:
            conn.execute(text("ALTER TABLE master_product_materials ALTER COLUMN master_product_id INT NULL"))
            conn.commit()
            print("Updated master_product_id to allow NULL.")
        except Exception as e:
            print("Note on alter column:", e)

        # Backfill product_sku and product_name from master_products if master_product_id is set
        conn.execute(text("""
            UPDATE m
            SET m.product_sku = p.sku,
                m.product_name = p.name
            FROM master_product_materials m
            JOIN master_products p ON m.master_product_id = p.id
            WHERE m.product_name IS NULL OR m.product_name = ''
        """))
        conn.commit()
        print("Backfill completed successfully.")

if __name__ == '__main__':
    migrate()
