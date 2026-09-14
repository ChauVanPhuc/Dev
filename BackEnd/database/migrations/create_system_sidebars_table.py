import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def upgrade():
    """Create system_sidebars table and seed it"""
    db = next(get_db())
    try:
        # Check if table exists and drop it to ensure clean constraints
        table_exists_query = text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'system_sidebars'")
        table_exists = db.execute(table_exists_query).fetchone()[0]
        if table_exists > 0:
            print("Dropping existing system_sidebars table...")
            db.execute(text("DROP TABLE system_sidebars"))
            db.commit()
        
        print("Creating system_sidebars table...")
        create_table_sql = text("""
            CREATE TABLE system_sidebars (
                id INT IDENTITY(1,1) PRIMARY KEY,
                platform NVARCHAR(20) NOT NULL,
                parent_id INT NULL,
                title NVARCHAR(100) NOT NULL,
                route_path NVARCHAR(250) NULL,
                icon NVARCHAR(100) NULL,
                sort_order INT NOT NULL DEFAULT 0,
                is_active BIT NOT NULL DEFAULT 1,
                permission_key NVARCHAR(100) NULL,
                screen_id INT NULL,
                CONSTRAINT FK_system_sidebars_parent FOREIGN KEY (parent_id) REFERENCES system_sidebars(id) ON DELETE NO ACTION,
                CONSTRAINT FK_system_sidebars_screen FOREIGN KEY (screen_id) REFERENCES system_screens(id) ON DELETE SET NULL
            )
        """)
        db.execute(create_table_sql)
        db.commit()
        print("[OK] Created system_sidebars table.")

        # Seed data
        print("Checking/Seeding default sidebars...")
        count = db.execute(text("SELECT COUNT(*) FROM system_sidebars")).fetchone()[0]
        if count > 0:
            print("[SKIP] system_sidebars already contains data.")
            return

        # Fetch screens to map screen_id where possible
        screens_map = {}
        try:
            screens = db.execute(text("SELECT id, route_path, platform FROM system_screens")).fetchall()
            for s in screens:
                # Key: (platform, route_path)
                screens_map[(s[2], s[1])] = s[0]
        except Exception as e:
            print(f"[WARN] Failed to fetch screens: {e}")

        # List of Web Sidebar groups and items
        web_menus = [
            # Top-level links
            {"title": "Trang chủ", "route_path": "/admin/dashboard", "icon": "LayoutGrid", "sort_order": 1, "permission_key": None},
            
            # Groups
            {
                "title": "Quản lý hệ thống", "icon": "Settings", "sort_order": 2,
                "children": [
                    {"title": "Giám sát hệ thống", "route_path": "/admin/monitor", "icon": "Monitor", "sort_order": 1, "permission_key": None},
                    {"title": "Danh sách màn hình", "route_path": "/admin/screens", "icon": "Layout", "sort_order": 2, "permission_key": None},
                    {"title": "Quản lý lỗi màn hình", "route_path": "/admin/screens/bugs", "icon": "Bug", "sort_order": 3, "permission_key": "bugs"},
                    {"title": "Tiến độ dự án", "route_path": "/admin/screens/progress", "icon": "Activity", "sort_order": 4, "permission_key": "screens"},
                    {"title": "Theo dõi góp ý", "route_path": "/admin/feedback", "icon": "MessageSquare", "sort_order": 5, "permission_key": None},
                    {"title": "Đóng gói dữ liệu", "route_path": "/admin/data", "icon": "Package", "sort_order": 6, "permission_key": None},
                    {"title": "Quản lý tài khoản", "route_path": "/admin/users", "icon": "Users", "sort_order": 7, "permission_key": "users"},
                    {"title": "Cấu hình Sidebar", "route_path": "/admin/sidebar", "icon": "Sliders", "sort_order": 8, "permission_key": "screens"},
                    {"title": "Quản lý mã QR tạm", "route_path": "/admin/backup-qrs", "icon": "QrCode", "sort_order": 9, "permission_key": "backup-qrs"},
                ]
            },
            {
                "title": "Quản lý nhân sự", "icon": "Users", "sort_order": 3,
                "children": [
                    {"title": "Sơ đồ tổ chức", "route_path": "/admin/hr/org-chart", "icon": "Network", "sort_order": 1, "permission_key": "users"},
                    {"title": "Danh sách nhân viên", "route_path": "/admin/hr/employees", "icon": "User", "sort_order": 2, "permission_key": "users"},
                    {"title": "Quản lý chức vụ", "route_path": "/admin/users/positions", "icon": "Briefcase", "sort_order": 3, "permission_key": "users"},
                    {"title": "Quản lý phòng ban", "route_path": "/admin/users/departments", "icon": "Folder", "sort_order": 4, "permission_key": "users"},
                ]
            },
            {
                "title": "Hồ sơ ISO", "icon": "FileText", "sort_order": 4,
                "children": [
                    {"title": "Quản lý mẫu tài liệu", "route_path": "/admin/iso-documents", "icon": "File", "sort_order": 1, "permission_key": None},
                    {"title": "Quy trình nghiệp vụ", "route_path": "/admin/iso-processes", "icon": "Layers", "sort_order": 2, "permission_key": None},
                ]
            },
            {
                "title": "Quản lý sản xuất", "icon": "Factory", "sort_order": 5,
                "children": [
                    {"title": "Trang tổng quan", "route_path": "/admin/production-dashboard", "icon": "LayoutDashboard", "sort_order": 1, "permission_key": None},
                    {"title": "Lệnh sản xuất", "route_path": "/admin/production-orders", "icon": "ClipboardList", "sort_order": 2, "permission_key": None},
                    {"title": "Lịch sản xuất", "route_path": "/admin/production-schedule", "icon": "Calendar", "sort_order": 3, "permission_key": None},
                    {"title": "Kế hoạch sản xuất", "route_path": "/admin/plan", "icon": "ListOrdered", "sort_order": 4, "permission_key": None},
                    {"title": "Quy trình sản xuất", "route_path": "/admin/production-routing", "icon": "GitMerge", "sort_order": 5, "permission_key": None},
                    {"title": "Kế hoạch bàn giao", "route_path": "/admin/delivery-tracking", "icon": "Truck", "sort_order": 6, "permission_key": None},
                    {"title": "Phiếu ngoại lệ", "route_path": "/admin/exception-deliveries", "icon": "AlertTriangle", "sort_order": 7, "permission_key": None},
                ]
            },
            {
                "title": "Quản lý chất lượng", "icon": "ShieldCheck", "sort_order": 6,
                "children": [
                    {"title": "Hồ sơ chất lượng", "route_path": "/admin/quality-records", "icon": "Folder", "sort_order": 1, "permission_key": None},
                    {"title": "Danh sách lỗi", "route_path": "/admin/defects", "icon": "Slash", "sort_order": 2, "permission_key": None},
                    {"title": "Claim khách hàng", "route_path": "/admin/claims", "icon": "MessageCircle", "sort_order": 3, "permission_key": None},
                    {"title": "Quản lý CAPA", "route_path": "/admin/capa", "icon": "CheckCircle", "sort_order": 4, "permission_key": "capa"},
                    {"title": "Báo cáo kiểm tra", "route_path": "/admin/reports", "icon": "Clipboard", "sort_order": 5, "permission_key": None},
                    {"title": "Danh sách bàn giao", "route_path": "/admin/handovers", "icon": "List", "sort_order": 6, "permission_key": None},
                    {"title": "Điểm nóng cần chú ý", "route_path": "/admin/hotspots", "icon": "MapPin", "sort_order": 7, "permission_key": None},
                    {"title": "Quản lý thiết bị", "route_path": "/admin/equipment", "icon": "Wrench", "sort_order": 8, "permission_key": None},
                    {"title": "Nhật ký sự cố", "route_path": "/admin/logs", "icon": "BookOpen", "sort_order": 9, "permission_key": None},
                ]
            },
            {
                "title": "Quản lý kinh doanh", "icon": "DollarSign", "sort_order": 7,
                "children": [
                    {"title": "Thời gian xuất cont", "route_path": "/admin/shipments", "icon": "Calendar", "sort_order": 1, "permission_key": None},
                    {"title": "Đơn giá sản phẩm", "route_path": "/admin/prices", "icon": "Tag", "sort_order": 2, "permission_key": None},
                    {"title": "Danh sách đơn hàng", "route_path": "/admin/purchase-requisitions", "icon": "ClipboardList", "sort_order": 3, "permission_key": None},
                    {"title": "Giám sát vận chuyển", "route_path": "/admin/order-shipping-monitoring", "icon": "Truck", "sort_order": 4, "permission_key": None},
                ]
            },
            {
                "title": "Quản lý kỹ thuật", "icon": "Sliders", "sort_order": 8,
                "children": [
                    {"title": "Bom sản phẩm", "route_path": "/admin/products", "icon": "Box", "sort_order": 1, "permission_key": None},
                    {"title": "BOM vật tư", "route_path": "/admin/products?tab=materials", "icon": "Layers", "sort_order": 2, "permission_key": None},
                ]
            },

            {
                "title": "Bảo trì - cơ sở hạ tầng", "icon": "Wrench", "sort_order": 9,
                "children": [
                    {"title": "Danh sách thiết bị", "route_path": "/admin/machines", "icon": "Cpu", "sort_order": 1, "permission_key": None},
                    {"title": "Lịch sử bảo trì", "route_path": "/admin/machines/history", "icon": "Clock", "sort_order": 2, "permission_key": None},
                    {"title": "Hướng dẫn sử dụng", "route_path": "/admin/machines/training", "icon": "BookOpen", "sort_order": 3, "permission_key": None},
                    {"title": "Danh mục thiết bị", "route_path": "/admin/equipment/categories", "icon": "Grid", "sort_order": 4, "permission_key": None},
                    {"title": "Lịch sử thiết bị", "route_path": "/admin/equipment/history", "icon": "Clock", "sort_order": 5, "permission_key": None},
                    {"title": "Đào tạo thiết bị", "route_path": "/admin/equipment/training", "icon": "GraduationCap", "sort_order": 6, "permission_key": None},
                ]
            },
            {
                "title": "Quản lý KPI", "icon": "BarChart2", "sort_order": 10,
                "children": [
                    {"title": "Báo cáo KPI", "route_path": "/admin/kpi", "icon": "BarChart2", "sort_order": 1, "permission_key": None},
                    {"title": "Checklist KPI", "route_path": "/admin/kpi/checklist", "icon": "CheckSquare", "sort_order": 2, "permission_key": None},
                    {"title": "Danh sách KPI", "route_path": "/admin/kpi/list", "icon": "List", "sort_order": 3, "permission_key": None},
                    {"title": "Quy tắc KPI", "route_path": "/admin/kpi/rules", "icon": "Book", "sort_order": 4, "permission_key": None},
                    {"title": "Phản hồi KPI", "route_path": "/admin/kpi/feedback", "icon": "MessageSquare", "sort_order": 5, "permission_key": None},
                ]
            }
        ]

        # List of Mobile Sidebar groups and items
        mobile_menus = [
            {"title": "Trang chủ", "route_path": "/dashboard", "icon": "LayoutGrid", "sort_order": 1, "permission_key": None},
            
            {
                "title": "Thông tin sản xuất", "icon": "Users", "sort_order": 2,
                "children": [
                    {"title": "Kế hoạch sản xuất", "route_path": "/plan", "icon": None, "sort_order": 1, "permission_key": None},
                    {"title": "Thông tin bàn giao", "route_path": "/delivery-info", "icon": None, "sort_order": 2, "permission_key": None},
                    {"title": "Lịch sử bàn giao", "route_path": "/delivery-history", "icon": None, "sort_order": 3, "permission_key": None},
                ]
            },

            {
                "title": "Báo cáo công việc", "icon": "Gamepad2", "sort_order": 4,
                "children": [
                    {"title": "Theo dõi KPI", "route_path": "/kpi", "icon": None, "sort_order": 1, "permission_key": None},
                    {"title": "Báo cáo công việc", "route_path": "/kpi-staff", "icon": None, "sort_order": 2, "permission_key": None},
                ]
            },
            {"title": "Báo cáo CAPA", "route_path": "/capa-list", "icon": "Bell", "sort_order": 5, "permission_key": None},
            {"title": "Tạo CTQ, SOS", "route_path": "/ctq-sos", "icon": "Smile", "sort_order": 6, "permission_key": None},
            {"title": "Báo cáo vi phạm", "route_path": "/awards", "icon": "AlertTriangle", "sort_order": 7, "permission_key": None},
            {"title": "Cảnh báo lỗi", "route_path": "/warnings", "icon": "Coins", "sort_order": 8, "permission_key": None},
            {"title": "Góp ý", "route_path": "/feedback", "icon": "Cookie", "sort_order": 9, "permission_key": None},
        ]

        def insert_menu(item, platform_name, parent_id=None):
            # Resolve screen_id if route_path matches
            screen_id = None
            route_path = item.get("route_path")
            if route_path:
                # Clean up query params if any
                clean_route = route_path.split('?')[0]
                screen_id = screens_map.get((platform_name, clean_route))

            insert_sql = text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                OUTPUT INSERTED.id
                VALUES (:platform, :parent_id, :title, :route_path, :icon, :sort_order, 1, :permission_key, :screen_id)
            """)
            
            res = db.execute(insert_sql, {
                "platform": platform_name,
                "parent_id": parent_id,
                "title": item["title"],
                "route_path": route_path,
                "icon": item.get("icon"),
                "sort_order": item["sort_order"],
                "permission_key": item.get("permission_key"),
                "screen_id": screen_id
            })
            
            inserted_id = res.fetchone()[0]
            
            if "children" in item:
                for child in item["children"]:
                    insert_menu(child, platform_name, parent_id=inserted_id)

        # Seed Web sidebars
        for w in web_menus:
            insert_menu(w, "Web")
        print("[OK] Seeded Web sidebar menus.")

        # Seed Mobile sidebars
        for m in mobile_menus:
            insert_menu(m, "Mobile")
        print("[OK] Seeded Mobile sidebar menus.")
        
        db.commit()
        print("[SUCCESS] All sidebar menus seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    upgrade()
