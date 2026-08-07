# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models
from config.database import SessionLocal
from modules.production.models.stages import Stage
from modules.auth.models.permissions import Permission
from sqlalchemy import text

def seed_stages():
    db = SessionLocal()
    try:
        print("Seeding all BOM & factory production stages into database...")
        
        # 1. Trích xuất tự động tất cả công đoạn từ bảng BOM (bom_details) và Giao hàng (deliveries)
        bom_stages_sql = text("""
            SELECT DISTINCT input_stage FROM bom_details WHERE input_stage IS NOT NULL AND input_stage <> ''
            UNION
            SELECT DISTINCT output_stage FROM bom_details WHERE output_stage IS NOT NULL AND output_stage <> ''
            UNION
            SELECT DISTINCT receiving_stage FROM deliveries WHERE receiving_stage IS NOT NULL AND receiving_stage <> ''
        """)
        extracted_rows = db.execute(bom_stages_sql).fetchall()
        extracted_stages = [r[0].strip() for r in extracted_rows if r[0] and r[0].strip()]

        # 2. Danh sách công đoạn chuẩn cho NM1, NM2, NM3 và Tổng quát
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



        # Thêm các công đoạn trích xuất từ BOM
        for st in extracted_stages:
            if not any(d["name"] == st for d in default_stages):
                default_stages.append({"name": st, "description": f"Công đoạn sản xuất thực tế từ BOM ({st})"})

        for s in default_stages:
            existing = db.query(Stage).filter(Stage.name == s["name"]).first()
            if not existing:
                existing = Stage(name=s["name"], description=s["description"])
                db.add(existing)
                db.flush()
                try:
                    print(f"Added Stage: {s['name']}")
                except Exception:
                    pass

        db.commit()

        # 3. Gán tất cả các công đoạn này cho các Permission liên quan
        all_stages = db.query(Stage).all()
        perms = db.query(Permission).all()

        for perm in perms:
            if perm.name in ["NV SX", "NV QC", "QC Lead", "Thống kê", "Quản lý", "Admin", "NV QA"]:
                perm.stages = all_stages
                try:
                    print(f"Assigned {len(all_stages)} stages to permission: {perm.name}")
                except Exception:
                    pass

        db.commit()
        print(f"[SUCCESS] Total {len(all_stages)} production stages seeded and mapped successfully!")
    except Exception as e:
        db.rollback()
        try:
            print(f"[ERROR] Seeding stages failed: {e}")
        except Exception:
            pass

    finally:
        db.close()

if __name__ == "__main__":
    seed_stages()
