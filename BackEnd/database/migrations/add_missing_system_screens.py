# -*- coding: utf-8 -*-
"""
Migration: Bổ sung các màn hình Web còn thiếu vào bảng system_screens:
- /admin/quality (CL1 - Quản lý chất lượng)
- /admin/daily-production (SX03 - Hôm nay sản xuất gì)
- /admin/lpn-crawler (CR01 - Crawl dữ liệu LPN)
- /admin/ai-ocr-train (AI01 - Train Hình ảnh)
- /admin/pallet-check (CR02 - Quét Cont)
Giúp hệ thống phân quyền nhận diện và kiểm soát toàn diện mọi route trên Web.
"""
import sys, os
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine
from sqlalchemy import text

screens_to_add = [
    {
        "platform": "Web",
        "route_path": "/admin/quality",
        "default_code": "CL1",
        "current_code": "CL1",
        "title": "Quản lý chất lượng",
        "subtitle": "CL1: Hiển thị danh sách các phiếu kiểm tra chất lượng toàn hệ thống",
        "is_active": True,
        "status": "Hoàn thành",
        "backend_path": "/api/v1/inspections"
    },
    {
        "platform": "Web",
        "route_path": "/admin/daily-production",
        "default_code": "SX03",
        "current_code": "SX03",
        "title": "Hôm nay sản xuất gì",
        "subtitle": "Kế hoạch điều hành sản xuất theo ngày và ca làm việc",
        "is_active": True,
        "status": "Hoàn thành",
        "backend_path": "/api/v1/plans/daily"
    },
    {
        "platform": "Web",
        "route_path": "/admin/lpn-crawler",
        "default_code": "CR01",
        "current_code": "CR01",
        "title": "Crawl dữ liệu LPN",
        "subtitle": "Thu thập và đồng bộ thông tin pallet LPN từ hệ thống đối tác",
        "is_active": True,
        "status": "Hoàn thành",
        "backend_path": "/api/v1/lpn"
    },
    {
        "platform": "Web",
        "route_path": "/admin/ai-ocr-train",
        "default_code": "AI01",
        "current_code": "AI01",
        "title": "Train Hình ảnh",
        "subtitle": "Huấn luyện mô hình nhận diện tem nhãn và chi tiết hình ảnh",
        "is_active": True,
        "status": "Hoàn thành",
        "backend_path": "/api/v1/ai"
    },
    {
        "platform": "Web",
        "route_path": "/admin/pallet-check",
        "default_code": "CR02",
        "current_code": "CR02",
        "title": "Quét Cont",
        "subtitle": "Kiểm tra và xác thực quy cách đóng container pallet hàng hóa",
        "is_active": True,
        "status": "Hoàn thành",
        "backend_path": "/api/v1/pallet"
    }
]

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            for s in screens_to_add:
                exists = conn.execute(
                    text("SELECT id FROM system_screens WHERE route_path = :r"),
                    {"r": s["route_path"]}
                ).scalar()
                if not exists:
                    conn.execute(
                        text("""
                            INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, backend_path)
                            VALUES (:platform, :route_path, :default_code, :current_code, :title, :subtitle, :is_active, :status, :backend_path)
                        """),
                        s
                    )
                    print(f"Đã thêm màn hình: {s['route_path']} ({s['default_code']})")
                else:
                    print(f"Màn hình đã tồn tại: {s['route_path']} (ID: {exists})")
            trans.commit()
            print("Migration hoàn tất thành công!")
        except Exception as e:
            trans.rollback()
            print("Lỗi khi chạy migration:", e)
            raise e

if __name__ == "__main__":
    migrate()

