import sys
sys.path.append('m:/ERP/BackEnd')
from config.database import SessionLocal
from modules.inspection.models.stage_inspection import StageInspection

db = SessionLocal()

recs = db.query(StageInspection).filter(StageInspection.inspection_type == 'quy-trinh').all()
deleted_count = len(recs)

for r in recs:
    print(f"Deleting StageInspection id={r.id}, type={r.inspection_type}, product_sku={r.product_sku}")
    db.delete(r)

db.commit()
db.close()

print(f"Successfully deleted {deleted_count} 'quy-trinh' inspection records!")
