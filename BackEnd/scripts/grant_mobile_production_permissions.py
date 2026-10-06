"""
Script cập nhật FULL QUYỀN module 'Khởi tạo Phiếu' trên Mobile cho toàn bộ tài khoản trong hệ thống.
Bao gồm:
- Toàn bộ route thuộc nhóm Mobile Sidebar "Khởi tạo phiếu" (ID 2114):
    + /production_v2/transfer (Tạo phiếu luân chuyển)
    + /production_v2/transfer-list (Danh sách luân chuyển)
    + /production_v2/inspection (Tạo phiếu kiểm tra)
    + /production_v2/inspection-list (Danh sách kiểm tra)
    + /pallet-check-v1 (Kiểm tra Pallet v1)
    + /pallet-check (Kiểm tra Pallet AI)
    + /cabinet-box-check (Kiểm tra Tủ thùng)
    + /production_v2/backup-qr (Quản lý mã QR tạm)
- Các sub-route chi tiết kiểm tra:
    + /production_v2/inspection/first-sample
    + /production_v2/inspection/re-inspect
    + /production_v2/inspection/parameter
    + /production_v2/inspection/process
    + /production_v2/inspection/qa
    + /production_v2/inspection/daily
- Cùng tất cả các alias/key nhận diện trên Mobile router & ProtectedRoute
- Đảm bảo is_mobile_allowed = True cho tất cả các tài khoản.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from config.database import SessionLocal
from app import models
from modules.auth.models.accounts import Account
from modules.auth.models.role import Role

FULL_PERMISSIONS = "read,create,edit,delete,approve,export_import"

MODULE_KEYS = [
    # 1. Các route trong Mobile Sidebar (Menu Khởi tạo phiếu - ID 2114)
    "/production_v2/transfer",           # Tạo phiếu luân chuyển
    "/production_v2/transfer-list",      # Danh sách luân chuyển
    "/production_v2/inspection",         # Tạo phiếu kiểm tra
    "/production_v2/inspection-list",    # Danh sách kiểm tra
    "/pallet-check-v1",                  # Kiểm tra Pallet v1
    "/pallet-check",                     # Kiểm tra Pallet (AI)
    "/cabinet-box-check",                # Kiểm tra Tủ thùng
    "/production_v2/backup-qr",          # Quản lý mã QR tạm

    # 2. Các sub-route chi tiết kiểm tra trên Mobile
    "/production_v2/inspection/first-sample",
    "/production_v2/inspection/re-inspect",
    "/production_v2/inspection/parameter",
    "/production_v2/inspection/process",
    "/production_v2/inspection/qa",
    "/production_v2/inspection/daily",

    # 3. Các alias không có dấu gạch chéo đầu (phục vụ permission key matching)
    "production_v2/transfer",
    "production_v2/transfer-list",
    "production_v2/inspection",
    "production_v2/inspection-list",
    "pallet-check-v1",
    "pallet-check",
    "cabinet-box-check",
    "production_v2/backup-qr",
    "production_v2/inspection/first-sample",
    "production_v2/inspection/re-inspect",
    "production_v2/inspection/parameter",
    "production_v2/inspection/process",
    "production_v2/inspection/qa",
    "production_v2/inspection/daily",

    # 4. Group route và mobile prefix keys
    "/production_v2",
    "production_v2",
    "mobile_production_v2",
    "mobile_pallet-check",
    "mobile_pallet-check-v1",
    "mobile_cabinet-box-check",
    "mobile_production_v2_transfer",
    "mobile_production_v2_transfer_list",
    "mobile_production_v2_inspection",
    "mobile_production_v2_inspection_list",
    "mobile_production_v2_backup_qr",

    # 5. Dạng gạch nối /production-v2
    "/production-v2",
    "production-v2",
    "/production-v2/transfer",
    "/production-v2/transfer-list",
    "/production-v2/inspection",
    "/production-v2/inspection-list",
    "/production-v2/backup-qr",
    "/production-v2/inspection/first-sample",
    "/production-v2/inspection/re-inspect",
    "/production-v2/inspection/parameter",
    "/production-v2/inspection/process",
    "/production-v2/inspection/qa",
    "/production-v2/inspection/daily",

    # 6. Mã màn hình theo SystemScreen
    "MB07",
    "MB08",
    "MB10",
    "MB10.1",
    "MB15",
    "MB16",
    "MB17",
]

def run_update():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU CẬP NHẬT FULL QUYỀN KHỞI TẠO PHIẾU MOBILE CHO TOÀN BỘ TÀI KHOẢN ===")
        accounts = db.query(Account).all()
        print(f"Tổng số tài khoản tìm thấy: {len(accounts)}")

        updated_count = 0
        for acc in accounts:
            # Parse existing permissions
            try:
                perms = json.loads(acc.screen_permissions or "{}")
            except Exception:
                perms = {}

            # Gán full quyền cho từng key thuộc module Khởi tạo Phiếu Mobile
            for k in MODULE_KEYS:
                perms[k] = FULL_PERMISSIONS

            acc.screen_permissions = json.dumps(perms, ensure_ascii=False)
            acc.is_mobile_allowed = True
            updated_count += 1

        # Đồng thời cập nhật Role default permissions nếu có
        roles = db.query(Role).all()
        for r in roles:
            if r.default_permissions:
                try:
                    r_perms = json.loads(r.default_permissions)
                    for k in MODULE_KEYS:
                        r_perms[k] = "write"
                    r.default_permissions = json.dumps(r_perms, ensure_ascii=False)
                except Exception:
                    pass

        db.commit()
        print(f"✓ ĐÃ CẬP NHẬT THÀNH CÔNG CHO {updated_count}/{len(accounts)} TÀI KHOẢN!")
        print("✓ Đã kích hoạt is_mobile_allowed = True cho tất cả tài khoản.")
        print(f"✓ Đã gán full quyền ({FULL_PERMISSIONS}) cho {len(MODULE_KEYS)} keys/routes.")

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi cập nhật: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_update()
