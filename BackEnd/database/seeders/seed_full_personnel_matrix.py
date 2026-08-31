# -*- coding: utf-8 -*-
"""
Seeder: Nạp dữ liệu Ma trận Nhân sự Chuẩn Logic (30+ Tài Khoản)
Bao gồm Ban Giám Đốc, IT, 19 Nhân sự QLCL/QC, Quản Đốc SX, Tổ Trưởng SX và Công Nhân.
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
from config.security import get_password_hash

def run_seeder():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU NẠP DỮ LIỆU MA TRẬN NHÂN SỰ CHUẨN LOGIC ===")

        # 1. Đảm bảo các Roles cần thiết tồn tại
        role_definitions = [
            {"name": "IT", "desc": "Quản trị hệ thống IT"},
            {"name": "BGD", "desc": "Ban Giám Đốc"},
            {"name": "QLCL", "desc": "Phòng Quản Lý Chất Lượng"},
            {"name": "SX", "desc": "Khối Sản Xuất"},
            {"name": "Quản Lý", "desc": "Quản Lý / Quản Đốc Sản Xuất"},
            {"name": "Tổ Trưởng", "desc": "Tổ Trưởng Các Tổ Công Đoạn"}
        ]

        roles_map = {}
        for r in role_definitions:
            existing_role = db.query(Role).filter(Role.name == r["name"]).first()
            if not existing_role:
                existing_role = Role(name=r["name"], description=r["desc"])
                db.add(existing_role)
                db.flush()
            roles_map[r["name"]] = existing_role.id

        default_perm = db.query(Permission).first()
        perm_id = default_perm.id if default_perm else 1001

        # Mật khẩu mặc định: 123123
        hashed_pwd = get_password_hash("123123")

        # 2. Danh sách Ma trận Nhân sự 5 Khối
        personnel_matrix = [
            # ── KHỐI 1: BAN GIÁM ĐỐC & IT ──────────────────────────────────────
            {
                "employee_id": "NV_BGD_001",
                "username": "bang.bgd",
                "full_name": "Nguyễn Văn Bằng",
                "role_name": "BGD",
                "permission_level": "BGD",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_IT_001",
                "username": "admin",
                "full_name": "Administrator",
                "role_name": "IT",
                "permission_level": "Quản Lý",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_IT_002",
                "username": "my.nd",
                "full_name": "Ngô Diễm My",
                "role_name": "IT",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },

            # ── KHỐI 2: PHÒNG QUẢN LÝ CHẤT LƯỢNG (19 QC REAL) ────────────────
            {
                "employee_id": "NV_QLCL_001",
                "username": "nam.dv",
                "full_name": "Đặng Văn Nam",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_002",
                "username": "hai.dq",
                "full_name": "Đặng Quý Hải",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_003",
                "username": "thanh.hd",
                "full_name": "Hà Đình Thành",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_004",
                "username": "tam.dt",
                "full_name": "Đậu Thị Tâm",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_005",
                "username": "son.hh",
                "full_name": "Huỳnh Hoàng Sơn",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_006",
                "username": "khan.hs",
                "full_name": "Hồ Sỹ Khẩn",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_007",
                "username": "luong.pt",
                "full_name": "Phan Thị Lương",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_008",
                "username": "phuc.dh",
                "full_name": "Đỗ Hữu Phúc",
                "role_name": "QLCL",
                "permission_level": "Quản Lý",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_009",
                "username": "mai.pt",
                "full_name": "Phạm Thị Mai",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_010",
                "username": "kim.ntm",
                "full_name": "Nguyễn Thị Mỹ Kim",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_011",
                "username": "tien.nv",
                "full_name": "Nguyễn Văn Tiến",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_012",
                "username": "xuan.hm",
                "full_name": "Hà Minh Xuân",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_013",
                "username": "uyen.dtl",
                "full_name": "Dương Thị Lệ Uyên",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 4,
                "factory_name": "Văn Phòng",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_015",
                "username": "tuan.dm",
                "full_name": "Đặng Minh Tuấn",
                "role_name": "QLCL",
                "permission_level": "Quản Lý",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_016",
                "username": "anh.tt",
                "full_name": "Trần Thị Ánh",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_017",
                "username": "su.bc",
                "full_name": "Bùi Công Sự",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_018",
                "username": "phuong.nt",
                "full_name": "Nguyễn Thị Phương",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_019",
                "username": "toan.dv",
                "full_name": "Dương Văn Toàn",
                "role_name": "QLCL",
                "permission_level": "Nhân Viên",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },

            # ── KHỐI 3: QUẢN ĐỐC SẢN XUẤT (MANAGERS) ──────────────────────────
            {
                "employee_id": "NV_SX_001",
                "username": "hung.qd",
                "full_name": "Vũ Đình Hùng",
                "role_name": "Quản Lý",
                "permission_level": "Quản Lý",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_SX_002",
                "username": "cuong.qd",
                "full_name": "Trần Quốc Cường",
                "role_name": "Quản Lý",
                "permission_level": "Quản Lý",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_SX_003",
                "username": "long.qd",
                "full_name": "Hoàng Văn Long",
                "role_name": "Quản Lý",
                "permission_level": "Quản Lý",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },

            # ── KHỐI 4: TỔ TRƯỞNG SẢN XUẤT (SUPERVISORS) ───────────────────────
            {
                "employee_id": "NV_TT_001",
                "username": "duy.tt",
                "full_name": "Phạm Văn Duy",
                "role_name": "Tổ Trưởng",
                "permission_level": "Tổ Trưởng",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_TT_002",
                "username": "tuan.tt",
                "full_name": "Lê Anh Tuấn",
                "role_name": "Tổ Trưởng",
                "permission_level": "Tổ Trưởng",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_TT_003",
                "username": "tinh.tt",
                "full_name": "Nguyễn Văn Tính",
                "role_name": "Tổ Trưởng",
                "permission_level": "Tổ Trưởng",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },

            # ── KHỐI 5: CÔNG NHÂN SẢN XUẤT (WORKERS) ─────────────────────────
            {
                "employee_id": "NV_QLCL_020",
                "username": "thuy.ntt",
                "full_name": "Nguyễn Thị Thu Thủy",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_021",
                "username": "tinh.bt",
                "full_name": "Bùi Thị Tính",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 1,
                "factory_name": "Vaniti Phân Xưởng 1",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_022",
                "username": "hien.dtk",
                "full_name": "Đào Thị Kim Hiền",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_023",
                "username": "trinh.htd",
                "full_name": "Huỳnh Thị Diễm Trinh",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 2,
                "factory_name": "Vaniti Phân Xưởng 2",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_024",
                "username": "hanh.bh",
                "full_name": "Bùi Hồng Hạnh",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            },
            {
                "employee_id": "NV_QLCL_025",
                "username": "lai.htd",
                "full_name": "Huỳnh Thị Diễm Lại",
                "role_name": "SX",
                "permission_level": "Công Nhân",
                "factory_id": 3,
                "factory_name": "Furniture nhà máy 3",
                "is_web_allowed": True,
                "is_mobile_allowed": True
            }
        ]

        created_count = 0
        updated_count = 0

        for p in personnel_matrix:
            role_id = roles_map.get(p["role_name"], 1)

            # Tìm kiếm bản ghi sẵn có
            existing = db.query(Account).filter(
                (Account.username == p["username"]) | 
                (Account.employee_id == p["employee_id"])
            ).first()

            if existing:
                existing.username = p["username"]
                existing.employee_id = p["employee_id"]
                existing.full_name = p["full_name"]
                existing.status = "Đang sử dụng"
                existing.is_active = True
                existing.permission_level = p["permission_level"]
                existing.is_mobile_allowed = p["is_mobile_allowed"]
                existing.is_web_allowed = p["is_web_allowed"]
                existing.department_id = role_id
                existing.factory_id = p["factory_id"]
                existing.factory_name = p["factory_name"]
                db.flush()

                # Đồng bộ bảng departments liên kết
                leg_dept = db.query(LegacyDepartment).filter(LegacyDepartment.account_id == existing.id).first()
                if leg_dept:
                    leg_dept.role_id = role_id
                else:
                    db.add(LegacyDepartment(account_id=existing.id, role_id=role_id, permission_id=perm_id))

                updated_count += 1
                print(f"[UPDATED] User: {p['username']:12s} | Name: {p['full_name']:22s} | Role: {p['role_name']:10s} | Factory: {p['factory_name']}")
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
                    is_mobile_allowed=p["is_mobile_allowed"],
                    is_web_allowed=p["is_web_allowed"],
                    department_id=role_id,
                    permission_id=perm_id,
                    factory_id=p["factory_id"],
                    factory_name=p["factory_name"]
                )
                db.add(new_acc)
                db.flush()

                db.add(LegacyDepartment(account_id=new_acc.id, role_id=role_id, permission_id=perm_id))
                created_count += 1
                print(f"[CREATED] User: {p['username']:12s} | Name: {p['full_name']:22s} | Role: {p['role_name']:10s} | Factory: {p['factory_name']}")

        db.commit()
        print(f"\n=== HOÀN THÀNH: Đã tạo mới {created_count} & cập nhật {updated_count} tài khoản nhân sự thành công! ===")
    except Exception as e:
        db.rollback()
        print(f"[LỖI SEEDER]: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
