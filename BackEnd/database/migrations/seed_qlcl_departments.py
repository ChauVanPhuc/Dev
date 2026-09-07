# -*- coding: utf-8 -*-
"""
Migration script: Bổ sung cột responsibility_scope vào bảng departments
và seed/đồng bộ dữ liệu 11 vị trí bộ phận thuộc phòng QLCL (role_id = 1).
"""
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Thêm đường dẫn BackEnd vào sys.path để import các module
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


from sqlalchemy import text
from config.database import engine, SessionLocal
import app.models
from modules.auth.models.departments import Department
from modules.auth.models.role import Role

def seed_qlcl_departments():
    print("[MIGRATION] Bắt đầu đồng bộ danh mục Bộ phận QLCL...")
    
    # 1. Thêm cột responsibility_scope vào bảng departments nếu chưa có
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE departments ADD responsibility_scope NVARCHAR(1000) NULL"))
            print("[MIGRATION] Đã thêm cột 'responsibility_scope' vào bảng departments.")
    except Exception as e:
        print("[MIGRATION] Cột 'responsibility_scope' đã tồn tại hoặc không cần tạo lại.")

    db = SessionLocal()
    try:
        # Tìm Role QLCL (Role ID = 1 hoặc tìm theo tên)
        qlcl_role = db.query(Role).filter(Role.name == "QLCL").first()
        qlcl_role_id = qlcl_role.id if qlcl_role else 1
        
        # Danh sách 11 Vị trí / Bộ phận thuộc QLCL theo Cẩm nang 2026
        qlcl_departments_data = [
            {
                "code": "MANAGER",
                "name": "Trưởng phòng QLCL",
                "responsibility_scope": "Phê duyệt tiêu chuẩn, mục tiêu & xử lý sự cố cấp toàn nhà máy"
            },
            {
                "code": "QA",
                "name": "Nhân Viên Kiểm Soát Quy Trình",
                "responsibility_scope": "Soạn thảo quy trình chuẩn (CTQ/SOS), Audit tuân thủ & quản lý IQC/FQC"
            },
            {
                "code": "CQA",
                "name": "Customer QA",
                "responsibility_scope": "Giải quyết khiếu nại khách hàng, báo cáo CAPA & làm việc đoàn Audit"
            },
            {
                "code": "QSE",
                "name": "Quality System Engineer",
                "responsibility_scope": "Quản lý ISO 9001, 5S, FSC, Audit nội bộ & Đào tạo nhận thức"
            },
            {
                "code": "QA_ADMIN",
                "name": "Quản lý Tài liệu & Thiết bị",
                "responsibility_scope": "Quản lý bản vẽ/tài liệu, hiệu chuẩn dụng cụ đo & nhập liệu báo cáo"
            },
            {
                "code": "PQA",
                "name": "Process QA",
                "responsibility_scope": "Audit tuần tra xưởng, chấn chỉnh quy trình & giảm thiểu lỗi lặp lại"
            },
            {
                "code": "QC_LEAD",
                "name": "Tổ trưởng QC",
                "responsibility_scope": "Phân công ca, chốt tranh chấp Đạt/NG & tổng hợp báo cáo QC ca"
            },
            {
                "code": "IQC",
                "name": "QC Kiểm Tra Nhập Kho",
                "responsibility_scope": "Kiểm tra gỗ, phụ kiện, sơn & vật tư đầu vào tại Kho"
            },
            {
                "code": "PQC1",
                "name": "QC Định Hình - Lắp Ráp",
                "responsibility_scope": "Kiểm tra phôi gỗ, gia công định hình & lắp ráp - chà nhám"
            },
            {
                "code": "PQC2",
                "name": "QC Sơn - Đóng Gói",
                "responsibility_scope": "Kiểm tra màu sơn UV, bít lỗ ghim & màng bã bột sơn"
            },
            {
                "code": "FQC",
                "name": "QC Final",
                "responsibility_scope": "Kiểm tra rút mẫu thành phẩm, đóng gói, tem nhãn & thùng xuất xưởng"
            }
        ]

        added_count = 0
        updated_count = 0

        for item in qlcl_departments_data:
            # Tìm bản ghi đã tồn tại theo code hoặc name trong role QLCL
            existing = db.query(Department).filter(
                Department.role_id == qlcl_role_id,
                Department.account_id.is_(None),
                (Department.code == item["code"]) | (Department.name == item["name"])
            ).first()

            if existing:
                # Cập nhật thông tin và responsibility_scope
                existing.code = item["code"]
                existing.name = item["name"]
                existing.responsibility_scope = item["responsibility_scope"]
                updated_count += 1
                print(f" -> Đã cập nhật bộ phận: [{existing.code}] {existing.name}")
            else:
                # Thêm mới
                new_dept = Department(
                    code=item["code"],
                    name=item["name"],
                    role_id=qlcl_role_id,
                    responsibility_scope=item["responsibility_scope"]
                )
                db.add(new_dept)
                added_count += 1
                print(f" -> Đã thêm mới bộ phận: [{item['code']}] {item['name']}")

        db.commit()
        print(f"[MIGRATION] Hoàn thành đồng bộ QLCL Departments! Thêm mới: {added_count}, Cập nhật: {updated_count}.")

    except Exception as err:
        db.rollback()
        print(f"[MIGRATION ERROR] Lỗi khi đồng bộ QLCL departments: {err}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_qlcl_departments()
