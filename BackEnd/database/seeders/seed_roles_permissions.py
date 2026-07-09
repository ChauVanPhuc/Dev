import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from config.database import SessionLocal
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage
from modules.auth.models.associations import role_permission, permission_stage
from sqlalchemy import text

db = SessionLocal()

try:
    print("Performing de-duplication cleanup of roles in database...")
    # Chuyển đổi các liên kết của departments từ ID 10 -> 3 và ID 11 -> 4
    db.execute(text("UPDATE departments SET role_id = 3 WHERE role_id = 10"))
    db.execute(text("UPDATE departments SET role_id = 4 WHERE role_id = 11"))
    db.commit()

    # Xóa liên kết quyền cũ
    db.execute(text("DELETE FROM role_permission WHERE role_id IN (10, 11)"))
    # Xóa các dòng vai trò thừa
    db.execute(text("DELETE FROM roles WHERE id IN (10, 11)"))
    db.commit()

    # 1. Lấy tất cả công đoạn (stages) đang có trong hệ thống
    all_stages = db.query(Stage).all()

    # 2. Định nghĩa danh sách các Role cần có
    role_mapping = {
        "IT": {"name": "IT", "description": "IT"},
        "BGD": {"name": "BGD", "description": "Ban Giám Đốc"},
        "SX": {"name": "Sx", "description": "Sản xuất"},
        "Sản xuất": {"name": "Sx", "description": "Sản xuất"},
        "QC": {"name": "QLCL", "description": "Quản Lý Chất Lượng"},
        "Chất lượng": {"name": "QLCL", "description": "Quản Lý Chất Lượng"},
    }

    # Cập nhật các Role hiện có
    existing_roles = db.query(Role).all()
    for r in existing_roles:
        if r.name in role_mapping:
            new_info = role_mapping[r.name]
            r.name = new_info["name"]
            r.description = new_info["description"]
    
    db.commit()

    target_roles = {
        "IT": "IT",
        "BGD": "Ban Giám Đốc",
        "Sx": "Sản xuất",
        "QLCL": "Quản Lý Chất Lượng"
    }

    roles_db = {}
    for r_name, r_desc in target_roles.items():
        role_obj = db.query(Role).filter(Role.name == r_name).first()
        if not role_obj:
            role_obj = Role(name=r_name, description=r_desc)
            db.add(role_obj)
            db.flush()
        roles_db[r_name] = role_obj

    db.commit()

    # 3. Định nghĩa danh sách các Permission cần có
    target_permissions = {
        "NV QC": "Nhân Viên QC",
        "NV QA": "Nhân Viên QA",
        "QC Lead": "QC Trưởng Nhóm",
        "Thống kê": "Thống kê sản xuất/chất lượng",
        "Quản lý": "Quản lý cấp trung",
        "NV SX": "Nhân Viên Sản Xuất",
        "Admin": "Quản trị hệ thống",
        "Giám đốc": "Ban Giám Đốc"
    }

    perms_db = {}
    for p_name, p_desc in target_permissions.items():
        perm_obj = db.query(Permission).filter(Permission.name == p_name).first()
        if not perm_obj:
            perm_obj = Permission(name=p_name, description=p_desc)
            db.add(perm_obj)
            db.flush()
        else:
            perm_obj.description = p_desc
        perms_db[p_name] = perm_obj

    db.commit()

    # 4. Gán quyền (Permissions) cho từng Bộ phận (Role) theo sơ đồ
    role_to_perms = {
        "QLCL": ["NV QC", "NV QA", "QC Lead", "Thống kê", "Quản lý"],
        "Sx": ["NV SX", "Thống kê", "Quản lý"],
        "IT": ["Admin"],
        "BGD": ["Giám đốc"]
    }

    for r_name, p_list in role_to_perms.items():
        role_obj = roles_db[r_name]
        role_obj.permissions = []
        db.flush()
        for p_name in p_list:
            perm_obj = perms_db[p_name]
            role_obj.permissions.append(perm_obj)

    db.commit()

    # 5. Gán các công đoạn (Stages) cho từng Quyền (Permission)
    for p_name, perm_obj in perms_db.items():
        perm_obj.stages = []
        db.flush()
        if p_name not in ["Admin", "Giám đốc"]:
            for stage_obj in all_stages:
                perm_obj.stages.append(stage_obj)

    db.commit()
    print("SUCCESS: Seed script run complete.")

except Exception as e:
    db.rollback()
    print("ERROR: Error during seeding:", str(e))
finally:
    db.close()
