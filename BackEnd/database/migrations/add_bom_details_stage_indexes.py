"""
Migration: Add indexes for performance optimization
- bom_details: input_stage, output_stage, product_id, name (factory filtering + CTE joins)
- deliveries: plan_id, part_name, specification, status (delivery queries)
- input_inspections: plan_id, stage, part_name (inspection queries)
- orders: plan_id (order filtering)
- products: order_id (product filtering)
- delivery_details: delivery_id, order_id (delivery detail queries)
- Composite indexes for frequently joined columns
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def create_index_if_not_exists(db, index_name, table_name, columns):
    """Helper to create index if not exists"""
    check_sql = text(f"""
        SELECT COUNT(*) FROM sys.indexes 
        WHERE name = :index_name AND object_id = OBJECT_ID(:table_name)
    """)
    exists = db.execute(check_sql, {"index_name": index_name, "table_name": table_name}).fetchone()[0]
    
    if exists == 0:
        print(f"Creating index {index_name} on {table_name}({columns})...")
        create_sql = text(f"CREATE INDEX {index_name} ON {table_name}({columns})")
        db.execute(create_sql)
        db.commit()
        print(f"[OK] Created index {index_name}")
        return True
    else:
        print(f"[INFO] Index {index_name} already exists, skipping.")
        return False

def upgrade():
    """Add indexes for performance optimization"""
    db = next(get_db())
    try:
        # bom_details indexes (for factory filtering + CTE joins)
        create_index_if_not_exists(db, 'ix_bom_details_input_stage', 'bom_details', 'input_stage')
        create_index_if_not_exists(db, 'ix_bom_details_output_stage', 'bom_details', 'output_stage')
        create_index_if_not_exists(db, 'ix_bom_details_product_id', 'bom_details', 'product_id')
        create_index_if_not_exists(db, 'ix_bom_details_name', 'bom_details', 'name')
        
        # deliveries indexes (single and composite)
        create_index_if_not_exists(db, 'ix_deliveries_plan_id', 'deliveries', 'plan_id')
        create_index_if_not_exists(db, 'ix_deliveries_part_name', 'deliveries', 'part_name')
        create_index_if_not_exists(db, 'ix_deliveries_specification', 'deliveries', 'specification')
        create_index_if_not_exists(db, 'ix_deliveries_status', 'deliveries', 'status')
        create_index_if_not_exists(db, 'ix_deliveries_plan_id_status', 'deliveries', 'plan_id, status')
        create_index_if_not_exists(db, 'ix_deliveries_plan_id_part_name', 'deliveries', 'plan_id, part_name')
        create_index_if_not_exists(db, 'ix_deliveries_part_name_spec', 'deliveries', 'part_name, specification')
        
        # input_inspections indexes
        create_index_if_not_exists(db, 'ix_input_inspections_plan_id', 'input_inspections', 'plan_id')
        create_index_if_not_exists(db, 'ix_input_inspections_stage', 'input_inspections', 'stage')
        create_index_if_not_exists(db, 'ix_input_inspections_part_name', 'input_inspections', 'part_name')
        create_index_if_not_exists(db, 'ix_input_inspections_plan_id_stage', 'input_inspections', 'plan_id, stage')
        
        # orders indexes
        create_index_if_not_exists(db, 'ix_orders_plan_id', 'orders', 'plan_id')
        
        # products indexes
        create_index_if_not_exists(db, 'ix_products_order_id', 'products', 'order_id')
        
        # delivery_details indexes
        create_index_if_not_exists(db, 'ix_delivery_details_delivery_id', 'delivery_details', 'delivery_id')
        create_index_if_not_exists(db, 'ix_delivery_details_order_id', 'delivery_details', 'order_id')

        print("[SUCCESS] Migration completed!")
        
    except Exception as e:
        db.rollback()
        err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"[ERROR] Migration failed: {err_msg}")
        raise

if __name__ == "__main__":
    upgrade()
