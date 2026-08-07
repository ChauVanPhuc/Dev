import sys
import os

# Set UTF-8 encoding environment for console output
os.environ["PYTHONIOENCODING"] = "utf-8"

# Add BackEnd directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import engine, Base
from sqlalchemy import text

# Import all models to ensure metadata registration
import app.models
from modules.kpi.models.kpi_management import KPIChecklist, KPIEmployeeItem, KPIViolation, KPIFeedback, KPIPointRule, KPIChecklistPool, KPIItemPool
from modules.quick_report.models.quick_report import QuickReport
from modules.system.models.data_package import DataPackage
from modules.claim.models.claim_models import CustomerClaim, CabinetPrice, ContainerShipment

def safe_log(msg):
    try:
        print(msg)
    except Exception:
        pass

def init_db():
    safe_log("==================================================")
    safe_log("Step 1: Creating all database tables in SQL Server")
    safe_log("==================================================")
    try:
        Base.metadata.create_all(bind=engine)
        safe_log("[SUCCESS] Base.metadata.create_all completed successfully.")
    except Exception as e:
        safe_log(f"[ERROR] Failed to create tables: {e}")
        sys.exit(1)

    safe_log("\n==================================================")
    safe_log("Step 2: Seeding Roles & Permissions")
    safe_log("==================================================")
    try:
        from database.seeders.seed_roles_permissions import db as rp_db
        safe_log("[SUCCESS] Roles & permissions seeded.")
    except Exception as e:
        safe_log(f"[WARNING] Roles/Permissions seed output: {e}")

    safe_log("\n==================================================")
    safe_log("Step 3: Seeding Production Stages")
    safe_log("==================================================")
    try:
        from database.seeders.seed_stages import seed_stages
        seed_stages()
        safe_log("[SUCCESS] Production stages seeded.")
    except Exception as e:
        safe_log(f"[WARNING] Stages seed error: {e}")

    safe_log("\n==================================================")
    safe_log("Step 4: Seeding Defect Types")
    safe_log("==================================================")
    try:
        from database.seeders.seed_defect_types import seed_defect_types
        seed_defect_types()
        safe_log("[SUCCESS] Defect types seeded.")
    except Exception as e:
        safe_log(f"[WARNING] Defect types seed error: {e}")

    safe_log("\n==================================================")
    safe_log("Step 5: Seeding Admin & User Accounts")
    safe_log("==================================================")
    try:
        import database.seeders.seed_admin
        safe_log("[SUCCESS] Admin & sample accounts seeded.")
    except Exception as e:
        safe_log(f"[WARNING] Admin seed output: {e}")

    safe_log("\n==================================================")
    safe_log("Step 6: Seeding System Components & Metadata")
    safe_log("==================================================")
    try:
        from database.seeders.seed_system_components import safe_print
        import database.seeders.seed_system_components
        safe_log("[SUCCESS] System components seeded.")
    except Exception as e:
        safe_log(f"[WARNING] System components seed output: {e}")

    safe_log("\n==================================================")
    safe_log("Step 7: Seeding System Sidebars (Web & Mobile)")
    safe_log("==================================================")
    try:
        from database.migrations.create_system_sidebars_table import upgrade as seed_sidebars
        seed_sidebars()
        import database.seeders.add_system_config_sidebar
        import database.seeders.add_quick_report_sidebar
        import database.seeders.add_production_v2_sidebar
        safe_log("[SUCCESS] System sidebars seeded.")
    except Exception as e:
        safe_log(f"[WARNING] System sidebars seed error: {e}")

    safe_log("\n==================================================")
    safe_log("[COMPLETED] Database schema and core data initialized!")
    safe_log("==================================================")


if __name__ == "__main__":
    init_db()
