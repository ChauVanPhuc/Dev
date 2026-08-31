import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal, engine, Base
from modules.kpi.models.quality_employee import QualityEmployee

def fix_and_reseed():
    db = SessionLocal()
    try:
        # Drop existing table if exists to change column types to NVARCHAR
        db.execute(text("IF OBJECT_ID('quality_employees', 'U') IS NOT NULL DROP TABLE quality_employees"))
        db.commit()
        print("[OK] Dropped old quality_employees table")

        # Create new table using updated Unicode schema
        QualityEmployee.__table__.create(bind=engine, checkfirst=True)
        print("[OK] Re-created quality_employees table with NVARCHAR types")

        initial_list = [
            {"employee_id": "NV_QLCL_001", "full_name": "Đặng Văn Nam", "department": "Phòng QLCL", "stage": "Kiểm định QLCL", "factory": "Nhà máy 1", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_002", "full_name": "Đặng Quý Hải", "department": "Phòng QLCL", "stage": "Định hình 1", "factory": "Nhà máy 1", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_003", "full_name": "Hà Đình Thành", "department": "Phòng QLCL", "stage": "Định hình 2", "factory": "Nhà máy 1", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_004", "full_name": "Đậu Thị Tâm", "department": "Phòng QLCL", "stage": "Chuẩn bị NL", "factory": "Nhà máy 1", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_005", "full_name": "Huỳnh Hoàng Sơn", "department": "Bộ phận QC NM2", "stage": "Gia công CNC", "factory": "Nhà máy 2", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_006", "full_name": "Hồ Sỹ Khấn", "department": "Bộ phận QC NM2", "stage": "Sơn sấy", "factory": "Nhà máy 2", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_007", "full_name": "Phan Thị Lương", "department": "Bộ phận QC NM2", "stage": "Lắp ráp", "factory": "Nhà máy 2", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_008", "full_name": "Đỗ Hữu Phúc", "department": "Bộ phận QC NM3", "stage": "Đóng gói", "factory": "Nhà máy 3", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_009", "full_name": "Phạm Thị Mai", "department": "Bộ phận QC NM3", "stage": "Kiểm thành phẩm", "factory": "Nhà máy 3", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_010", "full_name": "Nguyễn Thị Mỹ Kim", "department": "Bộ phận QC NM3", "stage": "Xuất hàng", "factory": "Nhà máy 3", "latest_rating": "C"},
            {"employee_id": "NV_QLCL_011", "full_name": "Nguyễn Văn Tiến", "department": "Phòng QA", "stage": "Đánh giá QA", "factory": "Nhà máy 1", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_012", "full_name": "Hà Minh Xuân", "department": "Bộ phận QC NM1", "stage": "Ép nhựa", "factory": "Nhà máy 1", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_013", "full_name": "Dương Thị Lệ Uyên", "department": "Bộ phận QC NM2", "stage": "Xử lý bề mặt", "factory": "Nhà máy 2", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_015", "full_name": "Đặng Minh Tuấn", "department": "Bộ phận QC NM2", "stage": "Gia công CNC", "factory": "Nhà máy 2", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_016", "full_name": "Trần Thị Ánh", "department": "Bộ phận QC NM1", "stage": "Định hình 1", "factory": "Nhà máy 1", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_017", "full_name": "Bùi Công Sự", "department": "Bộ phận QC NM2", "stage": "Gia công", "factory": "Nhà máy 2", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_018", "full_name": "Nguyễn Thị Phương", "department": "Bộ phận QC NM3", "stage": "Đóng gói", "factory": "Nhà máy 3", "latest_rating": "A"},
            {"employee_id": "NV_QLCL_019", "full_name": "Dương Văn Toàn", "department": "Bộ phận QC NM3", "stage": "Xuất hàng", "factory": "Nhà máy 3", "latest_rating": "C"},
            {"employee_id": "NV_QLCL_020", "full_name": "Nguyễn Thị Thu Thủy", "department": "Bộ phận Sản xuất", "stage": "Sản xuất 1", "factory": "Nhà máy 1", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_021", "full_name": "Bùi Thị Tình", "department": "Bộ phận Sản xuất", "stage": "Sản xuất 2", "factory": "Nhà máy 1", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_022", "full_name": "Đỗ Thị Kim Hiền", "department": "Bộ phận Sản xuất", "stage": "Nhân Viên SX", "factory": "Nhà máy 2", "latest_rating": "C"},
            {"employee_id": "NV_QLCL_023", "full_name": "Huỳnh Thị Diễm Trinh", "department": "Bộ phận Sản xuất", "stage": "Nhân Viên SX", "factory": "Nhà máy 2", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_024", "full_name": "Bùi Hồng Hạnh", "department": "Bộ phận Sản xuất", "stage": "Đóng gói SX", "factory": "Nhà máy 3", "latest_rating": "B"},
            {"employee_id": "NV_QLCL_025", "full_name": "Huỳnh Thị Diễm Lài", "department": "Bộ phận Sản xuất", "stage": "Kiểm thành phẩm", "factory": "Nhà máy 3", "latest_rating": "A"}
        ]

        for item in initial_list:
            emp = QualityEmployee(**item)
            db.add(emp)

        db.commit()
        print(f"[OK] Re-seeded {len(initial_list)} QC records using SQLAlchemy Unicode objects!")

        # Verify
        check_items = db.query(QualityEmployee).limit(5).all()
        for c in check_items:
            print(c.employee_id, c.full_name, c.stage, c.factory)

    except Exception as e:
        db.rollback()
        print("Lỗi:", e)
    finally:
        db.close()

if __name__ == '__main__':
    fix_and_reseed()
