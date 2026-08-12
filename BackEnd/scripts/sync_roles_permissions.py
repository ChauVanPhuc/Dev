# -*- coding: utf-8 -*-
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import models
from config.database import SessionLocal, engine
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage
from modules.auth.models.departments import Department
from modules.auth.models.accounts import Account
from modules.system.models.system_screen import SystemScreen
from modules.system.models.system_sidebar import SystemSidebar
from sqlalchemy import text

def sync_roles_and_permissions():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU ĐỒNG BỘ BỘ PHẬN, CHỨC VỤ VÀ CÔNG ĐOẠN ===")
        
        # 1. Đảm bảo toàn bộ công đoạn Nhà máy (NM1, NM2, NM3) tồn tại
        default_stages = [
            # NM1
            {"name": "NM1 - Tạo phôi 1", "description": "Công đoạn Tạo phôi - Nhà máy 1"},
            {"name": "NM1 - Định hình mặt tiền 1", "description": "Công đoạn Định hình mặt tiền - Nhà máy 1"},
            {"name": "NM1 - Định hình tủ 1", "description": "Công đoạn Định hình tủ - Nhà máy 1"},
            {"name": "NM1 - Lắp ráp mặt tiền 1", "description": "Công đoạn Lắp ráp mặt tiền - Nhà máy 1"},
            {"name": "NM1 - Lắp ráp tủ 1", "description": "Công đoạn Lắp ráp tủ - Nhà máy 1"},
            {"name": "NM1 - Sơn Pallet 1", "description": "Công đoạn Sơn Pallet - Nhà máy 1"},
            {"name": "NM1 - Sơn treo 1", "description": "Công đoạn Sơn treo - Nhà máy 1"},
            {"name": "NM1 - Đóng gói 1", "description": "Công đoạn Đóng gói - Nhà máy 1"},
            {"name": "NM1 - QC / Kiểm định 1", "description": "Công đoạn Kiểm tra chất lượng - Nhà máy 1"},

            # NM2
            {"name": "NM2 - Định hình mặt tiền 2", "description": "Công đoạn Định hình mặt tiền - Nhà máy 2"},
            {"name": "NM2 - Định hình tủ 2", "description": "Công đoạn Định hình tủ - Nhà máy 2"},
            {"name": "NM2 - Lắp ráp mặt tiền 2", "description": "Công đoạn Lắp ráp mặt tiền - Nhà máy 2"},
            {"name": "NM2 - Lắp ráp tủ 2", "description": "Công đoạn Lắp ráp tủ - Nhà máy 2"},
            {"name": "NM2 - Sơn Pallet 2", "description": "Công đoạn Sơn Pallet - Nhà máy 2"},
            {"name": "NM2 - Sơn treo 2", "description": "Công đoạn Sơn treo - Nhà máy 2"},
            {"name": "NM2 - Đóng gói 2", "description": "Công đoạn Đóng gói - Nhà máy 2"},

            # NM3
            {"name": "NM3 - Tạo phôi 3", "description": "Công đoạn Tạo phôi - Nhà máy 3"},
            {"name": "NM3 - Định hình 3", "description": "Công đoạn Định hình - Nhà máy 3"},
            {"name": "NM3 - Lắp ráp 3", "description": "Công đoạn Lắp ráp - Nhà máy 3"},
            {"name": "NM3 - Sơn 3", "description": "Công đoạn Sơn - Nhà máy 3"},
            {"name": "NM3 - Đóng gói 3", "description": "Công đoạn Đóng gói - Nhà máy 3"}
        ]

        for s in default_stages:
            st_obj = db.query(Stage).filter(Stage.name == s["name"]).first()
            if not st_obj:
                st_obj = Stage(name=s["name"], description=s["description"])
                db.add(st_obj)
        db.commit()
        all_stages = db.query(Stage).all()
        print(f"[OK] Tổng cộng {len(all_stages)} công đoạn nhà máy đã sẵn sàng.")

        # 2. Đồng bộ danh mục Bộ phận (Roles)
        target_roles = {
            "IT": "Bộ phận Công nghệ thông tin (IT)",
            "BGD": "Ban Giám Đốc điều hành",
            "Sx": "Phòng Sản Xuất",
            "QLCL": "Phòng Quản Lý Chất Lượng"
        }

        roles_db = {}
        for r_name, r_desc in target_roles.items():
            role_obj = db.query(Role).filter(Role.name == r_name).first()
            if not role_obj:
                role_obj = Role(name=r_name, description=r_desc, is_active=True)
                db.add(role_obj)
                db.flush()
            else:
                role_obj.description = r_desc
                role_obj.is_active = True
            roles_db[r_name] = role_obj

        db.commit()
        print(f"[OK] Đã chuẩn hóa {len(roles_db)} bộ phận (Roles): {list(roles_db.keys())}")

        # 3. Đồng bộ danh mục Chức vụ (Permissions)
        target_permissions = {
            "NV QC": "Nhân Viên Kiểm tra Chất lượng (QC)",
            "NV QA": "Nhân Viên Đảm bảo Chất lượng (QA)",
            "QC Lead": "QC Trưởng Nhóm",
            "Thống kê": "Thống kê sản xuất & chất lượng",
            "Quản lý": "Quản lý cấp trung / Tổ trưởng",
            "NV SX": "Nhân Viên Vận hành Sản Xuất",
            "Admin": "Quản trị hệ thống toàn quyền",
            "Giám đốc": "Ban Giám Đốc"
        }

        perms_db = {}
        for p_name, p_desc in target_permissions.items():
            perm_obj = db.query(Permission).filter(Permission.name == p_name).first()
            if not perm_obj:
                perm_obj = Permission(name=p_name, description=p_desc, is_active=True)
                db.add(perm_obj)
                db.flush()
            else:
                perm_obj.description = p_desc
                perm_obj.is_active = True
            perms_db[p_name] = perm_obj

        db.commit()
        print(f"[OK] Đã chuẩn hóa {len(perms_db)} chức vụ (Permissions): {list(perms_db.keys())}")

        # 4. Gán liên kết Bộ phận ↔ Chức vụ (role_permission)
        role_to_perms = {
            "IT": ["Admin", "Quản lý"],
            "BGD": ["Giám đốc", "Admin"],
            "Sx": ["NV SX", "Thống kê", "Quản lý"],
            "QLCL": ["NV QC", "NV QA", "QC Lead", "Thống kê", "Quản lý"]
        }

        # Clear existing role_permission links cleanly
        db.execute(text("DELETE FROM role_permission"))
        db.commit()

        for r_name, p_list in role_to_perms.items():
            role_obj = roles_db[r_name]
            role_obj.permissions = []
            for p_name in p_list:
                perm_obj = perms_db[p_name]
                role_obj.permissions.append(perm_obj)
            print(f"  -> Bộ phận '{r_name}' được gán {len(role_obj.permissions)} chức vụ: {p_list}")

        db.commit()
        print("[OK] Đã gán đầy đủ quan hệ role_permission.")

        # 5. Gán liên kết Chức vụ ↔ Công đoạn nhà máy (permission_stage)
        # Clear existing permission_stage cleanly
        db.execute(text("DELETE FROM permission_stage"))
        db.commit()

        stage_assigned_perms = ["NV SX", "NV QC", "NV QA", "QC Lead", "Thống kê", "Quản lý", "Admin"]
        for p_name in stage_assigned_perms:
            perm_obj = perms_db[p_name]
            perm_obj.stages = all_stages
            print(f"  -> Chức vụ '{p_name}' được liên kết {len(all_stages)} công đoạn nhà máy.")

        db.commit()
        print("[OK] Đã gán đầy đủ quan hệ permission_stage cho các công đoạn nhà máy.")

        # 6. Thiết lập default_permissions JSON cho từng Chức vụ
        # Admin / Giám đốc: Full quyền
        # NV SX: Quyền sản xuất
        # NV QC: Quyền QC
        # Quản lý / Thống kê: Quyền xem & xuất file
        screens = db.query(SystemScreen).all()
        all_screen_codes = [s.current_code for s in screens if s.current_code]

        admin_perms = {code: "read,create,edit,delete,approve,export_import" for code in all_screen_codes}
        perms_db["Admin"].default_permissions = json.dumps(admin_perms, ensure_ascii=False)
        perms_db["Giám đốc"].default_permissions = json.dumps(admin_perms, ensure_ascii=False)

        qc_perms = {}
        sx_perms = {}
        for code in all_screen_codes:
            if any(term in code.lower() for term in ["qc", "qa", "inspect", "defect", "quality", "report"]):
                qc_perms[code] = "read,create,edit,approve,export_import"
            elif any(term in code.lower() for term in ["prod", "plan", "delivery", "bom", "order", "transfer"]):
                sx_perms[code] = "read,create,edit"

        perms_db["NV QC"].default_permissions = json.dumps(qc_perms, ensure_ascii=False)
        perms_db["NV QA"].default_permissions = json.dumps(qc_perms, ensure_ascii=False)
        perms_db["QC Lead"].default_permissions = json.dumps(qc_perms, ensure_ascii=False)
        perms_db["NV SX"].default_permissions = json.dumps(sx_perms, ensure_ascii=False)

        db.commit()
        print("[OK] Đã thiết lập cấu hình default_permissions cho các chức vụ.")

        # 7. Đồng bộ kiểm tra các tài khoản người dùng hiện có trong DB
        phuc_user = db.query(Account).filter(Account.username == 'phuc').first()
        if phuc_user:
            dept = db.query(Department).filter(Department.account_id == phuc_user.id).first()
            if not dept:
                dept = Department(
                    account_id=phuc_user.id,
                    role_id=roles_db["IT"].id,
                    permission_id=perms_db["Admin"].id
                )
                db.add(dept)
            else:
                dept.role_id = roles_db["IT"].id
                dept.permission_id = perms_db["Admin"].id
            db.commit()
            print(f"[OK] Tài khoản '{phuc_user.username}' đã được đồng bộ với Role IT (ID={roles_db['IT'].id}) và Permission Admin (ID={perms_db['Admin'].id}).")

        print("=== HOÀN TẤT ĐỒNG BỘ THÀNH CÔNG! ===")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Quá trình đồng bộ gặp lỗi: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    sync_roles_and_permissions()
