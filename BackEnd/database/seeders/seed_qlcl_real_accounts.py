# -*- coding: utf-8 -*-
"""
Seeder: Cập nhật 19 tài khoản nhân sự QLCL thực tế từ Ảnh 1 theo Option A (Tên đăng nhập dạng nam.dv, hai.dq...).
Đồng thời xóa hoàn toàn các tài khoản dummy/test cũ (nvDH, nvS, nvK, nvF, nvDH2, nvS2, nvK2, nvF2, nvDH3, nvS3, nvK3, nvF3).
"""
import sys
import os
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department as LegacyDepartment
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.hr.models.hr_models import HRFactoryStructure, HREmployee, HRDepartment
from config.security import get_password_hash

def run_seeder():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU QUY TRÌNH ĐỒNG BỘ 19 NHÂN SỰ QLCL ===")

        # 1. Xóa hoàn toàn các tài khoản test cũ
        dummy_usernames = [
            'nvDH', 'nvS', 'nvK', 'nvF',
            'nvDH2', 'nvS2', 'nvK2', 'nvF2',
            'nvDH3', 'nvS3', 'nvK3', 'nvF3'
        ]
        
        dummy_accounts = db.query(Account).filter(Account.username.in_(dummy_usernames)).all()
        if dummy_accounts:
            dummy_ids = [a.id for a in dummy_accounts]
            # Xóa các liên kết trong bảng departments (Legacy Junction Table)
            db.query(LegacyDepartment).filter(LegacyDepartment.account_id.in_(dummy_ids)).delete(synchronize_session=False)
            # Xóa các tài khoản
            db.query(Account).filter(Account.id.in_(dummy_ids)).delete(synchronize_session=False)
            db.commit()
            print(f"[THÀNH CÔNG] Đã xóa hoàn toàn {len(dummy_accounts)} tài khoản dummy test ({', '.join(dummy_usernames)}) khỏi DB.")
        else:
            print("[THÔNG BÁO] Không tìm thấy tài khoản dummy cũ để xóa.")

        # 2. Chuẩn bị Roles & Permissions & Factories
        qlcl_role = db.query(Role).filter(Role.name == "QLCL").first()
        if not qlcl_role:
            qlcl_role = Role(name="QLCL", description="Phòng Quản Lý Chất Lượng")
            db.add(qlcl_role)
            db.flush()

        default_perm = db.query(Permission).filter(Permission.name == "Nhân Viên").first()
        perm_id = default_perm.id if default_perm else 1001

        # Mapping Factory Structures (ID: 1 -> NM1, 2 -> NM2, 3 -> NM3, 4 -> Văn Phòng)
        factories_map = {
            1: "Vaniti Phân Xưởng 1",
            2: "Vaniti Phân Xưởng 2",
            3: "Furniture nhà máy 3",
            4: "Văn Phòng"
        }

        # 3. Danh sách 19 nhân sự QLCL từ Ảnh 1 theo Option A
        qlcl_personnel = [
            {
                "employee_id": "NV_QLCL_001",
                "username": "nam.dv",
                "full_name": "Đặng Văn Nam",
                "role_title": "QA",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng"
            },
            {
                "employee_id": "NV_QLCL_002",
                "username": "hai.dq",
                "full_name": "Đặng Quý Hải",
                "role_title": "QC - Nhập Kho",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng"
            },
            {
                "employee_id": "NV_QLCL_003",
                "username": "thanh.hd",
                "full_name": "Hà Đình Thành",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1"
            },
            {
                "employee_id": "NV_QLCL_004",
                "username": "tam.dt",
                "full_name": "Đậu Thị Tâm",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_005",
                "username": "son.hh",
                "full_name": "Huỳnh Hoàng Sơn",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_006",
                "username": "khan.hs",
                "full_name": "Hồ Sỹ Khẩn",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_007",
                "username": "luong.pt",
                "full_name": "Phan Thị Lương",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_008",
                "username": "phuc.dh",
                "full_name": "Đỗ Hữu Phúc",
                "role_title": "QC Lead",
                "permission_level": "Quản Lý",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3"
            },
            {
                "employee_id": "NV_QLCL_009",
                "username": "mai.pt",
                "full_name": "Phạm Thị Mai",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_010",
                "username": "kim.ntm",
                "full_name": "Nguyễn Thị Mỹ Kim",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_011",
                "username": "tien.nv",
                "full_name": "Nguyễn Văn Tiến",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1"
            },
            {
                "employee_id": "NV_QLCL_012",
                "username": "xuan.hm",
                "full_name": "Hà Minh Xuân",
                "role_title": "QA",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng"
            },
            {
                "employee_id": "NV_QLCL_013",
                "username": "uyen.dtl",
                "full_name": "Dương Thị Lệ Uyên",
                "role_title": "QA",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng"
            },
            {
                "employee_id": "NV_QLCL_014",
                "username": "my.nd",
                "full_name": "Ngô Diễm My",
                "role_title": "QA",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng"
            },
            {
                "employee_id": "NV_QLCL_015",
                "username": "tuan.dm",
                "full_name": "Đặng Minh Tuấn",
                "role_title": "QC Lead",
                "permission_level": "Quản Lý",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_016",
                "username": "anh.tt",
                "full_name": "Trần Thị Ánh",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3"
            },
            {
                "employee_id": "NV_QLCL_017",
                "username": "su.bc",
                "full_name": "Bùi Công Sự",
                "role_title": "QC Định Hình - Lắp Ráp",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2"
            },
            {
                "employee_id": "NV_QLCL_018",
                "username": "phuong.nt",
                "full_name": "Nguyễn Thị Phương",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3"
            },
            {
                "employee_id": "NV_QLCL_019",
                "username": "toan.dv",
                "full_name": "Dương Văn Toàn",
                "role_title": "QC Sơn - Đóng Gói",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1"
            }
        ]

        # Mật khẩu mặc định hóa: 123123
        hashed_pwd = get_password_hash("123123")
        created_count = 0
        updated_count = 0

        for p in qlcl_personnel:
            # Kiểm tra xem user hoặc employee_id đã tồn tại chưa
            existing = db.query(Account).filter(
                (Account.username == p["username"]) | 
                (Account.employee_id == p["employee_id"]) |
                (Account.full_name == p["full_name"])
            ).first()

            if existing:
                existing.username = p["username"]
                existing.employee_id = p["employee_id"]
                existing.full_name = p["full_name"]
                existing.status = "Đang sử dụng"
                existing.is_active = True
                existing.permission_level = p["permission_level"]
                existing.is_mobile_allowed = True
                existing.is_web_allowed = True
                existing.department_id = qlcl_role.id
                existing.factory_id = p["factory_id"]
                existing.factory_name = p["factory_name"]
                db.flush()

                # Đồng bộ Legacy Department
                leg_dept = db.query(LegacyDepartment).filter(LegacyDepartment.account_id == existing.id).first()
                if not leg_dept:
                    db.add(LegacyDepartment(account_id=existing.id, role_id=qlcl_role.id, permission_id=perm_id))

                updated_count += 1
                print(f"[CẬP NHẬT] Nhân sự: {p['full_name']} | Username: {p['username']} | Mã NV: {p['employee_id']} | Nhà máy: {p['factory_name']}")
            else:
                new_acc = Account(
                    username=p["username"],
                    employee_id=p["employee_id"],
                    full_name=p["full_name"],
                    hashed_password=hashed_pwd,
                    is_active=True,
                    status="Đang sử dụng",
                    created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    permission_level=p["permission_level"],
                    is_mobile_allowed=True,
                    is_web_allowed=True,
                    department_id=qlcl_role.id,
                    permission_id=perm_id,
                    factory_id=p["factory_id"],
                    factory_name=p["factory_name"]
                )
                db.add(new_acc)
                db.flush()

                db.add(LegacyDepartment(account_id=new_acc.id, role_id=qlcl_role.id, permission_id=perm_id))
                created_count += 1
                print(f"[TẠO MỚI] Nhân sự: {p['full_name']} | Username: {p['username']} | Mã NV: {p['employee_id']} | Nhà máy: {p['factory_name']}")

        db.commit()
        print(f"\n=== HOÀN THÀNH: Đã tạo mới {created_count} & cập nhật {updated_count} tài khoản nhân sự QLCL thành công! ===")
    except Exception as e:
        db.rollback()
        print(f"[LỖI] Thất bại khi seeding tài khoản QLCL: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
