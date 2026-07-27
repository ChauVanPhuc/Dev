import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import engine, Base
import app.models
from modules.quick_report.models.quick_report import QuickReport

try:
    print("[MIGRATION] Recreating quick_reports table with NVARCHAR columns...")
    QuickReport.__table__.drop(engine, checkfirst=True)
    QuickReport.__table__.create(engine, checkfirst=True)
    print("[SUCCESS] Successfully recreated quick_reports table with NVARCHAR columns for full Vietnamese UTF-8 support!")
except Exception as e:
    print(f"[ERROR] Migration failed: {e}")
