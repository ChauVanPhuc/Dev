import sys
sys.path.append('m:/ERP/BackEnd')
from config.database import SessionLocal
from modules.inspection.models.stage_inspection import StageInspection

db = SessionLocal()

recs = db.query(StageInspection).filter(StageInspection.id.in_([24, 25])).all()
for r in recs:
    r.inspector_name = 'qcdhmt2'
    print(f"Updated record #{r.id} inspector_name to 'qcdhmt2'")

db.commit()
db.close()
print("Done!")
