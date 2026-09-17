import sys
import os
import json

# Ensure BackEnd root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import SessionLocal
import app.models
from modules.inspection.models.input_inspection import InputInspection
from modules.inspection_guide.models.inspection_guide import InspectionGuide, InspectionGuideStep, InspectionGuideAssignment

def populate_steps():
    db = SessionLocal()
    try:
        # Load all active guides with their steps
        guides = db.query(InspectionGuide).filter(
            InspectionGuide.is_active == True,
            InspectionGuide.deleted_at.is_(None)
        ).all()

        stage_id_map = {
            'nhập kho/đầu vào': 1,
            'nhap kho/dau vao': 1,
            'nhập kho': 1,
            'đầu vào': 1,
            'tạo phôi': 2,
            'tao phoi': 2,
            'định hình': 3,
            'dinh hinh': 3,
            'lắp ráp': 4,
            'lap rap': 4,
            'sơn': 5,
            'son': 5,
            'đóng gói': 6,
            'dong goi': 6,
            'lưu kho': 7,
            'luu kho': 7
        }

        # Query pending tickets
        tickets = db.query(InputInspection).filter(
            (InputInspection.is_confirmed == False) | (InputInspection.is_confirmed.is_(None))
        ).all()

        updated_count = 0

        for t in tickets:
            data = {}
            if t.data_json:
                try:
                    data = json.loads(t.data_json)
                except Exception:
                    data = {}

            # If steps already present and not empty, skip
            if data.get("steps") and isinstance(data["steps"], (list, dict)) and len(data["steps"]) > 0:
                continue

            stage_name = (t.stage or data.get("stage") or "").strip().lower()
            target_stage_id = stage_id_map.get(stage_name)

            # Find matching guide
            matched_guide = None
            if target_stage_id:
                for g in guides:
                    for a in (g.assignments or []):
                        if a.is_active and a.stage_id == target_stage_id:
                            matched_guide = g
                            break
                    if matched_guide:
                        break

            # Fallback matching by name
            if not matched_guide and stage_name:
                for g in guides:
                    g_name = (g.name or "").lower()
                    if stage_name in g_name or g_name in stage_name:
                        matched_guide = g
                        break

            # Special case for 'Định Hình': guide 2004
            if not matched_guide and 'định hình' in stage_name:
                matched_guide = db.query(InspectionGuide).filter(InspectionGuide.id == 2004).first()

            if matched_guide and matched_guide.steps:
                sorted_steps = sorted(matched_guide.steps, key=lambda s: s.step_no or 0)
                is_pass = (t.result in ["Đạt", "pass"] or not t.result)
                formatted_steps = [
                    {
                        "id": s.id,
                        "step_no": s.step_no or (idx + 1),
                        "step": s.step_no or (idx + 1),
                        "title": s.title or f"Bước {idx + 1}",
                        "description": s.title or f"Bước {idx + 1}",
                        "standard": s.content or "",
                        "content": s.content or "",
                        "note": "",
                        "result": "pass" if is_pass else "fail",
                        "qty": 1,
                        "guide_name": matched_guide.name,
                        "guide_code": matched_guide.code,
                        "images": [],
                        "sub_steps": []
                    }
                    for idx, s in enumerate(sorted_steps)
                ]
                data["steps"] = formatted_steps
                t.data_json = json.dumps(data, ensure_ascii=False)
                updated_count += 1
                print(f"[OK] Updated ticket {t.id} ({t.ticket_code}) with {len(formatted_steps)} steps")

        db.commit()
        print(f"Total updated tickets: {updated_count}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_steps()
