# -*- coding: utf-8 -*-
"""
Script seed/đồng bộ nhóm menu 'Khởi tạo phiếu' chuẩn 8 mục trên Mobile Sidebar trong CSDL SQL Server.
Khớp chính xác 100% với giao diện SmartFlow Mobile:
1. Tạo phiếu luân chuyển (/production_v2/transfer)
2. Kiểm tra Pallet v1 (/pallet-check-v1)
3. Kiểm tra Pallet (AI) (/pallet-check)
4. Danh sách luân chuyển (/production_v2/transfer-list)
5. Tạo phiếu kiểm tra (/production_v2/inspection)
6. Kiểm tra Tủ thùng (/cabinet-box-check)
7. Danh sách kiểm tra (/production_v2/inspection-list)
8. Quản lý mã QR tạm (/production_v2/backup-qr)
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.stdout.reconfigure(encoding='utf-8')

from config.database import SessionLocal, engine
from app import models
from modules.system.models.system_sidebar import SystemSidebar

def run_migration():
    db = SessionLocal()
    try:
        print("--- Đang đồng bộ Menu Mobile 'Khởi tạo phiếu' ---")
        
        # 1. Tìm hoặc tạo Group 'Khởi tạo phiếu'
        group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Mobile',
            SystemSidebar.title == 'Khởi tạo phiếu',
            SystemSidebar.parent_id == None
        ).first()

        if not group:
            group = SystemSidebar(
                platform='Mobile',
                parent_id=None,
                title='Khởi tạo phiếu',
                route_path='#',
                icon='MessageSquare',
                sort_order=2,
                is_active=True
            )
            db.add(group)
            db.flush()
            print(f"✓ Đã tạo mới Group 'Khởi tạo phiếu' (ID: {group.id})")
        else:
            group.icon = 'MessageSquare'
            group.sort_order = 2
            group.is_active = True
            db.flush()
            print(f"✓ Đã tìm thấy Group 'Khởi tạo phiếu' (ID: {group.id})")

        # 8 mục chuẩn
        items_def = [
            ("Tạo phiếu luân chuyển", "/production_v2/transfer", "FilePlus", 1),
            ("Kiểm tra Pallet v1", "/pallet-check-v1", "Barcode", 2),
            ("Kiểm tra Pallet (AI)", "/pallet-check", "ScanLine", 3),
            ("Danh sách luân chuyển", "/production_v2/transfer-list", "ListOrdered", 4),
            ("Tạo phiếu kiểm tra", "/production_v2/inspection", "ClipboardCheck", 5),
            ("Kiểm tra Tủ thùng", "/cabinet-box-check", "Boxes", 6),
            ("Danh sách kiểm tra", "/production_v2/inspection-list", "ClipboardList", 7),
            ("Quản lý mã QR tạm", "/production_v2/backup-qr", "QrCode", 8)
        ]

        for title, route, icon, order in items_def:
            child = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == route
            ).first()

            if not child:
                child = SystemSidebar(
                    platform='Mobile',
                    parent_id=group.id,
                    title=title,
                    route_path=route,
                    icon=icon,
                    sort_order=order,
                    is_active=True
                )
                db.add(child)
                print(f"  + Đã thêm mục: {title} ({route}) - Thứ tự {order}")
            else:
                child.parent_id = group.id
                child.title = title
                child.icon = icon
                child.sort_order = order
                child.is_active = True
                print(f"  * Đã cập nhật mục: {title} ({route}) - Thứ tự {order}")

        db.commit()
        print("✓ Hoàn thành đồng bộ 8 mục Khởi tạo phiếu trên Mobile!")
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    run_migration()
