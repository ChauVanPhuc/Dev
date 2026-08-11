import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add BackEnd directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(backend_dir)

from config.database import SessionLocal
from modules.inspection.models.defect_type import DefectType

def add_ten_defects():
    db = SessionLocal()
    try:
        new_defects = [
            {
                "name": "Bong tróc màng sơn",
                "category": "paint",
                "code": "PAI-01",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": True,
                "is_active": True,
                "description": "Màng sơn bị bong tróc khỏi bề mặt sản phẩm",
                "stage": json.dumps(["NM1 - Sơn 1", "NM2 - Sơn Pallet 2", "NM3 - Sơn 3"])
            },
            {
                "name": "Cam màng sơn (Bề mặt sần sùi)",
                "category": "paint",
                "code": "PAI-02",
                "aql_class": "Minor",
                "needs_tracking": False,
                "qc_tracking": True,
                "is_active": True,
                "description": "Màng sơn phủ không phẳng mịn, bị hiện tượng gợn cam",
                "stage": json.dumps(["NM1 - Sơn 1", "NM3 - Sơn 3"])
            },
            {
                "name": "Chảy sơn (Vón cục sơn)",
                "category": "paint",
                "code": "PAI-03",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": True,
                "is_active": True,
                "description": "Sơn đọng dầy thành giọt hoặc đường chảy trên bề mặt",
                "stage": json.dumps(["NM1 - Sơn 1", "NM2 - Sơn treo 2"])
            },
            {
                "name": "Thiếu sơn / Sơn không đều",
                "category": "paint",
                "code": "PAI-04",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": False,
                "is_active": True,
                "description": "Bề mặt sản phẩm bị sọc, thiếu sơn hoặc độ dày sơn không đạt",
                "stage": json.dumps(["NM1 - Sơn 1", "NM3 - Sơn 3"])
            },
            {
                "name": "Bụi sơn / Dính bẩn màng sơn",
                "category": "paint",
                "code": "PAI-05",
                "aql_class": "Minor",
                "needs_tracking": False,
                "qc_tracking": False,
                "is_active": True,
                "description": "Bụi hoặc dị vật bám vào màng sơn khi sơn chưa khô",
                "stage": json.dumps(["NM1 - Sơn 1", "NM2 - Sơn Pallet 2"])
            },
            {
                "name": "Hở keo / Dính keo bề mặt",
                "category": "structure",
                "code": "STR-07",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": True,
                "is_active": True,
                "description": "Đường keo dán bị vỡ hoặc lem keo ra ngoài vị trí ghép mộng",
                "stage": json.dumps(["NM1 - Lắp ráp, chà nhám 1", "NM3 - Lắp ráp 3"])
            },
            {
                "name": "Bung đinh / Lệch đinh bắn",
                "category": "structure",
                "code": "STR-08",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": False,
                "is_active": True,
                "description": "Đinh bắn không xuyên chìm hoặc trúng vị trí ghép nối",
                "stage": json.dumps(["NM1 - Lắp ráp, chà nhám 1", "NM2 - Lắp ráp tủ 2"])
            },
            {
                "name": "Sứt mẻ góc cạnh bao bì",
                "category": "visual",
                "code": "VIS-09",
                "aql_class": "Minor",
                "needs_tracking": False,
                "qc_tracking": True,
                "is_active": True,
                "description": "Góc thùng carton hoặc sản phẩm bị sứt mẻ trong khâu đóng gói",
                "stage": json.dumps(["NM1 - Đóng gói 1", "NM2 - Đóng gói 2", "NM3 - Đóng gói 3"])
            },
            {
                "name": "Rách màng co / Thùng hở",
                "category": "visual",
                "code": "VIS-10",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": True,
                "is_active": True,
                "description": "Màng PE bọc bảo vệ bị rách hoặc băng keo niêm phong thùng bị đứt",
                "stage": json.dumps(["NM1 - Đóng gói 1", "NM3 - Đóng gói 3"])
            },
            {
                "name": "Nhiễm nấm mốc bề mặt",
                "category": "material",
                "code": "MAT-07",
                "aql_class": "Major",
                "needs_tracking": True,
                "qc_tracking": True,
                "is_active": True,
                "description": "Gỗ bị vệt nấm mốc đen hoặc đốm trắng do độ ẩm vượt chuẩn",
                "stage": json.dumps(["NM1 - Định hình 1", "NM3 - Tạo phôi 3"])
            }
        ]

        added_count = 0
        updated_count = 0
        for item in new_defects:
            existing = db.query(DefectType).filter(
                (DefectType.code == item["code"]) | (DefectType.name == item["name"])
            ).first()

            if existing:
                existing.name = item["name"]
                existing.category = item["category"]
                existing.code = item["code"]
                existing.aql_class = item["aql_class"]
                existing.needs_tracking = item["needs_tracking"]
                existing.qc_tracking = item["qc_tracking"]
                existing.is_active = item["is_active"]
                existing.description = item["description"]
                existing.stage = item["stage"]
                updated_count += 1
                print(f"[UPDATED] {item['code']} - {item['name']}")
            else:
                new_obj = DefectType(**item)
                db.add(new_obj)
                added_count += 1
                print(f"[ADDED] {item['code']} - {item['name']}")

        db.commit()
        print(f"SUCCESSFULLY PROCESSED 10 DEFECTS! Added: {added_count}, Updated: {updated_count}")

    except Exception as e:
        db.rollback()
        print(f"ERROR ADDING DEFECTS: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_ten_defects()
