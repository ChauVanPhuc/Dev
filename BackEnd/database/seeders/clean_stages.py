# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models
from config.database import SessionLocal
from modules.production.models.stages import Stage
from modules.auth.models.permissions import Permission
from sqlalchemy import text

def clean_and_seed_stages():
    db = SessionLocal()
    try:
        print("Cleaning up old duplicate stages...")
        
        # 1. Danh sách 21 công đoạn sản xuất chuẩn tuyệt đối cho NM1, NM2, NM3
        clean_stages = [
            # NM1
            {"name": "NM1 - Tạo phôi 1", "description": "NM1 - Tạo phôi 1"},
            {"name": "NM1 - Định hình mặt tiền 1", "description": "NM1 - Định hình mặt tiền 1"},
            {"name": "NM1 - Định hình tủ 1", "description": "NM1 - Định hình tủ 1"},
            {"name": "NM1 - Lắp ráp mặt tiền 1", "description": "NM1 - Lắp ráp mặt tiền 1"},
            {"name": "NM1 - Lắp ráp tủ 1", "description": "NM1 - Lắp ráp tủ 1"},
            {"name": "NM1 - Sơn Pallet 1", "description": "NM1 - Sơn Pallet 1"},
            {"name": "NM1 - Sơn treo 1", "description": "NM1 - Sơn treo 1"},
            {"name": "NM1 - Đóng gói 1", "description": "NM1 - Đóng gói 1"},
            {"name": "NM1 - QC / Kiểm định 1", "description": "NM1 - QC / Kiểm định 1"},

            # NM2
            {"name": "NM2 - Định hình mặt tiền 2", "description": "NM2 - Định hình mặt tiền 2"},
            {"name": "NM2 - Định hình tủ 2", "description": "NM2 - Định hình tủ 2"},
            {"name": "NM2 - Lắp ráp mặt tiền 2", "description": "NM2 - Lắp ráp mặt tiền 2"},
            {"name": "NM2 - Lắp ráp tủ 2", "description": "NM2 - Lắp ráp tủ 2"},
            {"name": "NM2 - Sơn Pallet 2", "description": "NM2 - Sơn Pallet 2"},
            {"name": "NM2 - Sơn treo 2", "description": "NM2 - Sơn treo 2"},
            {"name": "NM2 - Đóng gói 2", "description": "NM2 - Đóng gói 2"},

            # NM3
            {"name": "NM3 - Tạo phôi 3", "description": "NM3 - Tạo phôi 3"},
            {"name": "NM3 - Định hình 3", "description": "NM3 - Định hình 3"},
            {"name": "NM3 - Lắp ráp 3", "description": "NM3 - Lắp ráp 3"},
            {"name": "NM3 - Sơn 3", "description": "NM3 - Sơn 3"},
            {"name": "NM3 - Đóng gói 3", "description": "NM3 - Đóng gói 3"}
        ]

        clean_names = [s["name"] for s in clean_stages]

        # 2. Xóa các Stage thừa không thuộc danh sách clean_names
        bad_stages = db.query(Stage).filter(~Stage.name.in_(clean_names)).all()
        bad_ids = [s.id for s in bad_stages]
        print(f"Found {len(bad_ids)} duplicate/old stages to delete: {bad_ids}")

        if bad_ids:
            ids_str = ",".join(str(i) for i in bad_ids)
            db.execute(text(f"DELETE FROM departments WHERE stage_id IN ({ids_str})"))
            db.execute(text(f"DELETE FROM permission_stage WHERE stage_id IN ({ids_str})"))
            db.execute(text(f"DELETE FROM stages WHERE id IN ({ids_str})"))
            db.commit()

        # 3. Đảm bảo 21 công đoạn chuẩn tồn tại và cập nhật description gọn gàng
        for s in clean_stages:
            existing = db.query(Stage).filter(Stage.name == s["name"]).first()
            if not existing:
                existing = Stage(name=s["name"], description=s["description"])
                db.add(existing)
            else:
                existing.description = s["description"]
            db.flush()

        db.commit()

        # 4. Gán 21 công đoạn chuẩn cho các Permission liên quan
        all_stages = db.query(Stage).all()
        perms = db.query(Permission).all()

        for perm in perms:
            if perm.name in ["NV SX", "NV QC", "QC Lead", "Thống kê", "Quản lý", "Admin", "NV QA"]:
                perm.stages = all_stages

        db.commit()
        print(f"[SUCCESS] Database cleaned! Remaining exact stages count: {len(all_stages)}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Clean stages failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_and_seed_stages()
