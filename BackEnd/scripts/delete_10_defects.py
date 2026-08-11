import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(backend_dir)

from config.database import SessionLocal
from modules.inspection.models.defect_type import DefectType

def delete_ten_defects():
    db = SessionLocal()
    try:
        target_codes = [
            "PAI-01", "PAI-02", "PAI-03", "PAI-04", "PAI-05",
            "STR-07", "STR-08", "VIS-09", "VIS-10", "MAT-07"
        ]
        
        deleted_count = db.query(DefectType).filter(DefectType.code.in_(target_codes)).delete(synchronize_session=False)
        db.commit()
        print(f"SUCCESSFULLY DELETED {deleted_count} DEFECTS!")
    except Exception as e:
        db.rollback()
        print(f"ERROR DELETING DEFECTS: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_ten_defects()
