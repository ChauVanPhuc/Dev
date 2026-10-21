# -*- coding: utf-8 -*-
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.abspath('BackEnd'))

from config.database import SessionLocal
from modules.auth.models.accounts import Account
from modules.auth.models.permissions import Permission
from modules.auth.models.role import Role
from modules.auth.models.departments import Department
from modules.inspection.models.iso_models import ISOProcess
from modules.inspection.services.iso_file_service import get_department_name, get_department_code
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        print("=== 1. CẬP NHẬT & BỔ SUNG PHÒNG BAN VÀO BẢNG ROLES ===")
        standard_depts = [
            {"code": "QLCL", "name": "Ban Quản trị Chất lượng & ISO (QLCL)"},
            {"code": "SX", "name": "Phòng Sản Xuất"},
            {"code": "HCNS", "name": "Phòng Hành chính Nhân sự (HCNS)"},
            {"code": "KT", "name": "Phòng Kỹ thuật & Cơ điện"},
            {"code": "KETOAN", "name": "Phòng Kế toán"},
            {"code": "MH", "name": "Phòng Mua hàng & Vật tư"},
            {"code": "KHO", "name": "Phòng Kho vận"},
            {"code": "BGD", "name": "Ban Giám Đốc"},
            {"code": "IT", "name": "Phòng Công nghệ Thông tin (IT)"},
            {"code": "KD", "name": "Phòng Kinh doanh"}
        ]

        role_map = {}
        for d in standard_depts:
            r = db.query(Role).filter(Role.name == d["code"]).first()
            if not r:
                r = Role(name=d["code"], description=d["name"], is_active=True)
                db.add(r)
                db.flush()
                print(f"  + Thêm mới Role: {d['code']} - {d['name']} (ID: {r.id})")
            else:
                if not r.description or r.description != d["name"]:
                    r.description = d["name"]
                    r.is_active = True
                    print(f"  * Cập nhật mô tả Role: {d['code']} -> {d['name']}")
            role_map[d["code"]] = r

        db.commit()

        print("\n=== 2. LÀM SẠCH DEPARTMENT_NAME TRONG BẢNG ISO_PROCESSES ===")
        rows = db.execute(text("SELECT id, department_name FROM iso_processes")).fetchall()
        cleaned_count = 0
        for r_id, raw_dept in rows:
            raw_dept = raw_dept or ""
            if "/" in raw_dept or "Mr." in raw_dept or "Ms." in raw_dept or "Lào" in raw_dept:
                clean_name = get_department_name(raw_dept)
                clean_code = get_department_code(raw_dept)
                
                # Ánh xạ về tên chuẩn trong roles
                matched_role = None
                if clean_code in ["CL", "QL"]:
                    matched_role = role_map.get("QLCL")
                elif clean_code == "HC":
                    matched_role = role_map.get("HCNS")
                elif clean_code == "SX":
                    matched_role = role_map.get("SX")
                elif clean_code in ["KY", "KT"]:
                    matched_role = role_map.get("KT")
                elif clean_code == "MH":
                    matched_role = role_map.get("MH")
                elif clean_code == "KH":
                    matched_role = role_map.get("KHO")
                elif clean_code in ["BG", "BGD"]:
                    matched_role = role_map.get("BGD")
                
                final_name = matched_role.description if matched_role else clean_name
                r_dept_id = matched_role.id if matched_role else None
                
                db.execute(text("UPDATE iso_processes SET department_name = :dname, department_id = :did WHERE id = :pid"), {
                    "dname": final_name,
                    "did": r_dept_id,
                    "pid": r_id
                })
                cleaned_count += 1

        db.execute(text("""
            UPDATE iso_processes 
            SET department_name = N'Ban Quản trị Chất lượng & ISO (QLCL)', department_id = 1 
            WHERE department_name IN (N'Ban Quản trị Chất lượng & ISO', N'Các bộ phận liên quan')
        """))
        db.commit()
        print(f"  -> Đã làm sạch {cleaned_count}/{len(rows)} quy trình trong iso_processes!")

        print("\n=== 3. KIỂM TRA LẠI CÁC PHÒNG BAN TRONG ROLES ===")
        roles = db.query(Role).filter(Role.is_active == True).all()
        for r in roles:
            print(f"  Role ID={r.id:4d} | Code={r.name:8s} | Name={r.description}")

    except Exception as e:
        db.rollback()
        print("Lỗi:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
