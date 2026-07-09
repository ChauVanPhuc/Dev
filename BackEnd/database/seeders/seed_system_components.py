"""
Seeder script to populate system_components table with initial metadata for all screens.
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from config.database import get_db, engine
from config.database import Base
import app.models  # ensure models are registered
from datetime import datetime

def safe_print(text_msg):
    try:
        print(text_msg)
    except UnicodeEncodeError:
        try:
            print(text_msg.encode('ascii', errors='backslashreplace').decode('ascii'))
        except:
            pass

def enrich_technical_details(comp):
    tech = comp.get("technical_details", "")
    if not tech:
        tech = ""
    
    # If it's already a JSON string, leave it
    if tech.strip().startswith('{'):
        return tech
        
    name = comp.get("name", "")
    comp_type = comp.get("type", "")
    desc = comp.get("description", "")
    
    # Initialize JSON parts
    handler_name = ""
    called_apis = []
    database_tables = []
    details = tech
    code_snippet = ""
    user_guide = desc
    
    # 1. Infer handler name
    if "button" in name.lower() or "btn" in name.lower() or "submit" in name.lower():
        handler_name = f"handle{name}Click"
    elif "form" in name.lower() or "create" in name.lower() or "edit" in name.lower():
        handler_name = "handleSubmit"
    elif "search" in name.lower() or "filter" in name.lower() or "select" in name.lower():
        handler_name = "handleFilterChange"
    elif "table" in name.lower() or "list" in name.lower() or "grid" in name.lower():
        handler_name = "fetchData"
    else:
        handler_name = "handleInteraction"
        
    # 2. Extract APIs
    words = tech.split()
    for word in words:
        if "/api/" in word:
            clean_api = word.strip(".,();\"'")
            # Find if there's a HTTP method preceding it
            idx = words.index(word)
            method = "GET"
            if idx > 0 and words[idx-1].upper() in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
                method = words[idx-1].upper()
            called_apis.append(f"{method} {clean_api}")
            
    if not called_apis:
        for word in desc.split():
            if "/api/" in word:
                clean_api = word.strip(".,();\"'")
                called_apis.append(f"GET {clean_api}")
                
    # 3. Infer database tables
    known_tables = ["accounts", "employees", "deliveries", "delivery_details", "products", "production_plans", "production_orders", "qc_logs", "incident_logs", "kpi_reports", "equipment"]
    for table in known_tables:
        if table in tech.lower() or table in desc.lower() or table.replace("_", "") in tech.lower() or table.replace("_", "") in desc.lower():
            database_tables.append(table)
            
    # 4. Generate dynamic code snippet
    fallback_data_api = called_apis[0] if called_apis else "/api/v1/data"
    fallback_submit_api = called_apis[0] if called_apis else "/api/v1/submit"
    
    if handler_name == "fetchData":
        code_snippet = f"const fetchData = async (params) => {{\n  try {{\n    const response = await api.get('{fallback_data_api}', {{ params }});\n    setRows(response.data);\n  }} catch (err) {{\n    console.error('Error fetching data:', err);\n  }}\n}};"
    elif handler_name == "handleSubmit":
        code_snippet = f"const handleSubmit = async (e) => {{\n  e.preventDefault();\n  const isValid = validateForm();\n  if (isValid) {{\n    await api.post('{fallback_submit_api}', formData);\n    navigate('/success');\n  }}\n}};"
    elif handler_name == "handleFilterChange":
        code_snippet = f"const handleFilterChange = (value) => {{\n  setFilters(prev => ({{ ...prev, value }}));\n  debounceFetch();\n}};"
    else:
        code_snippet = f"const {handler_name} = (event) => {{\n  console.log('User interacted with {name}');\n  // Execute business logic\n}};"

    # 5. Compile into structured JSON
    structured = {
        "handler_name": handler_name,
        "details": details or "Chức năng xử lý hệ thống cốt lõi.",
        "user_guide": user_guide or "Nhập hoặc chọn để tương tác.",
        "called_apis": called_apis or ["N/A"],
        "database_tables": database_tables or ["system_components"],
        "code_snippet": code_snippet
    }
    
    return json.dumps(structured, ensure_ascii=False)

COMPONENT_SEEDS = {
    # AD1: Đăng nhập (Web)
    "AD1": [
        {
            "name": "LoginForm",
            "type": "UI Component",
            "description": "Form đăng nhập với Username và Password, hỗ trợ validate dữ liệu client-side.",
            "technical_details": "Kiểm tra rỗng, hiển thị/ẩn mật khẩu, lưu thông tin đăng nhập tạm thời.",
            "file_path": "/FrontEnd/src/pages/Login.jsx"
        },
        {
            "name": "AuthService",
            "type": "Logic / Service",
            "description": "Quản lý luồng xác thực người dùng, lưu trữ và làm mới JWT token.",
            "technical_details": "POST /api/v1/accounts/login. Lưu token vào localStorage, cấu hình header Authorization cho API.",
            "file_path": "/FrontEnd/src/services/auth.service.js"
        }
    ],
    
    # AD2: Trang chủ (Web) - Dashboard
    "AD2": [
        {
            "name": "DashboardOverview",
            "type": "UI Component",
            "description": "Hiển thị tổng quan các chỉ số KPI, tỷ lệ lỗi chất lượng QC, và sản lượng sản xuất.",
            "technical_details": "Sử dụng CSS Grid để hiển thị danh sách các card thống kê động.",
            "file_path": "/FrontEnd/src/pages/Admin/Dashboard.jsx"
        },
        {
            "name": "KPIStatCards",
            "type": "UI Component",
            "description": "Thẻ KPI hiển thị tỷ lệ lỗi của tuần và tháng so với kế hoạch đề ra.",
            "technical_details": "Component con nhận dữ liệu từ Dashboard để render số lượng và vẽ biểu đồ mini.",
            "file_path": "/FrontEnd/src/pages/Admin/Dashboard.jsx"
        },
        {
            "name": "DashboardService",
            "type": "Logic / Service",
            "description": "Tải toàn bộ số liệu thống kê tổng hợp để hiển thị trên Dashboard.",
            "technical_details": "GET /api/v1/dashboard/stats. Cập nhật state dữ liệu tổng quan.",
            "file_path": "/FrontEnd/src/services/dashboard.service.js"
        }
    ],
    
    # AD3: Quản lý người dùng (Web)
    "AD3": [
        {
            "name": "UserTable",
            "type": "UI Component",
            "description": "Bảng hiển thị danh sách toàn bộ tài khoản người dùng hệ thống.",
            "technical_details": "Hiển thị Mã nhân viên, Họ tên, Username, Bộ phận, Vai trò, Trạng thái. Tích hợp cột thao tác nhanh.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "UserFilter",
            "type": "UI Component",
            "description": "Dropdown bộ lọc trạng thái tài khoản người dùng.",
            "technical_details": "Lọc danh sách theo trạng thái: Đang sử dụng, Dừng hoạt động, Đang chờ xóa.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "UserSearch",
            "type": "UI Component",
            "description": "Thanh tìm kiếm tài khoản người dùng thời gian thực.",
            "technical_details": "Nhập tên hoặc mã nhân viên để lọc dữ liệu trực tiếp với cơ chế debounce 500ms.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "UserCreateButton",
            "type": "UI Component",
            "description": "Nút điều hướng nhanh đến trang tạo tài khoản mới.",
            "technical_details": "Gọi navigate('/admin/users/create') khi click.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "ExportUserButton",
            "type": "UI Component",
            "description": "Nút xuất danh sách tài khoản người dùng ra file Excel hoặc CSV.",
            "technical_details": "Hỗ trợ xuất danh sách dựa trên các tham số tìm kiếm và bộ lọc đang chọn.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "Pagination",
            "type": "UI Component",
            "description": "Bộ chuyển trang và phân trang danh sách người dùng.",
            "technical_details": "Hiển thị tổng số kết quả, số trang hiện tại và các nút bấm chuyển trang trước/sau.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "ActionMenu",
            "type": "UI Component",
            "description": "Dropdown danh mục các thao tác nhanh trên mỗi tài khoản.",
            "technical_details": "Chứa các tùy chọn: Chỉnh sửa (✏️), Đình chỉ (⏸), Xóa tài khoản (🗑). Đóng khi click ngoài.",
            "file_path": "/FrontEnd/src/pages/Admin/UserManagement.jsx"
        },
        {
            "name": "ActivityFeed",
            "type": "UI Component",
            "description": "Bảng hiển thị feed các hoạt động gần đây của các tài khoản hệ thống.",
            "technical_details": "Tải dữ liệu log hoạt động từ endpoint `/api/v1/accounts/activities` và render danh sách.",
            "file_path": "/FrontEnd/src/components/ActivityFeed.jsx"
        }
    ],
    
    # AD3.1: Tạo người dùng mới (Web)
    "AD3.1": [
        {
            "name": "UserCreateForm",
            "type": "UI Component",
            "description": "Form điền thông tin cá nhân và tài khoản để tạo nhân sự mới.",
            "technical_details": "Bao gồm các trường: Mã NV, Họ tên, Username, Mật khẩu. Hỗ trợ validate độ dài mật khẩu và ký tự.",
            "file_path": "/FrontEnd/src/pages/Admin/UserCreate.jsx"
        },
        {
            "name": "DepartmentSelector",
            "type": "UI Component",
            "description": "Dropdown chọn bộ phận làm việc của nhân sự.",
            "technical_details": "Lựa chọn các phòng ban như: Sản xuất, QC, Hành chính, Ban giám đốc.",
            "file_path": "/FrontEnd/src/pages/Admin/UserCreate.jsx"
        },
        {
            "name": "RoleSelector",
            "type": "UI Component",
            "description": "Dropdown phân quyền vai trò người dùng trong hệ thống.",
            "technical_details": "Lựa chọn các vai trò: IT, BGD, Tổ trưởng, Nhân viên, QC.",
            "file_path": "/FrontEnd/src/pages/Admin/UserCreate.jsx"
        },
        {
            "name": "StageSelector",
            "type": "UI Component",
            "description": "Dropdown gán công đoạn làm việc cho nhân viên sản xuất.",
            "technical_details": "Chỉ kích hoạt khi chọn bộ phận Sản xuất. Lấy danh sách công đoạn từ database.",
            "file_path": "/FrontEnd/src/pages/Admin/UserCreate.jsx"
        },
        {
            "name": "UserCreateService",
            "type": "Logic / Service",
            "description": "Gửi yêu cầu tạo tài khoản mới lên máy chủ.",
            "technical_details": "POST /api/v1/accounts/ với JSON payload chứa thông tin tài khoản.",
            "file_path": "/FrontEnd/src/pages/Admin/UserCreate.jsx"
        }
    ],

    # AD4: Danh sách bàn giao (Web)
    "AD4": [
        {
            "name": "HandoverTable",
            "type": "UI Component",
            "description": "Bảng danh sách toàn bộ các biên bản giao nhận hàng hóa giữa các công đoạn sản xuất.",
            "technical_details": "Hiển thị mã phiếu giao, KHSX, chi tiết linh kiện, số lượng giao/nhận/trả, trạng thái QC.",
            "file_path": "/FrontEnd/src/pages/Admin/HandoverList.jsx"
        },
        {
            "name": "HandoverFilter",
            "type": "UI Component",
            "description": "Thanh lọc trạng thái phiếu bàn giao hàng hóa.",
            "technical_details": "Lọc theo: Đang chờ QC, Hoàn thành, Bị lỗi QC, Bị trả về, Đang giao.",
            "file_path": "/FrontEnd/src/pages/Admin/HandoverList.jsx"
        },
        {
            "name": "HandoverService",
            "type": "Logic / Service",
            "description": "Tải danh sách biên bản bàn giao từ server.",
            "technical_details": "GET /api/v1/deliveries/ với các tham số page, size, status, search.",
            "file_path": "/FrontEnd/src/services/delivery.service.js"
        }
    ],

    # AD5: Nhật ký sự cố (Web)
    "AD5": [
        {
            "name": "IncidentTable",
            "type": "UI Component",
            "description": "Bảng hiển thị các báo cáo sự cố hư hỏng máy móc thiết bị tại xưởng.",
            "technical_details": "Hiển thị mã thiết bị, tên máy, mô tả lỗi, mức độ nghiêm trọng và trạng thái khắc phục.",
            "file_path": "/FrontEnd/src/pages/Admin/IncidentLogs.jsx"
        },
        {
            "name": "IncidentService",
            "type": "Logic / Service",
            "description": "Giao tiếp API quản lý sự cố và cập nhật trạng thái xử lý.",
            "technical_details": "GET /api/v1/incidents/, PATCH /api/v1/incidents/{id}/status để cập nhật trạng thái.",
            "file_path": "/FrontEnd/src/pages/Admin/IncidentLogs.jsx"
        }
    ],

    # AD6: Báo cáo kiểm tra (Web)
    "AD6": [
        {
            "name": "InspectionReportTable",
            "type": "UI Component",
            "description": "Bảng thống kê kết quả kiểm tra chất lượng định kỳ.",
            "technical_details": "Hiển thị tổng số mẫu, số đạt, số lỗi và tỷ lệ đạt chất lượng theo từng công đoạn.",
            "file_path": "/FrontEnd/src/pages/Admin/InspectionReports.jsx"
        },
        {
            "name": "InspectionReportFilter",
            "type": "UI Component",
            "description": "Bộ lọc thời gian và công đoạn cho báo cáo chất lượng.",
            "technical_details": "Chọn khoảng thời gian (từ ngày - đến ngày) và công đoạn sản xuất cần xem.",
            "file_path": "/FrontEnd/src/pages/Admin/InspectionReports.jsx"
        }
    ],

    # AD7: Báo cáo KPI (Web)
    "AD7": [
        {
            "name": "KPIReportTable",
            "type": "UI Component",
            "description": "Bảng xếp hạng và thống kê điểm số KPI của nhân viên.",
            "technical_details": "Hiển thị mã nhân viên, họ tên, công đoạn, điểm năng suất, điểm kỷ luật và tổng điểm xếp loại.",
            "file_path": "/FrontEnd/src/pages/Admin/KPIReports.jsx"
        },
        {
            "name": "KPIReportService",
            "type": "Logic / Service",
            "description": "Tải báo cáo thống kê KPI nhân sự từ máy chủ.",
            "technical_details": "GET /api/v1/kpis/reports. Hỗ trợ lọc theo tháng và theo phòng ban.",
            "file_path": "/FrontEnd/src/pages/Admin/KPIReports.jsx"
        }
    ],

    # AD8: Góp ý cải tiến (Web)
    "AD8": [
        {
            "name": "ImprovementTable",
            "type": "UI Component",
            "description": "Bảng tổng hợp các ý kiến đóng góp, đề xuất cải tiến từ xưởng.",
            "technical_details": "Hiển thị tiêu đề, chi tiết đóng góp, người gửi, ngày gửi và trạng thái xem xét.",
            "file_path": "/FrontEnd/src/pages/Admin/Improvements.jsx"
        },
        {
            "name": "ImprovementService",
            "type": "Logic / Service",
            "description": "Service tương tác với các API quản lý đề xuất cải tiến.",
            "technical_details": "GET /api/v1/improvements/.",
            "file_path": "/FrontEnd/src/services/improvement.service.js"
        }
    ],

    # AD9: Điểm nóng cần chú ý (Web)
    "AD9": [
        {
            "name": "HotspotTable",
            "type": "UI Component",
            "description": "Bảng tổng hợp các điểm nóng rủi ro cao vượt ngưỡng an toàn.",
            "technical_details": "Cảnh báo các loại lỗi QC hoặc thiết bị hư hỏng lặp lại nhiều lần trong tuần.",
            "file_path": "/FrontEnd/src/pages/Admin/Hotspots.jsx"
        },
        {
            "name": "HotspotService",
            "type": "Logic / Service",
            "description": "Lấy danh sách các cảnh báo rủi ro điểm nóng.",
            "technical_details": "GET /api/v1/dashboard/hotspots.",
            "file_path": "/FrontEnd/src/services/hotspot.service.js"
        }
    ],

    # AD10: Dữ liệu đóng gói (Web)
    "AD10": [
        {
            "name": "DataPackagingTable",
            "type": "UI Component",
            "description": "Quản lý danh sách các gói dữ liệu xuất xưởng và đồng bộ.",
            "technical_details": "Hiển thị mã gói hàng, số lượng thẻ QR đi kèm, trạng thái đồng bộ và ngày tạo.",
            "file_path": "/FrontEnd/src/pages/Admin/DataPackaging.jsx"
        },
        {
            "name": "DataPackagingService",
            "type": "Logic / Service",
            "description": "Service thực hiện đóng gói dữ liệu và kiểm tra đồng bộ.",
            "technical_details": "POST /api/v1/data/package, GET /api/v1/data/sync-status.",
            "file_path": "/FrontEnd/src/services/data.service.js"
        }
    ],

    # AD11: Quản lý QR dự phòng (Web)
    "AD11": [
        {
            "name": "QRList",
            "type": "UI Component",
            "description": "Danh sách các mã QR lưu thông tin trong database.",
            "technical_details": "Render thông tin mã, trạng thái (Trống, Đang dùng) và mã phiếu giao.",
            "file_path": "/FrontEnd/src/pages/Admin/BackupQRManagement.jsx"
        },
        {
            "name": "GenerateQRForm",
            "type": "UI Component",
            "description": "Form sinh dải mã QR mới tự động.",
            "technical_details": "Gọi POST /api/v1/deliveries/backup-qrs. Sinh mã tăng dần.",
            "file_path": "/FrontEnd/src/pages/Admin/BackupQRManagement.jsx"
        },
        {
            "name": "PrintQRModal",
            "type": "UI Component",
            "description": "Hộp thoại vẽ mã QR để in ấn trực tiếp.",
            "technical_details": "Vẽ QR code từ API qrserver. CSS media print khổ A5.",
            "file_path": "/FrontEnd/src/pages/Admin/BackupQRManagement.jsx"
        },
        {
            "name": "UnlockQRButton",
            "type": "Logic / Service",
            "description": "Giải phóng trạng thái thẻ QR bị kẹt.",
            "technical_details": "Gọi POST /api/v1/deliveries/backup-qrs/{qr_id}/release. Reset về status='Trống'.",
            "file_path": "/FrontEnd/src/pages/Admin/BackupQRManagement.jsx"
        }
    ],

    # MA1: Tổng quan sản xuất (Web)
    "MA1": [
        {
            "name": "ManufactureDashboardOverview",
            "type": "UI Component",
            "description": "Dashboard giám sát hoạt động sản xuất của nhà máy.",
            "technical_details": "Hiển thị sản lượng ngày, tiến độ các KHSX hiện hành và tỷ lệ hoàn thành.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Dashboard.jsx"
        },
        {
            "name": "ManufactureDashboardService",
            "type": "Logic / Service",
            "description": "Lấy dữ liệu thống kê sản xuất realtime.",
            "technical_details": "GET /api/v1/manufacture/stats.",
            "file_path": "/FrontEnd/src/services/dashboard.service.js"
        }
    ],

    # MA2: Kế hoạch sản xuất (Web)
    "MA2": [
        {
            "name": "PlanTable",
            "type": "UI Component",
            "description": "Bảng hiển thị danh sách các Kế hoạch sản xuất (KHSX).",
            "technical_details": "Hiển thị Mã kế hoạch, Tên kế hoạch, Mã sản phẩm, Số lượng yêu cầu, Trạng thái.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Plan.jsx"
        },
        {
            "name": "PlanFilter",
            "type": "UI Component",
            "description": "Thanh lọc kế hoạch sản xuất theo trạng thái.",
            "technical_details": "Lọc theo: Đang chạy, Chờ duyệt, Hoàn thành, Đã hủy.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Plan.jsx"
        },
        {
            "name": "PlanImportButton",
            "type": "UI Component",
            "description": "Nút nhập dữ liệu KHSX hàng loạt từ file Excel.",
            "technical_details": "Hỗ trợ chọn file và gửi dữ liệu FormData lên máy chủ.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Plan.jsx"
        },
        {
            "name": "PlanService",
            "type": "Logic / Service",
            "description": "Xử lý các API liên quan đến Kế hoạch sản xuất.",
            "technical_details": "GET /api/v1/plans/, POST /api/v1/plans/import.",
            "file_path": "/FrontEnd/src/services/plan.service.js"
        }
    ],

    # MA2.1: Chi tiết kế hoạch (Web)
    "MA2.1": [
        {
            "name": "PlanDetailHeader",
            "type": "UI Component",
            "description": "Khung thông tin tổng hợp của kế hoạch sản xuất đang chọn.",
            "technical_details": "Hiển thị tên kế hoạch, ngày lập, tiến độ tổng quan và thông số sản phẩm.",
            "file_path": "/FrontEnd/src/pages/Manufacture/PlanDetail.jsx"
        },
        {
            "name": "PlanDetailTable",
            "type": "UI Component",
            "description": "Bảng tiến độ chi tiết từng cấu trúc BOM/linh kiện cần sản xuất.",
            "technical_details": "Hiển thị mã linh kiện, số lượng cần giao, số lượng đã giao và tiến độ của từng trạm.",
            "file_path": "/FrontEnd/src/pages/Manufacture/PlanDetail.jsx"
        },
        {
            "name": "PlanDetailService",
            "type": "Logic / Service",
            "description": "Tải thông tin chi tiết của một KHSX bao gồm tiến độ các công đoạn.",
            "technical_details": "GET /api/v1/plans/{id}.",
            "file_path": "/FrontEnd/src/services/plan.service.js"
        }
    ],

    # MA2.2: Thêm kế hoạch sản xuất (Web)
    "MA2.2": [
        {
            "name": "PlanCreateForm",
            "type": "UI Component",
            "description": "Biểu mẫu tạo kế hoạch sản xuất thủ công.",
            "technical_details": "Chọn sản phẩm từ danh mục, nhập số lượng mục tiêu, ngày bắt đầu và kết thúc.",
            "file_path": "/FrontEnd/src/pages/Manufacture/AddProductionPlan.jsx"
        }
    ],

    # MA3: Đơn hàng sản xuất (Web)
    "MA3": [
        {
            "name": "OrderTable",
            "type": "UI Component",
            "description": "Bảng danh sách đơn hàng sản xuất PO.",
            "technical_details": "Hiển thị mã PO, khách hàng, sản phẩm, số lượng đặt hàng, trạng thái sản xuất.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Orders.jsx"
        },
        {
            "name": "OrderService",
            "type": "Logic / Service",
            "description": "Quản lý dữ liệu đơn hàng sản xuất PO.",
            "technical_details": "GET /api/v1/orders/.",
            "file_path": "/FrontEnd/src/services/order.service.js"
        }
    ],

    # MA3.1: Tạo đơn hàng (Web)
    "MA3.1": [
        {
            "name": "OrderCreateForm",
            "type": "UI Component",
            "description": "Biểu mẫu nhập thông tin tạo mới đơn hàng PO.",
            "technical_details": "Nhập mã PO, khách hàng, chọn danh sách SKU sản phẩm và số lượng.",
            "file_path": "/FrontEnd/src/pages/Manufacture/OrderCreate.jsx"
        }
    ],

    # MA4: Danh mục sản phẩm (Web)
    "MA4": [
        {
            "name": "ProductTable",
            "type": "UI Component",
            "description": "Danh mục sản phẩm trong hệ thống.",
            "technical_details": "Hiển thị danh sách SKU, tên sản phẩm, kích thước tiêu chuẩn, phân nhóm gỗ.",
            "file_path": "/FrontEnd/src/pages/Manufacture/Products.jsx"
        },
        {
            "name": "ProductService",
            "type": "Logic / Service",
            "description": "Quản lý danh sách và thông tin sản phẩm.",
            "technical_details": "GET /api/v1/products/.",
            "file_path": "/FrontEnd/src/services/product.service.js"
        }
    ],

    # MA4.1: Chi tiết sản phẩm (Web)
    "MA4.1": [
        {
            "name": "ProductDetailHeader",
            "type": "UI Component",
            "description": "Khung thông tin chi tiết và hình ảnh kỹ thuật của sản phẩm.",
            "technical_details": "Hiển thị thông số kích thước, loại gỗ, bản vẽ kỹ thuật.",
            "file_path": "/FrontEnd/src/pages/Manufacture/ProductDetail.jsx"
        },
        {
            "name": "BOMViewer",
            "type": "UI Component",
            "description": "Giao diện hiển thị cây cấu trúc định mức nguyên vật liệu BOM.",
            "technical_details": "Hiển thị danh sách phân cấp các linh kiện cần sản xuất và định mức gỗ tương ứng.",
            "file_path": "/FrontEnd/src/pages/Manufacture/ProductDetail.jsx"
        }
    ],

    # MA4.2: Thêm sản phẩm (Web)
    "MA4.2": [
        {
            "name": "ProductCreateForm",
            "type": "UI Component",
            "description": "Form đăng ký thông tin sản phẩm mới và cấu hình BOM ban đầu.",
            "technical_details": "POST /api/v1/products/.",
            "file_path": "/FrontEnd/src/pages/Manufacture/ProductCreate.jsx"
        }
    ],

    # MA5: Tiến độ sản xuất (Web)
    "MA5": [
        {
            "name": "ProductionProgressChart",
            "type": "UI Component",
            "description": "Biểu đồ trực quan tiến độ của từng tổ máy tại công đoạn.",
            "technical_details": "Sử dụng Recharts hiển thị tiến độ hoàn thành thực tế so với mục tiêu đề ra.",
            "file_path": "/FrontEnd/src/pages/Manufacture/ProductionProgress.jsx"
        }
    ],

    # MA6: Theo dõi giao hàng (Web)
    "MA6": [
        {
            "name": "DeliveryTrackingTable",
            "type": "UI Component",
            "description": "Bảng theo dõi các hoạt động giao nhận hàng hóa giữa các tổ sản xuất.",
            "technical_details": "Hiển thị lịch sử các lần chuyển giao, người giao, người nhận, thời gian thực hiện.",
            "file_path": "/FrontEnd/src/pages/Manufacture/DeliveryTracking.jsx"
        }
    ],

    # MA7: Thẻ Pallet ngoại lệ (Web)
    "MA7": [
        {
            "name": "ExceptionDeliveriesTable",
            "type": "UI Component",
            "description": "Danh sách các phiếu bàn giao bất thường (lệch thừa/thiếu, bị lỗi QC, bị trả hàng).",
            "technical_details": "Hiển thị các chỉ số lệch, nút xem chi tiết và nút in thẻ pallet đối chứng.",
            "file_path": "/FrontEnd/src/pages/Manufacture/ExceptionDeliveries.jsx"
        },
        {
            "name": "PalletCardSpreadsheet",
            "type": "UI Component",
            "description": "Giao diện Excel-like (FortuneSheet) để thiết kế và chỉnh sửa thông tin thẻ pallet.",
            "technical_details": "Tích hợp grid chỉnh sửa ô, nhập xuất file Excel trực quan.",
            "file_path": "/FrontEnd/src/pages/Manufacture/MA7_PalletCard.jsx"
        },
        {
            "name": "PalletCardPrintModal",
            "type": "UI Component",
            "description": "Modal hiển thị xem trước bản in khổ A4 chuyên nghiệp cho thẻ pallet vật lý.",
            "technical_details": "Tạo file in chuẩn CSS print khổ dọc A4.",
            "file_path": "/FrontEnd/src/pages/Manufacture/MA7_PalletCard.jsx"
        },
        {
            "name": "ExceptionDeliveriesService",
            "type": "Logic / Service",
            "description": "Giao tiếp với API lấy danh sách ngoại lệ và lưu cấu hình bảng tính thẻ pallet.",
            "technical_details": "GET /api/v1/deliveries/exceptions, POST /api/v1/pallets/save.",
            "file_path": "/FrontEnd/src/services/pallet.service.js"
        }
    ],

    # AD12: Quản lý danh mục lỗi (Web)
    "AD12": [
        {
            "name": "DefectAnalytics",
            "type": "UI Component",
            "description": "Biểu đồ phân tích xu hướng lỗi (Pareto, Phân bổ nhóm lỗi, Biến động tỷ lệ lỗi).",
            "technical_details": "Sử dụng Recharts để vẽ các biểu đồ trực quan.",
            "file_path": "/FrontEnd/src/pages/Admin/DefectManagement.jsx"
        },
        {
            "name": "DefectTable",
            "type": "UI Component",
            "description": "Bảng hiển thị danh mục lỗi kiểm tra chất lượng.",
            "technical_details": "Hiển thị tên lỗi, nhóm lỗi, công đoạn áp dụng và mức độ nghiêm trọng.",
            "file_path": "/FrontEnd/src/pages/Admin/DefectManagement.jsx"
        }
    ],

    # AD13: Hồ sơ chất lượng (Web)
    "AD13": [
        {
            "name": "QualityRecordsTable",
            "type": "UI Component",
            "description": "Bảng danh sách nhật ký và hồ sơ kiểm soát chất lượng.",
            "technical_details": "Hiển thị lịch sử kiểm định đầu vào, công đoạn và kết quả QC.",
            "file_path": "/FrontEnd/src/pages/Admin/QualityRecords.jsx"
        }
    ],

    # AD14: Quản lý Màn hình (Web)
    "AD14": [
        {
            "name": "ScreenManagementTable",
            "type": "UI Component",
            "description": "Bảng hiển thị danh sách các màn hình trong hệ thống.",
            "technical_details": "Hiển thị mã màn hình, tiêu đề, mô tả và trạng thái hoạt động.",
            "file_path": "/FrontEnd/src/pages/Admin/ScreenManagement.jsx"
        }
    ],

    # AD15: Giám sát hệ thống & CSDL (Web)
    "AD15": [
        {
            "name": "SystemMonitorDashboard",
            "type": "UI Component",
            "description": "Dashboard theo dõi thời gian thực CPU, RAM, ổ đĩa và kết nối SQL Server.",
            "technical_details": "Hiển thị biểu đồ tài nguyên hệ thống và trạng thái kết nối cơ sở dữ liệu.",
            "file_path": "/FrontEnd/src/pages/Admin/SystemMonitor.jsx"
        }
    ],

    # CL1: Khiếu nại khách hàng (Web)
    "CL1": [
        {
            "name": "ClaimPortalLayout",
            "type": "UI Component",
            "description": "Giao diện quản lý khiếu nại khách hàng (Claim).",
            "technical_details": "Quản lý và giải quyết các khiếu nại chất lượng sản phẩm.",
            "file_path": "/FrontEnd/src/pages/Admin/ClaimPortalLayout.jsx"
        }
    ],

    # MB1: Đăng nhập (Mobile)
    "MB1": [
        {
            "name": "MobileLoginForm",
            "type": "UI Component",
            "description": "Giao diện đăng nhập trên thiết bị di động.",
            "technical_details": "Nhập thông tin và đăng nhập. Định dạng form đăng nhập chuẩn OAuth2.",
            "file_path": "/Mobile/src/Views/screens/MB1_Login.jsx"
        },
        {
            "name": "PushNotificationsRegister",
            "type": "Native API",
            "description": "Đăng ký và đồng bộ FCM token lên máy chủ sau khi đăng nhập thành công.",
            "technical_details": "Gọi API /accounts/update-fcm-token. Sử dụng Firebase SDK để lấy device token.",
            "file_path": "/Mobile/src/Views/screens/MB1_Login.jsx"
        }
    ],

    # MB2: Thông tin giao hàng (Mobile)
    "MB2": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút xem hướng dẫn người dùng chi tiết về quy trình giao nhận và các thuật ngữ chuyên ngành.",
            "technical_details": "Hiển thị trợ giúp nhanh (?). Gọi modal popover hướng dẫn.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Nút chuông nhận thông báo đẩy thời gian thực về chất lượng QC và biên bản giao nhận.",
            "technical_details": "Hiển thị badge số lượng thông báo chưa đọc. Tích hợp FCM Push Notifications.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "QuickCreateButton",
            "type": "UI Component",
            "description": "Nút điều hướng nhanh đến màn hình tạo phiếu bàn giao linh kiện.",
            "technical_details": "Gọi navigate('/delivery-create') khi được click.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "PlanSelector",
            "type": "UI Component",
            "description": "Bộ chọn danh sách Kế hoạch sản xuất (KHSX) hiện hành để theo dõi tiến độ.",
            "technical_details": "Dropdown tải danh sách KHSX từ API GET /api/v1/plans/active.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "PlanFilter",
            "type": "UI Component",
            "description": "Nút mở bộ lọc nâng cao danh sách kế hoạch bàn giao.",
            "technical_details": "Hỗ trợ lọc theo công đoạn, tổ máy, và trạng thái bàn giao.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "PlanSort",
            "type": "UI Component",
            "description": "Nút sắp xếp thứ tự hiển thị danh sách linh kiện trong kế hoạch.",
            "technical_details": "Sắp xếp theo thứ tự ưu tiên sản xuất hoặc theo thời gian tạo.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "DetailAccordion",
            "type": "UI Component",
            "description": "Thẻ Accordion đóng/mở để thu gọn hoặc mở rộng danh sách chi tiết linh kiện.",
            "technical_details": "Dùng state để đóng mở phần nội dung. Hiển thị ngày kế hoạch và tổng số lượng.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "PlanTable",
            "type": "UI Component",
            "description": "Bảng hiển thị tiến trình bàn giao chi tiết của từng linh kiện trong BOM.",
            "technical_details": "Hiển thị tên chi tiết, số lượng đã giao/mục tiêu kế hoạch, tỷ lệ đạt QC (KT) và trạng thái.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "DeliveryOverviewCard",
            "type": "UI Component",
            "description": "Danh sách các thẻ phiếu bàn giao thực tế (đã gửi đi hoặc chờ nhận về).",
            "technical_details": "Gồm 2 tab con: Phiếu giao đi và Phiếu nhận về. Tải dữ liệu từ GET /api/v1/deliveries/.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "WebSocketConnector",
            "type": "Logic / Service",
            "description": "Kết nối WebSocket để nhận thông báo cập nhật realtime về trạng thái phiếu giao.",
            "technical_details": "Kết nối tới /ws/stage/{stage_name}. Lắng nghe các sự kiện NEW_DELIVERY, QC_CONFIRMED.",
            "file_path": "/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx"
        },
        {
            "name": "QRScannerNative",
            "type": "Native API",
            "description": "Kích hoạt camera native quét mã QR dán trên thẻ pallet gỗ hoặc thẻ dự phòng để tìm kiếm nhanh.",
            "technical_details": "Giải mã QR từ camera native. Tự động kiểm tra trạng thái thẻ (trống thì đi tới Tạo phiếu mới, đang sử dụng thì đi tới Nhận hàng).",
            "file_path": "/Mobile/src/Views/components/PageHeader.jsx"
        }
    ],

    # MB2.1: Tạo phiếu giao hàng (Mobile)
    "MB2.1": [
        {
            "name": "PartSelector",
            "type": "UI Component",
            "description": "Dropdown chọn chi tiết linh kiện cần bàn giao từ cấu trúc BOM sản phẩm.",
            "technical_details": "Gọi API GET /api/v1/inspections/plan/{plan_id}/part để kiểm tra trạng thái QC trước khi giao.",
            "file_path": "/Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx"
        },
        {
            "name": "MoistureInput",
            "type": "UI Component",
            "description": "Biểu mẫu nhập 3 giá trị đo độ ẩm thực tế của gỗ.",
            "technical_details": "Tự động tính toán và hiển thị giá trị độ ẩm trung bình lên giao diện.",
            "file_path": "/Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx"
        },
        {
            "name": "CameraCapture",
            "type": "Native API",
            "description": "Kích hoạt camera native để chụp ảnh minh chứng sản phẩm bàn giao.",
            "technical_details": "Nén ảnh qua HTML Canvas xuống chất lượng 70% và đóng gói vào FormData.",
            "file_path": "/Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx"
        },
        {
            "name": "SubmitDeliveryButton",
            "type": "Logic / Service",
            "description": "Đóng gói dữ liệu và thực hiện gửi yêu cầu tạo phiếu giao hàng.",
            "technical_details": "Gửi đối tượng FormData tới POST /api/v1/deliveries/.",
            "file_path": "/Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx"
        }
    ],

    # MB2.2: Nhận hàng (Mobile)
    "MB2.2": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút xem hướng dẫn các bước nhận hàng và đối chiếu chất lượng.",
            "technical_details": "Hiển thị trợ giúp nhanh (?). Gọi modal popover hướng dẫn.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Nút nhận thông báo về việc bàn giao hàng hóa từ tổ sản xuất.",
            "technical_details": "Tích hợp FCM Push Notifications.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "QRScannerNative",
            "type": "Native API",
            "description": "Kích hoạt camera native quét mã QR dán trên thẻ pallet.",
            "technical_details": "Đọc dữ liệu mã QR, lấy ID phiếu giao và điều hướng sang màn hình xác nhận nhận hàng.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "PalletInfoCard",
            "type": "UI Component",
            "description": "Thẻ hiển thị thông tin pallet gỗ quét được (mã pallet, linh kiện, số lượng giao).",
            "technical_details": "Tải dữ liệu pallet chi tiết từ GET /api/v1/pallets/{id}.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "QualityChecklist",
            "type": "UI Component",
            "description": "Bảng đánh giá chất lượng đầu vào của phiếu giao gồm 8 chỉ tiêu kỹ thuật.",
            "technical_details": "Danh sách chỉ tiêu: Cong vênh, Nứt tét, Độ ẩm, Vệ sinh, Kích thước, Trầy xước, Màu sắc, Biến dạng.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "QuantityConfirmInput",
            "type": "UI Component",
            "description": "Ô nhập số lượng thực tế nhận được (hỗ trợ phát hiện lỗi thiếu/hụt).",
            "technical_details": "Validation không cho phép nhập số lượng lớn hơn số lượng gửi đi trên phiếu gốc.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "ConfirmReceiveButton",
            "type": "Logic / Service",
            "description": "Nút xác nhận nhận hàng dành cho Tổ trưởng Tổ Sản xuất (SX nhận).",
            "technical_details": "Gọi PATCH /api/v1/deliveries/{id}/confirm với status='Chờ QC Kiểm Tra' để xác nhận số lượng thực nhận và chuyển tiếp cho QC.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "SaveQCButton",
            "type": "Logic / Service",
            "description": "Nút lưu kết quả đánh giá chất lượng chi tiết dành cho QC (QC kiểm tra).",
            "technical_details": "Gửi mảng JSON kết quả đánh giá 8 chỉ tiêu lỗi cùng hình ảnh minh chứng lên POST /api/v1/qc/{id}. Đóng trạng thái phiếu thành Hoàn thành.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        },
        {
            "name": "CreateReturnSlipButton",
            "type": "Logic / Service",
            "description": "Nút lập phiếu trả hàng lỗi về tổ sản xuất giao trước đó khi phát hiện sản phẩm không đạt chuẩn QC.",
            "technical_details": "Gửi thông tin số lượng lỗi, mô tả chi tiết lỗi và ảnh minh chứng lên POST /api/v1/returns/ để tạo phiếu trả hàng chờ SX xác nhận nhận lại.",
            "file_path": "/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx"
        }
    ],

    # MB2.3: Trả hàng (Mobile)
    "MB2.3": [
        {
            "name": "ReturnForm",
            "type": "UI Component",
            "description": "Biểu mẫu kê khai số lượng và lý do trả lại hàng lỗi.",
            "technical_details": "Hiển thị danh sách linh kiện bị lỗi và cho phép nhập số lượng trả lại tương ứng.",
            "file_path": "/Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx"
        },
        {
            "name": "DefectImageUploader",
            "type": "Native API",
            "description": "Chụp ảnh và tải hình ảnh linh kiện lỗi lên máy chủ làm bằng chứng đối chiếu.",
            "technical_details": "Bắt buộc chụp tối thiểu 1 ảnh lỗi. Upload qua API file upload.",
            "file_path": "/Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx"
        },
        {
            "name": "SubmitReturnButton",
            "type": "Logic / Service",
            "description": "Lưu phiếu trả hàng và tự động cập nhật số lượng trả lại trên phiếu giao gốc.",
            "technical_details": "POST /api/v1/returns/. Cập nhật trường quantity_returned trong cơ sở dữ liệu.",
            "file_path": "/Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx"
        }
    ],

    # MB2.4: Kiểm tra đầu vào (Mobile)
    "MB2.4": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn quy trình đo đạc và nhập kích thước kiểm tra chất lượng đầu vào.",
            "technical_details": "Hiển thị tooltip tiêu chuẩn dung sai.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Nút chuông nhận thông báo chất lượng.",
            "technical_details": "Tích hợp FCM Push Notifications.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        },
        {
            "name": "PartInfoBanner",
            "type": "UI Component",
            "description": "Banner thông tin chi tiết linh kiện đang kiểm tra (mã linh kiện, đơn hàng PO, số lượng lô).",
            "technical_details": "Tải thông tin từ GET /api/v1/inspections/part-info/{id}.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        },
        {
            "name": "DimensionInput",
            "type": "UI Component",
            "description": "Biểu mẫu nhập các kích thước thực tế đo đạc được (dài, rộng, cao).",
            "technical_details": "So sánh thông số thực tế với tiêu chuẩn bản vẽ thiết kế để đánh giá Đạt/Không đạt.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        },
        {
            "name": "SaveInspectionButton",
            "type": "Logic / Service",
            "description": "Lưu kết quả QC kiểm tra chi tiết đầu vào.",
            "technical_details": "POST /api/v1/inspections/. Nếu kết quả Đạt, tự động mở khóa trạng thái cho phép bàn giao.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        },
        {
            "name": "QRScannerNative",
            "type": "Native API",
            "description": "Kích hoạt camera native quét mã QR ván gỗ đầu vào để nhận diện nhanh mã linh kiện.",
            "technical_details": "Đọc mã QR từ camera, phân tích mã linh kiện và liên kết với tiêu chuẩn chất lượng thiết kế để so khớp kích thước.",
            "file_path": "/Mobile/src/Views/screens/MB2.4_InputInspection.jsx"
        }
    ],

    # MB4: Theo dõi kế hoạch (Mobile)
    "MB4": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn xem biểu đồ và tiến độ kế hoạch.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông thông báo các thay đổi kế hoạch sản xuất.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        },
        {
            "name": "PlanSelector",
            "type": "UI Component",
            "description": "Bộ chọn Kế hoạch sản xuất (KHSX) hiện hành để theo dõi tiến độ.",
            "technical_details": "API GET /api/v1/plans/active.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        },
        {
            "name": "PlanTrackingList",
            "type": "UI Component",
            "description": "Danh sách các kế hoạch sản xuất (KHSX) đang hoạt động tại công đoạn.",
            "technical_details": "Hiển thị tiến độ hoàn thành dưới dạng thanh tiến độ (progress bar) và số lượng cụ thể.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        },
        {
            "name": "PlanTrackingFilter",
            "type": "UI Component",
            "description": "Thanh tìm kiếm và bộ lọc nhanh kế hoạch theo công đoạn hiện hành.",
            "technical_details": "Lọc theo trạm sản xuất đang làm việc.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        },
        {
            "name": "PlanTrackingService",
            "type": "Logic / Service",
            "description": "Lấy thông tin tiến độ kế hoạch cho thiết bị di động.",
            "technical_details": "GET /api/v1/production/plan-tracking.",
            "file_path": "/Mobile/src/Views/screens/MB4_PlanTracking.jsx"
        }
    ],

    # MB5: Kiểm tra hàng ngày (Mobile)
    "MB5": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn phân nhóm lỗi ngoại quan và lỗi kết cấu.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo chất lượng trong ngày.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        },
        {
            "name": "DateSelector",
            "type": "UI Component",
            "description": "Thanh chọn ngày kiểm định chất lượng hàng ngày.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        },
        {
            "name": "DailyInspectionForm",
            "type": "UI Component",
            "description": "Biểu mẫu nhập số lượng các loại lỗi phát hiện trong ngày.",
            "technical_details": "Chia làm các tab phân nhóm lỗi: Ngoại quan, Kết cấu, Nguyên vật liệu, Cần theo dõi.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        },
        {
            "name": "HotlistToggle",
            "type": "Logic / Service",
            "description": "Bật/tắt trạng thái theo dõi nóng của các loại lỗi kỹ thuật quan trọng.",
            "technical_details": "PATCH /api/v1/inspections/defect-types/{id}/toggle-tracking. Cập nhật needs_tracking = True/False.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        },
        {
            "name": "DailyInspectionService",
            "type": "Logic / Service",
            "description": "Service xử lý lưu phiếu kiểm tra lỗi hàng ngày của QC.",
            "technical_details": "POST /api/v1/inspections/daily.",
            "file_path": "/Mobile/src/Views/screens/MB5_DailyInspection.jsx"
        }
    ],

    # MB6: Kiểm tra công đoạn (Mobile)
    "MB6": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn quy trình kiểm định công đoạn sản xuất.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông thông báo công đoạn.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        },
        {
            "name": "POSelector",
            "type": "UI Component",
            "description": "Bộ chọn đơn hàng PO đang chạy để lấy thông tin sản phẩm và BOM tương ứng.",
            "technical_details": "Gọi API để load danh sách PO và danh mục sản phẩm của PO.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        },
        {
            "name": "StageInspectionForm",
            "type": "UI Component",
            "description": "Biểu mẫu động thay đổi theo loại phiếu kiểm tra chọn lựa (phụ kiện, bám dính, sau đóng gói).",
            "technical_details": "Tải biểu mẫu và checklist chất lượng tương ứng theo loại phiếu.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        },
        {
            "name": "PhotoUploader",
            "type": "Native API",
            "description": "Chụp ảnh lỗi bằng camera và gửi lên máy chủ lưu trữ.",
            "technical_details": "Tải file ảnh lên trước để nhận về URL đường dẫn trước khi lưu phiếu chính thức.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        },
        {
            "name": "StageInspectionService",
            "type": "Logic / Service",
            "description": "Lưu phiếu kiểm tra công đoạn chi tiết.",
            "technical_details": "POST /api/v1/inspections/stage.",
            "file_path": "/Mobile/src/Views/screens/MB6_StageInspection.jsx"
        }
    ],

    # MB7: Lịch sử kiểm tra (Mobile)
    "MB7": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn tra cứu nhật ký kiểm tra.",
            "file_path": "/Mobile/src/Views/screens/MB7_InspectionLogs.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo chất lượng.",
            "file_path": "/Mobile/src/Views/screens/MB7_InspectionLogs.jsx"
        },
        {
            "name": "InspectionLogsFilter",
            "type": "UI Component",
            "description": "Thanh lọc tìm kiếm thông tin nhật ký thời gian thực.",
            "technical_details": "Tìm kiếm nhanh theo mã lô hàng, tên người kiểm tra hoặc loại hình kiểm tra (không phân biệt hoa thường).",
            "file_path": "/Mobile/src/Views/screens/MB7_InspectionLogs.jsx"
        },
        {
            "name": "CombinedInspectionLogsList",
            "type": "UI Component",
            "description": "Danh sách gộp nhật ký kiểm tra hàng ngày và kiểm tra công đoạn.",
            "technical_details": "Sắp xếp danh sách gộp giảm dần theo mốc thời gian từ mới nhất đến cũ nhất.",
            "file_path": "/Mobile/src/Views/screens/MB7_InspectionLogs.jsx"
        },
        {
            "name": "InspectionLogsService",
            "type": "Logic / Service",
            "description": "Sử dụng Promise.all để tải song song dữ liệu lịch sử kiểm định chất lượng.",
            "technical_details": "Tải dữ liệu từ inspections/daily và inspections/stage.",
            "file_path": "/Mobile/src/Views/screens/MB7_InspectionLogs.jsx"
        }
    ],

    # MB8: Theo dõi KPI (Mobile)
    "MB8": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn các chỉ số tính điểm KPI.",
            "file_path": "/Mobile/src/Views/screens/MB8_KPITracking.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo KPI hàng tuần.",
            "file_path": "/Mobile/src/Views/screens/MB8_KPITracking.jsx"
        },
        {
            "name": "CircularProgress",
            "type": "UI Component",
            "description": "Component vẽ vòng tròn tiến độ động bằng SVG.",
            "technical_details": "Tính toán strokeDasharray và strokeDashoffset dựa trên giá trị phần trăm hoàn thành.",
            "file_path": "/Mobile/src/Views/screens/MB8_KPITracking.jsx"
        },
        {
            "name": "KPIDashboards",
            "type": "UI Component",
            "description": "Dashboard hiển thị phần trăm hoàn thành KPI tuần và tháng dưới dạng biểu đồ tròn.",
            "technical_details": "Sử dụng các thẻ SVG kết hợp với framer-motion tạo hiệu ứng chuyển động mượt mà.",
            "file_path": "/Mobile/src/Views/screens/MB8_KPITracking.jsx"
        },
        {
            "name": "ChecklistTasks",
            "type": "UI Component",
            "description": "Danh sách đầu việc cần làm trong ngày của nhân sự.",
            "technical_details": "Cho phép click nút để chuyển hướng nhanh đến màn hình thực hiện (ví dụ: kiểm tra thiết bị).",
            "file_path": "/Mobile/src/Views/screens/MB8_KPITracking.jsx"
        }
    ],

    # MB8.1: Đánh giá nhân viên (Mobile)
    "MB8.1": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn tiêu chí đánh giá nhân viên (A, B, C, D).",
            "file_path": "/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông thông báo hạn chót đánh giá nhân viên.",
            "file_path": "/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx"
        },
        {
            "name": "StaffKPITable",
            "type": "UI Component",
            "description": "Bảng hiển thị kết quả thực hiện các chỉ tiêu công việc cốt lõi của nhân viên trong tháng.",
            "technical_details": "So sánh trực tiếp kết quả mục tiêu đặt ra và kết quả thực tế nhân viên đạt được.",
            "file_path": "/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx"
        },
        {
            "name": "StaffEvaluationForm",
            "type": "UI Component",
            "description": "Biểu mẫu xếp loại và nhận xét nhân viên cấp dưới dành cho Tổ trưởng.",
            "technical_details": "Bao gồm các radio button chọn xếp loại (A, B, C, D) và các ô textarea nhập ý kiến.",
            "file_path": "/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx"
        },
        {
            "name": "StaffEvaluationService",
            "type": "Logic / Service",
            "description": "API gửi đánh giá nhân sự lên server.",
            "technical_details": "POST /api/v1/kpi/staff-evaluation.",
            "file_path": "/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx"
        }
    ],

    # MB8.2: Danh sách KPI nhân viên (Mobile)
    "MB8.2": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn xem danh sách KPI.",
            "file_path": "/Mobile/src/Views/screens/MB8.2_StaffKPIList.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo hiệu suất tổ sản xuất.",
            "file_path": "/Mobile/src/Views/screens/MB8.2_StaffKPIList.jsx"
        },
        {
            "name": "KPIListFilter",
            "type": "UI Component",
            "description": "Thành phần lọc tìm kiếm nhân sự theo tổ đội.",
            "file_path": "/Mobile/src/Views/screens/MB8.2_StaffKPIList.jsx"
        },
        {
            "name": "StaffKPIList",
            "type": "UI Component",
            "description": "Danh sách nhân viên cấp dưới kèm thông tin tóm tắt kết quả KPI tháng.",
            "technical_details": "Hiển thị tên nhân viên, công đoạn làm việc và điểm số KPI trung bình.",
            "file_path": "/Mobile/src/Views/screens/MB8.2_StaffKPIList.jsx"
        }
    ],

    # MB9: Khen thưởng & Kỷ luật (Mobile)
    "MB9": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn chấm điểm cộng/trừ khen thưởng kỷ luật.",
            "file_path": "/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo quyết định khen thưởng kỷ luật.",
            "file_path": "/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx"
        },
        {
            "name": "AwardDisciplineForm",
            "type": "UI Component",
            "description": "Biểu mẫu ghi nhận các trường hợp vi phạm quy định hoặc khen thưởng xuất sắc tại xưởng.",
            "technical_details": "Nhập thông tin nhân viên vi phạm, nội dung sự việc, mức độ ảnh hưởng và số điểm cộng/trừ.",
            "file_path": "/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx"
        },
        {
            "name": "CameraEvidence",
            "type": "Native API",
            "description": "Kích hoạt camera chụp ảnh bằng chứng vi phạm trực tiếp tại hiện trường.",
            "technical_details": "Cho phép chụp tối đa 3 ảnh. Chuyển đổi file ảnh thành URL để hiển thị xem trước.",
            "file_path": "/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx"
        },
        {
            "name": "AwardDisciplineService",
            "type": "Logic / Service",
            "description": "API POST /api/v1/awards-disciplines lưu thông tin khen thưởng kỷ luật.",
            "file_path": "/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx"
        }
    ],

    # MB10: Danh sách thiết bị (Mobile)
    "MB10": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn bảo trì thiết bị định kỳ.",
            "file_path": "/Mobile/src/Views/screens/MB10_EquipmentList.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông cảnh báo lịch bảo trì thiết bị khẩn cấp.",
            "file_path": "/Mobile/src/Views/screens/MB10_EquipmentList.jsx"
        },
        {
            "name": "EquipmentList",
            "type": "UI Component",
            "description": "Danh sách toàn bộ máy móc, thiết bị đo lường trong công đoạn.",
            "technical_details": "Hiển thị mã thiết bị, tên máy, phân loại và trạng thái hoạt động hiện thời.",
            "file_path": "/Mobile/src/Views/screens/MB10_EquipmentList.jsx"
        },
        {
            "name": "EquipmentInspectionModal",
            "type": "UI Component",
            "description": "Hộp thoại ghi nhận kết quả tự kiểm tra thiết bị đầu ca làm việc.",
            "technical_details": "Cho phép chọn trạng thái mới (Bình thường / Cần thay mới), nhập mô tả lỗi và chụp ảnh minh chứng.",
            "file_path": "/Mobile/src/Views/screens/MB10_EquipmentList.jsx"
        },
        {
            "name": "EquipmentService",
            "type": "Logic / Service",
            "description": "Service lấy danh sách và cập nhật trạng thái thiết bị.",
            "technical_details": "GET /api/v1/equipments/, PATCH /api/v1/equipments/{id}/status.",
            "file_path": "/Mobile/src/services/equipment.service.js"
        }
    ],

    # MB11: Chi tiết kiểm tra chất lượng (Mobile)
    "MB11": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Nút hướng dẫn đo đạc QC chi tiết.",
            "file_path": "/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo lỗi gỗ chất lượng vượt mức cho phép.",
            "file_path": "/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx"
        },
        {
            "name": "InstructionManual",
            "type": "UI Component",
            "description": "Hiển thị hướng dẫn kỹ thuật đo đạc và kiểm định chất lượng trực quan cho QC.",
            "technical_details": "Hiển thị tiêu chuẩn kỹ thuật tương ứng với hạng mục kiểm tra đang chọn.",
            "file_path": "/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx"
        },
        {
            "name": "CompressImageCanvas",
            "type": "Native API",
            "description": "Tự động nén ảnh chụp chất lượng cao trên Canvas trước khi lưu giữ.",
            "technical_details": "Resize ảnh về kích thước tối đa 1024x1024px và xuất ra định dạng JPEG chất lượng 70%.",
            "file_path": "/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx"
        },
        {
            "name": "OfflinePendingQCStore",
            "type": "Logic / Service",
            "description": "Lưu trữ tạm thời kết quả và mảng ảnh QC tại bộ nhớ RAM của ứng dụng.",
            "technical_details": "Đồng bộ với pendingQCStore, tránh mất dữ liệu khi mất kết nối mạng, không gọi API lưu trực tiếp.",
            "file_path": "/Mobile/src/store/pendingQCStore.js"
        }
    ],

    # MB12: In nhiệt (Mobile)
    "MB12": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn kết nối bluetooth và in nhiệt tem nhãn.",
            "file_path": "/Mobile/src/Views/screens/MB12_ThermalPrint.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông thông báo kết nối máy in.",
            "file_path": "/Mobile/src/Views/screens/MB12_ThermalPrint.jsx"
        },
        {
            "name": "ThermalPrintLayout",
            "type": "UI Component",
            "description": "Thiết kế nhãn tem in nhiệt tối ưu cho khổ giấy rộng 58mm.",
            "technical_details": "Ẩn header/footer mặc định của trình duyệt và tự động ngắt trang bằng CSS print.",
            "file_path": "/Mobile/src/Views/screens/MB12_ThermalPrint.jsx"
        },
        {
            "name": "AndroidPrintBridge",
            "type": "Native API",
            "description": "Cầu nối in gửi nội dung HTML từ Webview sang ứng dụng native Android.",
            "technical_details": "Gọi hàm window.AndroidPrint.printHtml truyền nội dung HTML và chuỗi ảnh QR Base64.",
            "file_path": "/Mobile/src/Views/screens/MB12_ThermalPrint.jsx"
        },
        {
            "name": "QRCanvasRenderer",
            "type": "UI Component",
            "description": "Render mã QR chứa ID phiếu giao nhận để dán lên pallet hàng.",
            "technical_details": "Sử dụng QRCodeCanvas từ thư viện qrcode.react để vẽ mã QR động.",
            "file_path": "/Mobile/src/Views/screens/MB12_ThermalPrint.jsx"
        }
    ],

    # MB13: Danh sách CAPA (Mobile)
    "MB13": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn xử lý các hành động CAPA phòng ngừa.",
            "file_path": "/Mobile/src/Views/screens/MB13_CapaList.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông cảnh báo hạn chót hoàn thành hành động CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB13_CapaList.jsx"
        },
        {
            "name": "CapaFilter",
            "type": "UI Component",
            "description": "Bộ lọc danh sách CAPA theo mức độ khẩn cấp, tổ sản xuất chịu trách nhiệm.",
            "file_path": "/Mobile/src/Views/screens/MB13_CapaList.jsx"
        },
        {
            "name": "CAPAList",
            "type": "UI Component",
            "description": "Danh sách các hành động khắc phục và phòng ngừa (CAPA) phát sinh từ lỗi QC.",
            "technical_details": "Hiển thị danh sách các CAPA kèm trạng thái (Mới, Đang xử lý, Hoàn thành, Chờ duyệt).",
            "file_path": "/Mobile/src/Views/screens/MB13_CapaList.jsx"
        },
        {
            "name": "CapaService",
            "type": "Logic / Service",
            "description": "API GET /api/v1/capas tải danh sách hành động khắc phục CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB13_CapaList.jsx"
        }
    ],

    # MB14: Báo cáo CAPA (Mobile)
    "MB14": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn cách viết báo cáo phân tích lỗi CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB14_CapaReport.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông thông báo phê duyệt báo cáo CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB14_CapaReport.jsx"
        },
        {
            "name": "CAPAReportForm",
            "type": "UI Component",
            "description": "Biểu mẫu lập báo cáo hành động khắc phục CAPA.",
            "technical_details": "Nhập nguyên nhân gốc rễ (5-Why), lập kế hoạch khắc phục và gán người thực hiện.",
            "file_path": "/Mobile/src/Views/screens/MB14_CapaReport.jsx"
        },
        {
            "name": "CapaSubmitButton",
            "type": "Logic / Service",
            "description": "Gửi báo cáo CAPA lên hệ thống phê duyệt.",
            "technical_details": "POST /api/v1/capa/reports.",
            "file_path": "/Mobile/src/Views/screens/MB14_CapaReport.jsx"
        }
    ],

    # MB15: Chi tiết CAPA (Mobile)
    "MB15": [
        {
            "name": "UserGuideButton",
            "type": "UI Component",
            "description": "Hướng dẫn các bước nghiệm thu hành động khắc phục CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB15_CapaDetail.jsx"
        },
        {
            "name": "NotificationBell",
            "type": "UI Component",
            "description": "Chuông nhận thông báo cập nhật tiến độ CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB15_CapaDetail.jsx"
        },
        {
            "name": "CAPADetail",
            "type": "UI Component",
            "description": "Giao diện xem chi tiết hành động khắc phục CAPA.",
            "technical_details": "Hiển thị tiến độ xử lý chi tiết, người chịu trách nhiệm và lịch sử thay đổi của hành động CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB15_CapaDetail.jsx"
        },
        {
            "name": "CAPAHistory",
            "type": "UI Component",
            "description": "Lịch sử phản hồi và phê duyệt CAPA.",
            "file_path": "/Mobile/src/Views/screens/MB15_CapaDetail.jsx"
        }
    ]
}

def seed_components():
    safe_print("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        safe_print("Starting seed system components...")
        safe_print("-" * 50)
        
        # Check if system_screens has data
        check_screens = db.execute(text("SELECT COUNT(*) FROM system_screens")).fetchone()[0]
        if check_screens == 0:
            safe_print("[ERROR] No screens found in system_screens table. Please run screen migration first!")
            return
            
        added_count = 0
        skipped_count = 0
        
        for default_code, components in COMPONENT_SEEDS.items():
            # Get screen_id by default_code
            screen_query = text("SELECT id, title FROM system_screens WHERE default_code = :default_code")
            screen = db.execute(screen_query, {"default_code": default_code}).fetchone()
            
            if not screen:
                safe_print(f"[SKIP] Screen with code {default_code} not found in database.")
                skipped_count += len(components)
                continue
                
            screen_id, screen_title = screen
            
            for comp in components:
                # Check if component already exists on this screen
                comp_check = text("""
                    SELECT COUNT(*) FROM system_components 
                    WHERE screen_id = :screen_id AND name = :name
                """)
                exists = db.execute(comp_check, {"screen_id": screen_id, "name": comp["name"]}).fetchone()[0]
                
                if exists == 0:
                    insert_sql = text("""
                        INSERT INTO system_components (screen_id, name, type, description, technical_details, file_path, is_active, updated_at)
                        VALUES (:screen_id, :name, :type, :description, :technical_details, :file_path, 1, :updated_at)
                    """)
                    db.execute(insert_sql, {
                        "screen_id": screen_id,
                        "name": comp["name"],
                        "type": comp["type"],
                        "description": comp["description"],
                        "technical_details": enrich_technical_details(comp),
                        "file_path": comp["file_path"],
                        "updated_at": datetime.now()
                    })
                    safe_print(f"[OK] Added component '{comp['name']}' to screen '{screen_title}' ({default_code})")
                    added_count += 1
                else:
                    # Update details
                    update_sql = text("""
                        UPDATE system_components 
                        SET type = :type, description = :description, technical_details = :technical_details, file_path = :file_path, updated_at = :updated_at
                        WHERE screen_id = :screen_id AND name = :name
                    """)
                    db.execute(update_sql, {
                        "screen_id": screen_id,
                        "name": comp["name"],
                        "type": comp["type"],
                        "description": comp["description"],
                        "technical_details": enrich_technical_details(comp),
                        "file_path": comp["file_path"],
                        "updated_at": datetime.now()
                    })
                    safe_print(f"[SKIP/UPDATE] Component '{comp['name']}' on screen '{screen_title}' already exists, updated details.")
                    skipped_count += 1
                    
        db.commit()
        safe_print("-" * 50)
        safe_print(f"[SUCCESS] Seeding completed: Added {added_count}, Skipped/Updated {skipped_count}")
        
    except Exception as e:
        db.rollback()
        safe_print(f"[ERROR] Seeding failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    seed_components()
