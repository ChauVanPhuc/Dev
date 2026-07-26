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
    # SHARED COMMON COMPONENT
    {
        "platform": "Shared",
        "route_path": "/common/toolbar",
        "default_code": "COMMON",
        "current_code": "COMMON",
        "title": "Toolbar / Thanh công cụ",
        "subtitle": "Thành phần dùng chung hệ thống"
    },
    {
        "platform": "Shared",
        "route_path": "/common/other",
        "default_code": "OTHER",
        "current_code": "OTHER",
        "title": "Khác",
        "subtitle": "Các lỗi/yêu cầu khác ngoài màn hình có sẵn"
    },
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
        "route_path": "/admin/profile",
        "default_code": "AD3.2-P",
        "current_code": "AD3.2-P",
        "title": "Thông tin cá nhân",
        "subtitle": "Quản lý thông tin cá nhân của bạn"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/permissions/:id",
        "default_code": "AD3.3",
        "current_code": "AD3.3",
        "title": "Chi tiết phân quyền người dùng",
        "subtitle": "Cấu hình quyền hạn cụ thể cho từng tài khoản"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/departments",
        "default_code": "AD3.4",
        "current_code": "AD3.4",
        "title": "Quản lý bộ phận",
        "subtitle": "Danh sách bộ phận trong hệ thống"
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/positions",
        "default_code": "AD3.5",
        "current_code": "AD3.5",
        "title": "Quản lý chức vụ",
        "subtitle": "Danh sách chức vụ và phân quyền mặc định"
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
        "route_path": "/admin/kpi/checklist",
        "default_code": "AD7.1",
        "current_code": "AD7.1",
        "title": "Checklist công việc",
        "subtitle": "Quản lý công việc trọng tâm nhân sự"
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/list",
        "default_code": "AD7.2",
        "current_code": "AD7.2",
        "title": "Danh sách KPI",
        "subtitle": "Thiết lập và theo dõi chỉ số KPI"
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/rules",
        "default_code": "AD7.3",
        "current_code": "AD7.3",
        "title": "Quy tắc cộng trừ điểm",
        "subtitle": "Cấu hình điểm số và hành vi vi phạm"
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/feedback",
        "default_code": "AD7.4",
        "current_code": "AD7.4",
        "title": "Phản hồi và nhận xét",
        "subtitle": "Đánh giá và phản hồi kết quả nhân sự"
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
    {
        "platform": "Web",
        "route_path": "/admin/defects",
        "default_code": "AD12",
        "current_code": "AD12",
        "title": "Quản lý danh mục lỗi",
        "subtitle": "Cấu hình danh sách các lỗi kiểm tra chất lượng"
    },
    {
        "platform": "Web",
        "route_path": "/admin/quality-records",
        "default_code": "AD13",
        "current_code": "AD13",
        "title": "Hồ sơ chất lượng",
        "subtitle": "Nhật ký và hồ sơ kiểm soát chất lượng"
    },
    {
        "platform": "Web",
        "route_path": "/admin/quality-records/:id",
        "default_code": "AD13.1",
        "current_code": "AD13.1",
        "title": "Chi tiết hồ sơ chất lượng",
        "subtitle": "Thông tin chi tiết kết quả đánh giá chất lượng"
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens",
        "default_code": "AD14",
        "current_code": "AD14",
        "title": "Quản lý Màn hình",
        "subtitle": "Cấu hình và thiết kế giao diện"
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens/:id",
        "default_code": "AD14.1",
        "current_code": "AD14.1",
        "title": "Chi tiết thiết kế màn hình",
        "subtitle": "Thông tin chi tiết cấu hình màn hình"
    },
    {
        "platform": "Web",
        "route_path": "/admin/sidebar",
        "default_code": "AD14.2",
        "current_code": "AD14.2",
        "title": "Quản lý Sidebar",
        "subtitle": "Cấu hình cấu trúc thanh điều hướng của Web và Mobile"
    },
    {
        "platform": "Web",
        "route_path": "/admin/monitor",
        "default_code": "AD15",
        "current_code": "AD15",
        "title": "Giám sát hệ thống & CSDL",
        "subtitle": "Theo dõi thời gian thực tài nguyên CPU, RAM, ổ đĩa và giới hạn kết nối của SQL Server"
    },
    {
        "platform": "Web",
        "route_path": "/admin/bugs",
        "default_code": "AD16",
        "current_code": "AD16",
        "title": "Quản lý Bug",
        "subtitle": "Quản lý và cập nhật tiến độ lỗi giao diện màn hình"
    },
    {
        "platform": "Web",
        "route_path": "/admin/iso-documents",
        "default_code": "AD17",
        "current_code": "AD17",
        "title": "Quản lý hồ sơ ISO",
        "subtitle": "Quản lý và lưu trữ hồ sơ tài liệu ISO"
    },
    {
        "platform": "Web",
        "route_path": "/admin/iso-processes",
        "default_code": "AD18",
        "current_code": "AD18",
        "title": "Quản lý quy trình",
        "subtitle": "Thiết lập các bước, lưu đồ quy trình và checklist QC"
    },
    {
        "platform": "Web",
        "route_path": "/admin/iso-documents/edit/:id",
        "default_code": "AD17.1",
        "current_code": "AD17.1",
        "title": "Cập nhật mẫu tài liệu",
        "subtitle": "Tùy biến cấu hình chi tiết tài liệu quy trình ISO"
    },
    {
        "platform": "Web",
        "route_path": "/admin/claims",
        "default_code": "CL1",
        "current_code": "CL1",
        "title": "Khiếu nại khách hàng (Claim)",
        "subtitle": "Quản lý và giải quyết các khiếu nại chất lượng sản phẩm"
    },
    {
        "platform": "Web",
        "route_path": "/admin/prices",
        "default_code": "CL2",
        "current_code": "CL2",
        "title": "Đơn giá sản phẩm",
        "subtitle": "Quản lý đơn giá sản phẩm và cấu hình chi phí"
    },
    {
        "platform": "Web",
        "route_path": "/admin/shipments",
        "default_code": "CL3",
        "current_code": "CL3",
        "title": "Thông tin giao hàng (Claim)",
        "subtitle": "Theo dõi thông tin xuất xưởng hàng hóa khiếu nại"
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
        "title": "Kiểm tra nhập kho",
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

def extract_routes_from_file(file_path: str):
    import re
    if not os.path.exists(file_path):
        print(f"[AUTO-REGISTER] File not found: {file_path}")
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    routes = []
    lines = content.split('\n')
    current_parents = [] # Stack of (indent_level, path)
    
    for line in lines:
        path_match = re.search(r'path=["\']([^"\']+)["\']', line)
        is_index = "index" in line
        
        if path_match:
            path = path_match.group(1)
            indent = len(line) - len(line.lstrip())
            
            while current_parents and current_parents[-1][0] >= indent:
                current_parents.pop()
                
            if current_parents:
                parent_path = current_parents[-1][1]
                if parent_path.endswith('/') or path.startswith('/'):
                    full_path = f"{parent_path.rstrip('/')}/{path.lstrip('/')}"
                else:
                    full_path = f"{parent_path}/{path}"
            else:
                full_path = path
                
            if not full_path.endswith('*'):
                routes.append(full_path)
                
            is_self_closing = line.strip().endswith('/>')
            if not is_self_closing:
                current_parents.append((indent, full_path))
                
        elif is_index and current_parents:
            routes.append(current_parents[-1][1])
            
    unique_routes = []
    for r in routes:
        r = r.strip()
        if not r.startswith('/'):
            r = '/' + r
        r = r.rstrip('/')
        if not r:
            r = '/'
        if r not in unique_routes:
            unique_routes.append(r)
            
    return unique_routes

def generate_default_title(path: str):
    segments = [s for s in path.split('/') if s and not s.startswith(':')]
    if not segments:
        return "Trang chủ"
    
    last = segments[-1]
    title = last.replace('-', ' ').replace('_', ' ').title()
    if ':id' in path or 'detail' in path.lower():
        title += " Detail"
        
    if path.startswith('/admin'):
        title = f"Admin {title}"
    elif path.startswith('/manufacture'):
        title = f"Manufacture {title}"
    return title

def get_next_screen_code(db, platform: str, route_path: str) -> str:
    if platform == "Mobile":
        prefix = "MB"
    else:
        if any(keyword in route_path for keyword in ["/claims", "/prices", "/shipments", "/chatbot"]):
            prefix = "CL"
        elif "/manufacture" in route_path:
            prefix = "MA"
        else:
            prefix = "AD"
            
    query = text("SELECT default_code FROM system_screens WHERE default_code LIKE :prefix")
    result = db.execute(query, {"prefix": f"{prefix}%"}).fetchall()
    
    import re
    max_num = 0
    for row in result:
        code = row[0]
        match = re.match(rf"{prefix}(\d+)", code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    has_params = ":" in route_path
    if has_params:
        base_path = route_path.split("/:")[0]
        base_query = text("SELECT default_code FROM system_screens WHERE route_path = :base_path AND platform = :platform")
        base_result = db.execute(base_query, {"base_path": base_path, "platform": platform}).fetchone()
        if base_result:
            base_code = base_result[0]
            sub_query = text("SELECT default_code FROM system_screens WHERE default_code LIKE :base_code_dot AND platform = :platform")
            sub_result = db.execute(sub_query, {"base_code_dot": f"{base_code}.%", "platform": platform}).fetchall()
            max_sub = 0
            for sub_row in sub_result:
                sub_code = sub_row[0]
                try:
                    sub_num = int(sub_code.split(".")[-1])
                    if sub_num > max_sub:
                        max_sub = sub_num
                except ValueError:
                    pass
            return f"{base_code}.{max_sub + 1}"
            
    return f"{prefix}{max_num + 1}"

def auto_register_missing_screens(db):
    print("[AUTO-REGISTER] Scanning for missing frontend routes...")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    
    web_app_file = os.path.join(base_dir, "FrontEnd", "Web", "Shared", "app", "App.jsx")
    mobile_app_file = os.path.join(base_dir, "FrontEnd", "Mobile", "app", "App.jsx")
    
    web_routes = extract_routes_from_file(web_app_file)
    mobile_routes = extract_routes_from_file(mobile_app_file)
    
    print(f"[AUTO-REGISTER] Found {len(web_routes)} Web routes and {len(mobile_routes)} Mobile routes.")
    
    # Process Web routes
    for route in web_routes:
        if route in ["/login", "/"]:
            continue
        
        # Check if already registered
        check_query = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = 'Web'")
        exists = db.execute(check_query, {"route_path": route}).fetchone()[0]
        
        if exists == 0:
            next_code = get_next_screen_code(db, "Web", route)
            title = generate_default_title(route)
            subtitle = f"Tự động đăng ký cho {route}"
            
            insert_sql = text("""
                INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                VALUES ('Web', :route_path, :code, :code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
            """)
            db.execute(insert_sql, {
                "route_path": route,
                "code": next_code,
                "title": title,
                "subtitle": subtitle,
                "updated_at": datetime.now()
            })
            db.commit()
            print(f"[AUTO-REGISTER] Registered NEW Web route: {route} -> Code: {next_code}, Title: {title}")
            
    # Process Mobile routes
    for route in mobile_routes:
        if route in ["/login", "/"]:
            continue
            
        # Check if already registered
        check_query = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = 'Mobile'")
        exists = db.execute(check_query, {"route_path": route}).fetchone()[0]
        
        if exists == 0:
            next_code = get_next_screen_code(db, "Mobile", route)
            title = generate_default_title(route)
            subtitle = f"Tự động đăng ký cho {route}"
            
            insert_sql = text("""
                INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                VALUES ('Mobile', :route_path, :code, :code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
            """)
            db.execute(insert_sql, {
                "route_path": route,
                "code": next_code,
                "title": title,
                "subtitle": subtitle,
                "updated_at": datetime.now()
            })
            db.commit()
            print(f"[AUTO-REGISTER] Registered NEW Mobile route: {route} -> Code: {next_code}, Title: {title}")

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
                    status NVARCHAR(50) NOT NULL DEFAULT N'Mới thiết kế',
                    target_date NVARCHAR(20) NULL,
                    mockup_path NVARCHAR(1000) NULL,
                    updated_at DATETIME NULL,
                    CONSTRAINT UQ_platform_route UNIQUE (platform, route_path)
                )
            """)
            db.execute(create_table_sql)
            db.commit()
            print("[OK] Created system_screens table with composite unique constraint")
        else:
            print("[INFO] system_screens table already exists, checking for dynamic column updates.")
            try:
                dialect = db.bind.dialect.name
                if dialect == 'sqlite':
                    existing_cols = [row[1] for row in db.execute(text("PRAGMA table_info(system_screens)")).fetchall()]
                else:
                    cols_query = text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'system_screens'")
                    existing_cols = [r[0] for r in db.execute(cols_query).fetchall()]
                
                if 'status' not in existing_cols:
                    print("Adding 'status' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD status NVARCHAR(50) NOT NULL DEFAULT N'Mới thiết kế'"))
                    db.commit()
                if 'target_date' not in existing_cols:
                    print("Adding 'target_date' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD target_date NVARCHAR(20) NULL"))
                    db.commit()
                if 'mockup_path' not in existing_cols:
                    print("Adding 'mockup_path' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD mockup_path NVARCHAR(1000) NULL"))
                    db.commit()
            except Exception as alter_err:
                print(f"Error altering system_screens: {alter_err}")
            
        # Clean up corrupted auto-registered routes from Web platform
        cleanup_sql = text("""
            DELETE FROM system_screens 
            WHERE platform = 'Web' 
              AND route_path NOT LIKE '/admin%' 
              AND route_path NOT LIKE '/manufacture%' 
              AND route_path NOT LIKE '/login' 
              AND route_path NOT LIKE '/common%' 
              AND route_path <> '/'
        """)
        db.execute(cleanup_sql)
        db.commit()
        print("[OK] Cleaned up incorrect auto-registered routes from system_screens")
        
        # Seed initial data
        print("Seeding initial screen configurations...")
        for screen in INITIAL_SCREENS:
            # Check if this route already exists
            check_route = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = :platform")
            route_exists = db.execute(check_route, {"route_path": screen["route_path"], "platform": screen["platform"]}).fetchone()[0]
            
            if route_exists == 0:
                insert_sql = text("""
                    INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                    VALUES (:platform, :route_path, :default_code, :current_code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
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
        
        # Run auto-registration of missing screens
        # try:
        #     auto_register_missing_screens(db)
        # except Exception as e:
        #     err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        #     print(f"[AUTO-REGISTER] Failed: {err_msg}")
        
    except Exception as e:
        db.rollback()
        err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"[ERROR] Migration failed: {err_msg}")
        raise

if __name__ == "__main__":
    upgrade()
