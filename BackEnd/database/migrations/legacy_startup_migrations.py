"""
Legacy startup migrations previously executed in app/main.py.
Consolidated here to keep main.py clean, fast, and prevent redundant console spam on server startup.
Can be run on-demand or via database/migrations/run_migrations.py.
"""
import sys
import os
import io

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import engine

def run_startup_migrations():
    print("[MIGRATION] Running consolidated startup migrations...")

    # [MIGRATION] Add Inspection Guide sidebar to Quản lý chất lượng
    try:
        from database.migrations.add_inspection_guide_sidebar import add_inspection_guide_sidebar
        add_inspection_guide_sidebar()
    except Exception:
        pass

    # [MIGRATION] Add approver_bgd column to iso_documents & iso_processes
    try:
        from database.migrations.add_approver_bgd_column import run_migration as migrate_approver_bgd
        migrate_approver_bgd()
    except Exception as err:
        print(f"[MIGRATION] ISO approver_bgd warning: {err}")

    # [MIGRATION] Create iso_master_records table & seed initial data
    try:
        from database.migrations.create_iso_master_records_table import migrate_and_seed
        migrate_and_seed()
    except Exception as err:
        print(f"[MIGRATION] ISO Master records warning: {err}")

    # [MIGRATION] Seed all 5 ISO items into system_sidebars
    try:
        from database.migrations.seed_all_iso_sidebars import seed_iso_sidebars
        seed_iso_sidebars()
    except Exception as err:
        print(f"[MIGRATION] ISO sidebars warning: {err}")

    # [MIGRATION] Check/Create defect_categories table & seed
    try:
        from database.migrations.create_defect_categories_table import migrate_and_seed_defect_categories
        migrate_and_seed_defect_categories()
    except Exception:
        pass

    # [MIGRATION] Seed QLCL Departments & responsibility_scope column
    try:
        from database.migrations.seed_qlcl_departments import seed_qlcl_departments
        seed_qlcl_departments()
    except Exception as err:
        print(f"[MIGRATION] Seed QLCL departments warning: {err}")

    # [MIGRATION] Seed QLCL Checklists & department_code column
    try:
        from database.migrations.seed_qlcl_checklists import seed_qlcl_checklists
        seed_qlcl_checklists()
    except Exception as err:
        print(f"[MIGRATION] Seed QLCL checklists warning: {err}")

    # [MIGRATION] Seed HR Assessment & Quiz data
    try:
        from database.seeders.seed_assessments import seed_assessments_data
        seed_assessments_data()
    except Exception as ass_err:
        print(f"[MIGRATION] Seed HR assessments warning: {ass_err}")

    # [MIGRATION] Add audio_url column to quick_reports table if not exists
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'quick_reports') AND name = 'audio_url'
                )
                BEGIN
                    ALTER TABLE quick_reports ADD audio_url NVARCHAR(1000) NULL;
                END
            """))
    except Exception as qr_err:
        print(f"[MIGRATION] QuickReport audio_url warning: {qr_err}")

    # [MIGRATION] Add Assessment sidebar menu
    try:
        from database.migrations.add_assessment_sidebar import add_assessment_sidebar
        add_assessment_sidebar()
    except Exception as side_err:
        print(f"[MIGRATION] Add assessment sidebar warning: {side_err}")

    # [MIGRATION] Add workshop column to machines table
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE machines ADD workshop NVARCHAR(255) NULL"))
    except Exception:
        pass

    # [MIGRATION] Expand kpi_training_plans target, file_name, and file_url columns to NVARCHAR(MAX)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN target NVARCHAR(MAX) NOT NULL"))
            conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN file_name NVARCHAR(MAX) NULL"))
            conn.execute(text("ALTER TABLE kpi_training_plans ALTER COLUMN file_url NVARCHAR(MAX) NULL"))
    except Exception as alter_err:
        print(f"[MIGRATION] Alter kpi_training_plans columns warning: {alter_err}")

    # [MIGRATION] Add created_at column to roles table (fix SQL error 42S22)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE roles ADD created_at DATETIME NULL"))
    except Exception:
        pass

    # [MIGRATION] Add root_cause, solution, capa_reference columns to defect_types table
    try:
        with engine.begin() as conn:
            for _col, _type in [
                ("root_cause", "NVARCHAR(1000) NULL"),
                ("solution", "NVARCHAR(1000) NULL"),
                ("capa_reference", "NVARCHAR(250) NULL")
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE defect_types ADD {_col} {_type}"))
                except Exception:
                    pass
    except Exception:
        pass

    # [MIGRATION] Add missing columns to master_products table
    try:
        with engine.begin() as conn:
            for _col, _type in [
                ("new_name", "NVARCHAR(255) NULL"),
                ("brand_name", "NVARCHAR(100) NULL"),
                ("adjusted_date", "DATETIME NULL"),
                ("image_url", "NVARCHAR(500) NULL"),
                ("total_category_count", "INT NULL DEFAULT 0")
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE master_products ADD {_col} {_type}"))
                except Exception:
                    pass
    except Exception:
        pass

    # [MIGRATION] Add category_id (FK -> master_categories) to production_routings table
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE production_routings ADD category_id INT NULL"))
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE production_routings ADD CONSTRAINT FK_production_routings_category "
                "FOREIGN KEY (category_id) REFERENCES master_categories(id)"
            ))
    except Exception:
        pass

    # [MIGRATION] Add main_category column to master_categories table & seed default values
    try:
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE master_categories ADD main_category NVARCHAR(50) NULL"))
            except Exception:
                pass
            vanity_names = ['ADV', 'ADVANCE', 'BEZ', 'EYC', 'FOL', 'TPH']
            furniture_names = ['APT', 'ATL', 'ATLAS', 'COV', 'HOR', 'MBC', 'TIN']
            for _vname in vanity_names:
                conn.execute(text("UPDATE master_categories SET main_category = 'Vanity' WHERE name = :n AND (main_category IS NULL OR main_category = '')"), {"n": _vname})
            for _fname in furniture_names:
                conn.execute(text("UPDATE master_categories SET main_category = 'Furniture' WHERE name = :n AND (main_category IS NULL OR main_category = '')"), {"n": _fname})
    except Exception as cat_mig_err:
        print(f"[MIGRATION] Alter master_categories warning: {cat_mig_err}")

    # [MIGRATION] Seed master_categories & categories and link master_products + production_routings by SKU prefix
    try:
        with engine.begin() as conn:
            known_categories = [
                ('APT', 'APT'),
                ('ATL', 'ATL'),
                ('FOL', 'FOL'),
                ('ADV', 'ADV'),
                ('TPH', 'TPH'),
                ('HOR', 'HOR'),
                ('EYC', 'EYC'),
                ('COV', 'COV'),
                ('TIN', 'TIN'),
                ('BEZ', 'BEZ'),
                ('MBC', 'MBC'),
            ]
            for prefix, cat_name in known_categories:
                conn.execute(text(
                    "IF NOT EXISTS (SELECT 1 FROM master_categories WHERE name = :name) "
                    "INSERT INTO master_categories (name, description, status, created_at) VALUES (:name, :desc, 1, GETDATE())"
                ), {"name": cat_name, "desc": f"Dòng hàng {prefix}"})
                conn.execute(text(
                    "IF NOT EXISTS (SELECT 1 FROM categories WHERE name = :name) "
                    "INSERT INTO categories (name, description) VALUES (:name, :desc)"
                ), {"name": cat_name, "desc": f"Dòng hàng {prefix}"})

            for prefix, cat_name in known_categories:
                conn.execute(text(
                    "UPDATE mp SET mp.category_id = mc.id "
                    "FROM master_products mp "
                    "CROSS JOIN master_categories mc "
                    "WHERE mc.name = :cat_name "
                    "AND (mp.category_id IS NULL) "
                    "AND UPPER(mp.sku) LIKE :prefix_pattern"
                ), {"cat_name": cat_name, "prefix_pattern": f"{prefix}%"})

            for prefix, cat_name in known_categories:
                conn.execute(text(
                    "UPDATE pr SET pr.category_id = mc.id "
                    "FROM production_routings pr "
                    "CROSS JOIN master_categories mc "
                    "WHERE mc.name = :cat_name "
                    "AND (pr.category_id IS NULL) "
                    "AND (pr.category LIKE :pattern OR pr.routing_code LIKE :code_pattern)"
                ), {"cat_name": cat_name, "pattern": f"%{prefix}%", "code_pattern": f"%{prefix}%"})
    except Exception as seed_err:
        print(f"[MIGRATION] Seed master_categories warning: {seed_err}")

    # [MIGRATION] Enforce 1 SKU -> 1 routing: dedupe rows then add unique index on product_sku
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                ;WITH dedupe_cte AS (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY product_sku ORDER BY id DESC) AS rn
                    FROM production_routing_products
                )
                DELETE FROM production_routing_products WHERE id IN (SELECT id FROM dedupe_cte WHERE rn > 1)
            """))
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "CREATE UNIQUE INDEX UQ_production_routing_products_sku ON production_routing_products (product_sku)"
            ))
    except Exception:
        pass

    print("[MIGRATION] Consolidated startup migrations completed successfully.")

if __name__ == "__main__":
    run_startup_migrations()
