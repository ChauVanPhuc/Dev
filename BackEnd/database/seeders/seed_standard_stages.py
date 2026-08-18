import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from config.database import SessionLocal
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage

STAGES_DATA = [
    {
        "code": "CD01",
        "name": "Đầu vào",
        "sequence": 1,
        "description": "Kiểm tra chất lượng nguyên vật liệu & sản phẩm mua hàng đầu vào (IQC)",
        "is_active": True
    },
    {
        "code": "CD02",
        "name": "Tạo Phôi",
        "sequence": 2,
        "description": "Cắt gọt, xẻ gỗ, gia công tạo phôi chi tiết ban đầu",
        "is_active": True
    },
    {
        "code": "CD03",
        "name": "Định Hình",
        "sequence": 3,
        "description": "Phay, bào, đục, tạo kiểu dáng chi tiết",
        "is_active": True
    },
    {
        "code": "CD04",
        "name": "Lắp Ráp",
        "sequence": 4,
        "description": "Ghép nối chi tiết, dán keo, hoàn thiện khung cấu trúc sản phẩm",
        "is_active": True
    },
    {
        "code": "CD05",
        "name": "Sơn",
        "sequence": 5,
        "description": "Sơn lót, chà nhám, sơn phủ màu, sơn bóng hoàn thiện bề mặt",
        "is_active": True
    },
    {
        "code": "CD06",
        "name": "Đóng Gói",
        "sequence": 6,
        "description": "Kiểm tra thành phẩm (PQC/FQC), dán tem nhãn, đóng thùng carton",
        "is_active": True
    },
    {
        "code": "CD07",
        "name": "Lưu Kho",
        "sequence": 7,
        "description": "Nhập kho thành phẩm, lưu trữ và sẵn sàng xuất hàng",
        "is_active": True
    }
]

def seed_stages():
    db = SessionLocal()
    try:
        print("Seeding 7 standard production stages...")
        for item in STAGES_DATA:
            existing = db.query(Stage).filter(Stage.name == item["name"]).first()
            if not existing:
                stage = Stage(
                    code=item["code"],
                    name=item["name"],
                    sequence=item["sequence"],
                    description=item["description"],
                    is_active=item["is_active"]
                )
                db.add(stage)
                print(f"  + Added stage: [{item['code']}] {item['name']}".encode('utf-8', errors='ignore').decode('utf-8'))
            else:
                existing.code = item["code"]
                existing.sequence = item["sequence"]
                existing.description = item["description"]
                existing.is_active = item["is_active"]
                print(f"  * Updated stage: [{item['code']}] {item['name']}".encode('utf-8', errors='ignore').decode('utf-8'))
        db.commit()
        print("[OK] Successfully seeded 7 standard production stages!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed stages: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_stages()
