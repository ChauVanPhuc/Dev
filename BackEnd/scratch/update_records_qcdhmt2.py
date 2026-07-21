import sys
sys.path.append('m:/ERP/BackEnd')
from config.database import SessionLocal
from modules.inspection.models.stage_inspection import StageInspection

db = SessionLocal()

# 1. Update records 14-19 to 'qcdhmt2'
recs = db.query(StageInspection).filter(StageInspection.id >= 14, StageInspection.id <= 19).all()
for r in recs:
    r.inspector_name = 'qcdhmt2'
    print(f"Updated record #{r.id} inspector_name to 'qcdhmt2'")

# 2. Clean up test records > 19
test_recs = db.query(StageInspection).filter(StageInspection.id > 19).all()
for tr in test_recs:
    print(f"Deleting test record #{tr.id}")
    db.delete(tr)

db.commit()
db.close()
print("Done!")
