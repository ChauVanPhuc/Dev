import sys
import os

# Thêm thư mục gốc vào PYTHONPATH để import được các module của dự án
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal
from modules.equipment.models.equipment import Equipment
import datetime

def seed_data():
    db = SessionLocal()
    try:
        # Danh sách 10 thiết bị mẫu
        sample_equipments = [
            {"name": "Thước đo điện tử", "code": "EQP-001", "type": "Đo lường", "status": "Bình thường"},
            {"name": "Máy đo độ ẩm gỗ", "code": "EQP-002", "type": "Đo lường", "status": "Cần thay mới"},
            {"name": "Máy cắt 2 đầu", "code": "EQP-003", "type": "Sản xuất", "status": "Bình thường"},
            {"name": "Máy chà nhám", "code": "EQP-004", "type": "Sản xuất", "status": "Bảo trì"},
            {"name": "Thước đo độ cong", "code": "EQP-005", "type": "Đo lường", "status": "Chưa kiểm tra"},
            {"name": "Máy nén khí", "code": "EQP-006", "type": "Phụ trợ", "status": "Bình thường"},
            {"name": "Súng phun sơn", "code": "EQP-007", "type": "Sản xuất", "status": "Bình thường"},
            {"name": "Giá phơi sản phẩm 48s", "code": "EQP-008", "type": "Giá kệ", "status": "Bình thường"},
            {"name": "Thước kẹp 300mm", "code": "EQP-009", "type": "Đo lường", "status": "Bình thường"},
            {"name": "Máy bào 4 mặt", "code": "EQP-010", "type": "Sản xuất", "status": "Cần thay mới"},
        ]

        for eq in sample_equipments:
            # Kiểm tra xem mã thiết bị đã tồn tại chưa
            exists = db.query(Equipment).filter(Equipment.code == eq["code"]).first()
            if not exists:
                new_eq = Equipment(
                    name=eq["name"],
                    code=eq["code"],
                    type=eq["type"],
                    status=eq["status"],
                    purchase_date=datetime.date.today(),
                    maintenance_cycle=30
                )
                db.add(new_eq)
                print(f"Added: {eq['name']}")
            else:
                print(f"Skipped (Exists): {eq['name']}")
        
        db.commit()
        print("--- Seed data completed successfully! ---")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
