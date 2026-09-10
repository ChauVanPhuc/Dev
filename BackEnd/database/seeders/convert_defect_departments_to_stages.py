import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add root and BackEnd folders to PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage
from modules.inspection.models.defect_type import DefectType

DEPARTMENT_TO_STAGE_MAP = {
    "QC Kiểm Tra Nhập Kho": ["Đầu vào"],
    "IQC": ["Đầu vào"],
    "QC Định Hình - Lắp Ráp": ["Tạo Phôi", "Định Hình", "Lắp Ráp"],
    "QC Sơn - Đóng Gói": ["Sơn", "Đóng Gói"],
    "QC Final": ["Đóng Gói", "Lưu Kho"],
    "FQC": ["Đóng Gói", "Lưu Kho"],
    "PQC": ["Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn"],
    "Nhân Viên Kiểm Soát Quy Trình": ["Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn", "Đóng Gói"],
    "Trưởng phòng QLCL": ["Đầu vào", "Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn", "Đóng Gói", "Lưu Kho"],
    "Customer QA": ["Đóng Gói", "Lưu Kho"],
    "Quality System": ["Đầu vào", "Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn", "Đóng Gói", "Lưu Kho"]
}

def convert_defect_departments_to_stages():
    db = SessionLocal()
    try:
        # 1. Fetch active stage names from stages table
        db_stages = db.query(Stage).filter(Stage.is_active == True).order_by(Stage.sequence.asc()).all()
        stage_names = [s.name for s in db_stages]
        if not stage_names:
            stage_names = ["Đầu vào", "Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn", "Đóng Gói", "Lưu Kho"]

        print(f"Loaded {len(stage_names)} active stages from DB: {stage_names}")

        defects = db.query(DefectType).all()
        converted_count = 0

        for d in defects:
            old_raw = d.stage
            parsed_items = []

            if old_raw:
                try:
                    if old_raw.strip().startswith('['):
                        parsed_items = json.loads(old_raw)
                    else:
                        parsed_items = [s.strip() for s in old_raw.split(',') if s.strip()]
                except Exception:
                    parsed_items = [old_raw.strip()]

            new_stages = set()
            for item in parsed_items:
                # Check if item is already a valid stage name
                matched_stage = False
                for s_name in stage_names:
                    if item.lower() == s_name.lower() or item.lower() in s_name.lower():
                        new_stages.add(s_name)
                        matched_stage = True
                        break

                if not matched_stage:
                    # Check department mapping
                    mapped = DEPARTMENT_TO_STAGE_MAP.get(item)
                    if mapped:
                        for m in mapped:
                            if m in stage_names:
                                new_stages.add(m)
                            else:
                                new_stages.add(m)

            # Fallback if no stages mapped or if empty/All
            if not new_stages:
                new_stages = set(stage_names)

            # Sort according to standard stage sequence
            final_stage_list = [s for s in stage_names if s in new_stages]
            # Add any extra stages not in standard list
            for s in new_stages:
                if s not in final_stage_list:
                    final_stage_list.append(s)

            new_raw = json.dumps(final_stage_list, ensure_ascii=False)
            if d.stage != new_raw:
                d.stage = new_raw
                converted_count += 1

        db.commit()
        print(f"Successfully updated {converted_count} defect types to process stages!")
    except Exception as e:
        db.rollback()
        print(f"Error converting defect departments to stages: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    convert_defect_departments_to_stages()
