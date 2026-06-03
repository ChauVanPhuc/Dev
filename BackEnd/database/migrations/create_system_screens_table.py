"""
Migration: Create system_screens table and seed initial data
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db
from datetime import datetime

INITIAL_SCREENS = [
    # WEB ADMIN SCREENS
    {
        "platform": "Web",
        "route_path": "/login",
        "default_code": "AD1",
        "current_code": "AD1",
        "title": "Đăng nhập",
        "subtitle": "Đăng nhập hệ thống"
    },
    {
        "platform": "Web",
        "route_path": "/admin/dashboard",
        "default_code": "AD2",
        "current_code": "AD2",
        "title": "Trang chủ",
        "subtitle": "Tổng quan hệ thống"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users",
        "default_code": "AD3",
        "current_code": "AD3",
        "title": "Quản lý người dùng",
        "subtitle": "Danh sách người dùng"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/create",
        "default_code": "AD3.1",
        "current_code": "AD3.1",
        "title": "Tạo người dùng mới",
        "subtitle": "Biểu mẫu thêm nhân sự mới"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/edit/:id",
        "default_code": "AD3.2",
        "current_code": "AD3.2",
        "title": "Chỉnh sửa người dùng",
        "subtitle": "Biểu mẫu sửa thông tin nhân sự"
    },
    {
        "platform": "Web",
        "route_path": "/admin/handovers",
        "default_code": "AD4",
        "current_code": "AD4",
        "title": "Danh sách bàn giao",
        "subtitle": "Quản lý biên bản"
    },
    {
        "platform": "Web",
        "route_path": "/admin/logs",
        "default_code": "AD5",
        "current_code": "AD5",
        "title": "Nhật ký sự cố",
        "subtitle": "Báo cáo lỗi ghi nhận"
    },
    {
        "platform": "Web",
        "route_path": "/admin/reports",
        "default_code": "AD6",
        "current_code": "AD6",
        "title": "Báo cáo kiểm tra",
        "subtitle": "Kết quả đánh giá"
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi",
        "default_code": "AD7",
        "current_code": "AD7",
        "title": "Báo cáo KPI",
        "subtitle": "Đánh giá năng suất"
    },
    {
        "platform": "Web",
        "route_path": "/admin/feedback",
        "default_code": "AD8",
        "current_code": "AD8",
        "title": "Góp ý cải tiến",
        "subtitle": "Đề xuất sáng kiến"
    },
    {
        "platform": "Web",
        "route_path": "/admin/hotspots",
        "default_code": "AD9",
        "current_code": "AD9",
        "title": "Điểm nóng cần chú ý",
        "subtitle": "Giám sát rủi ro"
    },
    {
        "platform": "Web",
        "route_path": "/admin/data",
        "default_code": "AD10",
        "current_code": "AD10",
        "title": "Dữ liệu đóng gói",
        "subtitle": "Quản lý vận chuyển và đồng bộ dữ liệu QR"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/backup-qrs",
        "default_code": "AD11",
        "current_code": "AD11",
        "title": "Quản lý QR dự phòng",
        "subtitle": "Cấu hình và cấp phát thẻ QR"
    },
    
    # WEB MANUFACTURE SCREENS
    {
        "platform": "Web",
        "route_path": "/manufacture/dashboard",
        "default_code": "MA1",
        "current_code": "MA1",
        "title": "Tổng quan sản xuất",
        "subtitle": "Trạng thái và tiến độ"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/plan",
        "default_code": "MA2",
        "current_code": "MA2",
        "title": "Kế hoạch sản xuất",
        "subtitle": "Quản lý lệnh sản xuất"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/plan/:id",
        "default_code": "MA2.1",
        "current_code": "MA2.1",
        "title": "Chi tiết kế hoạch",
        "subtitle": "Thông tin chi tiết tổ sản xuất"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/plan/create",
        "default_code": "MA2.2",
        "current_code": "MA2.2",
        "title": "Thêm kế hoạch sản xuất",
        "subtitle": "Tạo kế hoạch sản xuất mới"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/orders",
        "default_code": "MA3",
        "current_code": "MA3",
        "title": "Đơn hàng sản xuất",
        "subtitle": "Quản lý đơn hàng"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/orders/create",
        "default_code": "MA3.1",
        "current_code": "MA3.1",
        "title": "Tạo đơn hàng",
        "subtitle": "Tạo đơn hàng mới"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/products",
        "default_code": "MA4",
        "current_code": "MA4",
        "title": "Danh mục sản phẩm",
        "subtitle": "Quản lý sản phẩm"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/products/:id",
        "default_code": "MA4.1",
        "current_code": "MA4.1",
        "title": "Chi tiết sản phẩm",
        "subtitle": "Thông tin kỹ thuật sản phẩm"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/products/create",
        "default_code": "MA4.2",
        "current_code": "MA4.2",
        "title": "Thêm sản phẩm",
        "subtitle": "Đăng ký sản phẩm mới"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/progress/:id",
        "default_code": "MA5",
        "current_code": "MA5",
        "title": "Tiến độ sản xuất",
        "subtitle": "Giám sát trực quan tổ máy"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/delivery-tracking",
        "default_code": "MA6",
        "current_code": "MA6",
        "title": "Theo dõi giao hàng",
        "subtitle": "Báo cáo giao nhận hàng hóa"
    },
    {
        "platform": "Web",
        "route_path": "/manufacture/exception-deliveries",
        "default_code": "MA7",
        "current_code": "MA7",
        "title": "Thẻ Pallet ngoại lệ",
        "subtitle": "Quản lý thẻ pallet và sự cố"
    },

    # MOBILE SCREENS
    {
        "platform": "Mobile",
        "route_path": "/login",
        "default_code": "MB1",
        "current_code": "MB1",
        "title": "Đăng nhập",
        "subtitle": "Hệ thống Mobile"
    },
    {
        "platform": "Mobile",
        "route_path": "/delivery-info",
        "default_code": "MB2",
        "current_code": "MB2",
        "title": "Thông tin giao hàng",
        "subtitle": "Giao nhận hàng"
    },
    {
        "platform": "Mobile",
        "route_path": "/delivery-create",
        "default_code": "MB2.1",
        "current_code": "MB2.1",
        "title": "Tạo phiếu giao hàng",
        "subtitle": "Tạo phiếu giao hàng"
    },
    {
        "platform": "Mobile",
        "route_path": "/delivery-receive/:id",
        "default_code": "MB2.2",
        "current_code": "MB2.2",
        "title": "Nhận hàng",
        "subtitle": "Xác nhận nhận hàng"
    },
    {
        "platform": "Mobile",
        "route_path": "/input-inspection",
        "default_code": "MB2.4",
        "current_code": "MB2.4",
        "title": "Kiểm tra đầu vào",
        "subtitle": "Đánh giá chất lượng"
    },
    {
        "platform": "Mobile",
        "route_path": "/plan",
        "default_code": "MB4",
        "current_code": "MB4",
        "title": "Theo dõi kế hoạch",
        "subtitle": "Tiến độ công việc"
    },
    {
        "platform": "Mobile",
        "route_path": "/inspection-daily",
        "default_code": "MB5",
        "current_code": "MB5",
        "title": "Kiểm tra hàng ngày",
        "subtitle": "Nhật ký kiểm tra"
    },
    {
        "platform": "Mobile",
        "route_path": "/inspection-stage",
        "default_code": "MB6",
        "current_code": "MB6",
        "title": "Kiểm tra công đoạn",
        "subtitle": "Kiểm tra bán thành phẩm"
    },
    {
        "platform": "Mobile",
        "route_path": "/logs",
        "default_code": "MB7",
        "current_code": "MB7",
        "title": "Lịch sử kiểm tra",
        "subtitle": "Nhật ký kiểm tra"
    },
    {
        "platform": "Mobile",
        "route_path": "/kpi",
        "default_code": "MB8",
        "current_code": "MB8",
        "title": "Theo dõi KPI",
        "subtitle": "Hiệu suất làm việc"
    },
    {
        "platform": "Mobile",
        "route_path": "/staff-evaluation/:id",
        "default_code": "MB8.1",
        "current_code": "MB8.1",
        "title": "Đánh giá nhân viên",
        "subtitle": "Báo cáo đánh giá"
    },
    {
        "platform": "Mobile",
        "route_path": "/kpi-staff",
        "default_code": "MB8.2",
        "current_code": "MB8.2",
        "title": "Danh sách KPI nhân viên",
        "subtitle": "Theo dõi hiệu suất"
    },
    {
        "platform": "Mobile",
        "route_path": "/awards",
        "default_code": "MB9",
        "current_code": "MB9",
        "title": "Khen thưởng & Kỷ luật",
        "subtitle": "Lịch sử đánh giá"
    },
    {
        "platform": "Mobile",
        "route_path": "/equipment-list",
        "default_code": "MB10",
        "current_code": "MB10",
        "title": "Danh sách thiết bị",
        "subtitle": "Bảo trì thiết bị"
    },
    {
        "platform": "Mobile",
        "route_path": "/quality-detail/:id/:category",
        "default_code": "MB11",
        "current_code": "MB11",
        "title": "Chi tiết kiểm tra chất lượng",
        "subtitle": "Kết quả chi tiết QC"
    },
    {
        "platform": "Mobile",
        "route_path": "/thermal-print",
        "default_code": "MB12",
        "current_code": "MB12",
        "title": "In nhiệt",
        "subtitle": "Cấu hình máy in"
    },
    {
        "platform": "Mobile",
        "route_path": "/capa-list",
        "default_code": "MB13",
        "current_code": "MB13",
        "title": "Danh sách CAPA",
        "subtitle": "Hành động khắc phục"
    },
    {
        "platform": "Mobile",
        "route_path": "/capa-report/:id",
        "default_code": "MB14",
        "current_code": "MB14",
        "title": "Báo cáo CAPA",
        "subtitle": "Tạo báo cáo khắc phục"
    },
    {
        "platform": "Mobile",
        "route_path": "/capa-detail/:capaId/:occurrenceId",
        "default_code": "MB15",
        "current_code": "MB15",
        "title": "Chi tiết CAPA",
        "subtitle": "Chi tiết hành động khắc phục"
    }
]

def upgrade():
    """Create system_screens table and seed it"""
    db = next(get_db())
    try:
        # Check if table exists
        table_exists_query = text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'system_screens'")
        table_exists = db.execute(table_exists_query).fetchone()[0]
        
        if table_exists == 0:
            print("Creating system_screens table...")
            create_table_sql = text("""
                CREATE TABLE system_screens (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    platform NVARCHAR(20) NOT NULL,
                    route_path NVARCHAR(150) NOT NULL,
                    default_code NVARCHAR(20) NOT NULL,
                    current_code NVARCHAR(20) NOT NULL,
                    title NVARCHAR(100) NOT NULL,
                    subtitle NVARCHAR(150) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    updated_at DATETIME NULL,
                    CONSTRAINT UQ_platform_route UNIQUE (platform, route_path)
                )
            """)
            db.execute(create_table_sql)
            db.commit()
            print("[OK] Created system_screens table with composite unique constraint")
        else:
            print("[INFO] system_screens table already exists, skipping creation.")
            
        # Seed initial data
        print("Seeding initial screen configurations...")
        for screen in INITIAL_SCREENS:
            # Check if this route already exists
            check_route = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = :platform")
            route_exists = db.execute(check_route, {"route_path": screen["route_path"], "platform": screen["platform"]}).fetchone()[0]
            
            if route_exists == 0:
                insert_sql = text("""
                    INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, updated_at)
                    VALUES (:platform, :route_path, :default_code, :current_code, :title, :subtitle, 1, :updated_at)
                """)
                db.execute(insert_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "current_code": screen["current_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[OK] Seeded route {screen['route_path']} ({screen['platform']})")
            else:
                # Update details if exists
                update_sql = text("""
                    UPDATE system_screens 
                    SET default_code = :default_code, title = :title, subtitle = :subtitle, updated_at = :updated_at
                    WHERE route_path = :route_path AND platform = :platform
                """)
                db.execute(update_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[SKIP/UPDATE] Route {screen['route_path']} ({screen['platform']}) already exists, updated details")
                
        db.commit()
        print("[SUCCESS] Seeding completed!")
        
    except Exception as e:
        db.rollback()
        err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"[ERROR] Migration failed: {err_msg}")
        raise

if __name__ == "__main__":
    upgrade()
