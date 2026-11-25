# -*- coding: utf-8 -*-
import sys, os, json
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.routes import api_router
from config.database import engine, SessionLocal
from sqlalchemy import text
from modules.auth.models.accounts import Account
from modules.auth.controllers.account_controller import resolve_user_permissions, invalidate_permission_cache

def update_account_1073():
    db = SessionLocal()
    user = db.query(Account).filter(Account.id == 1073).first()
    if not user:
        print("User 1073 not found!")
        return

    # Lấy toàn bộ màn hình
    all_perms = resolve_user_permissions(user, db)
    
    # Danh sách các route mà tài khoản Kho được phép
    allowed_routes = {
        "/admin/warehouse/goods-receipt": "read,create,edit,delete,approve,export_import",
        "/admin/warehouse/goods-issue": "read,create,edit,delete,approve,export_import",
        "/admin/warehouse/management": "read,create,edit,delete,approve,export_import",
        "/admin/warehouse/rejected-goods": "read,create,edit,delete,approve,export_import",
        "/warehouse/goods-receipt": "read,create,edit,delete,approve,export_import",
        "/warehouse/handover": "read,create,edit,delete,approve,export_import",
        "/warehouse/returns": "read,create,edit,delete,approve,export_import",
        "/dashboard": "read,create,edit,delete,approve,export_import"
    }

    new_permissions = {}
    for scr in all_perms.keys():
        if scr in allowed_routes:
            new_permissions[scr] = allowed_routes[scr]
        else:
            new_permissions[scr] = "none"

    # Cập nhật vào DB
    user.screen_permissions = json.dumps(new_permissions)
    db.commit()
    invalidate_permission_cache(1073)
    invalidate_permission_cache(None)
    
    print(f"Cập nhật thành công cho User {user.username} (ID: {user.id})!")
    print(f"Tổng số màn hình trong screen_permissions: {len(new_permissions)}")
    print("Màn hình được cấp quyền:")
    for k, v in new_permissions.items():
        if v != "none":
            print(f"  + {k}: {v}")

    # Kiểm tra lại sau khi resolve
    resolved = resolve_user_permissions(user, db)
    print("\nKiểm tra phân giải (resolve):")
    print(f"  /admin/quality: {resolved.get('/admin/quality')}")
    print(f"  /admin/daily-production: {resolved.get('/admin/daily-production')}")
    print(f"  /admin/lpn-crawler: {resolved.get('/admin/lpn-crawler')}")
    print(f"  /admin/warehouse/goods-receipt: {resolved.get('/admin/warehouse/goods-receipt')}")

if __name__ == "__main__":
    update_account_1073()

