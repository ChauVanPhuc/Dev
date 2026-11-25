# QUY CHUẨN & KIẾN TRÚC TOÀN DIỆN HỆ THỐNG SMARTFLOW ERP V3 (FULL MASTER SPECIFICATION)

Tài liệu này là **Tuyên ngôn Kiến trúc & Quy chuẩn Lập trình Toàn diện nhất** cho toàn bộ dự án **SmartFlow ERP v3**, bao gồm đầy đủ Backend, Web Frontend, Mobile PWA, AI Services, Modules Phụ trợ, CSDL, Phân quyền ACL và Luồng hoạt động hệ thống.

---

## 1. ⚙️ TỔNG QUAN HỆ THỐNG & CÔNG NGHỆ (FULL TECH STACK & SYSTEM ARCHITECTURE)

| Thành phần | Công nghệ / Framework | Chi tiết cấu hình / Chức năng |
| :--- | :--- | :--- |
| **Backend Core** | Python 3.10+ / **FastAPI** | Asynchronous RESTful APIs, Automatic OpenAPI Docs, Pydantic Data Validation |
| **ORM & Database** | **SQLAlchemy ORM** / SQL Server | PyODBC Driver 17/18, Transaction Management, Identity Seeds |
| **Xác thực & Bảo mật** | **PyJWT** / OAuth2 Bearer | JWT Tokens (Access Token), Password Hashing (Passlib/Bcrypt), Custom ACL Middleware |
| **Web Frontend** | **React 18** / **Vite** | Single Page Application (Port 5173), Custom Design System, Lucide Icons, Axios Interceptors |
| **Mobile Frontend** | **React 18** / **Vite PWA** | Mobile-First Responsive App (Port 5174/5175), Offline Ready, OCR/Camera integrations |
| **AI & Vision** | **Golang** / **Gemini Web To API** | Engine AI Go (Port 8081, OpenAI/Claude/Gemini Native API), Web Chat UI, OCR tem nhãn & Vision |
| **Báo cáo & Xuất file**| SheetJS (XLSX) / OpenPyXL | Import/Export Excel báo cáo QC, KPI, Tiến độ sản xuất |
| **Môi trường Thực thi**| Windows PowerShell | Virtualenv `BackEnd/venv`, Bắt buộc lệnh `$env:PYTHONIOENCODING="utf-8"` |

---

## 2. 📁 CÂY THƯ MỤC TOÀN DỰ ÁN (COMPLETE DIRECTORY TREE)

```
SmartFlow_v2_Test/
├── AI/                                     # Phân hệ AI Chatbot & Xử lý Thị giác Máy tính (OCR / Vision)
│   └── gemini-web-to-api/                  # Go-based Gemini Web to API Server (Port 8081, Web Chat UI, Scalar Docs)
├── BackEnd/                                # MÃ NGUỒN BACKEND PYTHON (FASTAPI)
│   ├── app/                                # Cấu hình ứng dụng lõi
│   │   ├── main.py                         # App Entry Point, CORS, Auth/ACL Middleware, Error Handlers
│   │   ├── routes.py                       # Master Router gom tất cả modules vào prefix /api/v1
│   │   └── database.py                     # SQLAlchemy Engine, SessionLocal, Base ORM Model
│   ├── config/                             # Cấu hình môi trường & Settings
│   │   ├── settings.py                     # Pydantic Settings (DB Connection, Secret Keys, Ports)
│   │   └── .env                            # File cấu hình biến môi trường
│   ├── database/                           # Khởi tạo CSDL, Script dọn dẹp & Migrations
│   │   ├── init_database.py                # Tạo bảng & Seed dữ liệu gốc ban đầu
│   │   ├── clear_operational_data.py       # Script dọn dẹp dữ liệu nghiệp vụ (giữ Auth/Sidebar)
│   │   ├── migrations/                     # 40+ Scripts nâng cấp CSDL từng bước
│   │   └── seeders/                        # Scripts seed dữ liệu mẫu (Roles, Permissions, Stages, Admin)
│   └── modules/                            # 11 PHÂN HỆ NGHIỆP VỤ BACKEND
│       ├── auth/                           # Tài khoản, Vai trò, Quyền, Bộ phận, Nhân sự, Sơ đồ tổ chức
│       │   ├── controllers/                # account_controller.py, permission_controller.py, role_controller.py, hr_controller.py
│       │   ├── models/                     # accounts.py, permissions.py, role.py, departments.py, employees.py, org_structures.py
│       │   ├── routes/                     # account_router.py, permission_router.py, role_router.py, department_router.py, hr_router.py
│       │   └── schemas/                    # accounts.py, permissions.py, role.py, hr_schemas.py
│       ├── production/                     # Đơn hàng, Sản phẩm, Kế hoạch SX, BOM, Công đoạn, Routing
│       │   ├── controllers/                # product_plan_controller.py, product_controller.py, routing_controller.py
│       │   ├── models/                     # product_plan.py, product.py, bom_detail.py, stages.py, production_routing.py
│       │   ├── routes/                     # product_plan_router.py, product_router.py, stage_router.py
│       │   └── schemas/                    # Pydantic Schemas sản xuất
│       ├── inspection/                     # Kiểm tra chất lượng (Input, Stage, Daily, First Article, Defect Tracking)
│       │   ├── controllers/                # inspection_controller.py
│       │   ├── models/                     # input_inspection.py, stage_inspection.py, daily_inspection.py, user_defect_tracking.py
│       │   ├── routes/                     # inspection_routes.py
│       │   └── schemas/                    # Pydantic Schemas kiểm tra
│       ├── inspection_guide/               # Tài liệu ban hành (HDKT - Hướng dẫn kiểm tra, SOS - Thao tác, CTQ - Lỗi chú ý)
│       ├── kpi/                            # Quản lý KPI, Đánh giá nhân sự, Vi phạm, Chấm điểm, Khen thưởng/Kỷ luật
│       ├── master/                         # Master Data (Sản phẩm mẫu, Chi tiết gỗ/màu sơn, Bản vẽ, Khách hàng)
│       ├── purchasing/                     # Mua hàng & Đề nghị vật tư (Purchase Requisitions, PO Items)
│       ├── claim/                          # Khiếu nại khách hàng, Bảng giá tủ, Container Shipments
│       ├── system/                         # Cấu hình hệ thống (Sidebar, Screen, Screen Bug, System Logs, Data Package)
│       ├── notification/                   # Thông báo hệ thống (Notifications)
│       └── quick_report/                   # Báo cáo nhanh (Quick Reports)
│
├── FrontEnd/                               # MÃ NGUỒN FRONTEND (MONOREPO WEB & MOBILE)
│   ├── Web/                                # ÚNG DỤNG WEB QUẢN TRỊ DESKTOP (REACT + VITE)
│   │   ├── modules/                        # Giao diện chia theo phân hệ
│   │   │   ├── Auth/                       # Login, User Management, Roles, Permissions, Org Tree
│   │   │   ├── Inspection/                 # QualityOverviewView, InspectionReportsView, HDKT/SOS/CTQ Views
│   │   │   ├── Product/                    # ProductCreateView, ProductDetailView, ProductionOrderView
│   │   │   ├── System/                     # SystemConfigView, SidebarManagement, ScreenMetaData
│   │   │   └── KPI/                        # QualityEmployeeListView, StaffEvaluationView
│   │   ├── Shared/                         # Thành phần dùng chung Web
│   │   │   ├── Views/components/           # Layout (PortalLayout, Sidebar, Header, PageToolbar, Modals)
│   │   │   ├── Services/                   # Axios Interceptors (`api.service.js`)
│   │   │   ├── hooks/                      # `useScreenMetadata.js`, `useScreenDetail.jsx`
│   │   │   └── styles/                     # `components.css` (Gold Design System Styles)
│   │   ├── App.jsx                         # Web Main Component & Router
│   │   ├── main.jsx                        # React Mounting Point
│   │   └── vite.config.js                  # Path Aliases (@webShared, @styles...)
│   ├── Mobile/                             # ÚNG DỤNG MOBILE CHO CÔNG NHÂN / QC (REACT + VITE PWA)
│   │   ├── modules/                        # Giao diện Mobile theo quy trình
│   │   │   ├── auth/                       # Mobile Login
│   │   │   ├── inspection/                 # Mobile QC Forms
│   │   │   └── production_v2/              # CL08_InspectionListView, CL09D_ProcessView, CL09E_QAView, CL09F_DailyInspectionView
│   │   ├── Shared/                         # Mobile Layout (MobileSidebar.jsx, MobileHeader.jsx)
│   │   └── App.jsx
│   └── shared/                             # Services & Utilities dùng chung Web/Mobile (`services/api.js`)
│
├── Claim/                                  # Phân hệ Khiếu nại khách hàng tách biệt & Bảng giá
├── Feedback/                               # Phân hệ Báo lỗi giao diện & Feedback kỹ thuật
├── Data/                                   # File dữ liệu xuất bản, Excel mẫu, Backup
├── lpn_crawler/                            # Công cụ Crawler & Quản lý mã LPN Pallet
├── ONE_CLICK_PUBLISH.bat                   # Script đóng gói & xuất bản 1-click
├── OPTIMIZE_SYSTEM.bat                     # Script tối ưu hệ thống & dọn cache
├── RUN_ALL_TESTS.bat                       # Script chạy tự động toàn bộ Unit Tests
├── run_project.bat / start_server.bat      # Scripts khởi chạy đồng thời Backend & Frontend
└── AGENTS.md                               # TÀI LIỆU QUY CHUẨN MASTER DỰ ÁN
```

---

## 3. 🗄️ CƠ SỞ DỮ LIỆU & DANH SÁCH BẢNG (DATABASE SCHEMA & TABLES)

CSDL SQL Server bao gồm các nhóm bảng chính:

### 3.1. Nhóm Bảng Xác Thực, Phân Quyền & Nhân Sự (Auth & HR)
- `accounts`: Tài khoản người dùng (username, password_hash, email, phone, permission_level, screen_permissions).
- `roles`: Phòng ban / Vai trò hệ thống (BGD, QLCL, Sản Xuất, IT, Kế Toán).
- `permissions`: Vị trí / Chức vụ công việc (Quản lý, Nhân viên, Trưởng phòng, Phó phòng).
- `role_permission`: Bảng liên kết n-n giữa Role và Permission.
- `departments`: Bộ phận chuyên môn trực thuộc Phòng ban.
- `employees` & `hr_employees`: Thông tin chi tiết hồ sơ nhân sự.
- `org_structures` & `hr_org_nodes`: Sơ đồ cây cơ cấu tổ chức doanh nghiệp.
- `permission_stage`: Bảng phân quyền vị trí theo từng công đoạn sản xuất.

### 3.2. Nhóm Bảng Quản Lý Sản Xuất (Production)
- `orders`: Đơn hàng sản xuất.
- `products`: Sản phẩm thuộc đơn hàng.
- `product_plans`: Kế hoạch sản xuất tổng thể.
- `mobile_daily_plans`: Kế hoạch giao việc công nhân hàng ngày trên Mobile.
- `bom_details`: Định mức nguyên vật liệu & công đoạn sản phẩm (BOM).
- `stages`: Danh mục công đoạn sản xuất (Định hình, Tạo phôi, Lắp ráp, Sơn, Đóng gói, Nhập kho/Đầu vào, Lưu kho).
- `production_teams`: Tổ/Đội sản xuất.
- `production_routings`, `production_routing_nodes`, `production_routing_components`, `production_routing_products`: Quy trình công nghệ & Luồng luân chuyển.
- `categories`: Loại danh mục sản phẩm.

### 3.3. Nhóm Bảng Kiểm Tra Chất Lượng (QC / QA)
- `input_inspections`: Kiểm tra nguyên vật liệu đầu vào (Input Inspection).
- `stage_inspections`: Kiểm tra công đoạn sản xuất (Stage Inspection).
- `daily_inspections`: Kiểm tra hàng ngày / Tuần tra (Daily Patrol Inspection).
- `defect_types`: Danh mục loại lỗi kỹ thuật (QC tracking).
- `client_defects` & `user_defect_trackings`: Theo dõi ghi nhận lỗi của kiểm tra viên.
- `inspection_guides`, `inspection_guide_steps`, `inspection_guide_sub_steps`, `inspection_guide_step_images`, `inspection_guide_assignments`: Tài liệu tiêu chuẩn kiểm tra (HDKT).

### 3.4. Nhóm Bảng KPI, Đánh Giá & Mua Hàng
- `kpis`, `kpi_checklists`, `kpi_employee_items`, `kpi_violations`, `kpi_feedbacks`, `kpi_point_rules`, `kpi_checklist_pool`, `kpi_item_pool`: Hệ thống chấm điểm KPI & Vi phạm.
- `award_disciplines`: Khen thưởng & Kỷ luật.
- `staff_evaluations`: Đánh giá xếp loại nhân sự.
- `purchase_requisitions` & `purchase_order_items`: Đề nghị mua sắm vật tư & theo dõi vật tư đơn hàng.
- `customer_claims`, `cabinet_prices`, `container_shipments`: Khiếu nại khách hàng & Quản lý đơn hàng xuất khẩu.

### 3.5. Nhóm Bảng Hệ Thống & Nhật Ký (System & Metadata)
- `system_sidebars`: Menu Sidebar điều hướng Web & Mobile (Hỗ trợ phân nhóm & phân quyền key).
- `system_screens`: Danh mục màn hình hệ thống & Mã màn hình (CL1, CL2, CL5, CL9...).
- `system_components`: Cấu hình linh kiện / thành phần giao diện.
- `screen_bugs`, `screen_bug_updates`, `screen_bug_images`: Báo lỗi giao diện người dùng.
- `notifications`: Thông báo đẩy hệ thống.
- `data_packages`, `backup_qr_codes`, `system_incidents`, `system_logs`: Nhật ký sự cố & Sao lưu dữ liệu.

---

## 4. 🏷️ QUY CHUẨN ĐẶT TÊN (NAMING CONVENTIONS MASTER)

### 4.1. Quy chuẩn Backend (Python / FastAPI)
- **Tên File**: `snake_case.py` (ví dụ: `account_controller.py`, `inspection_routes.py`).
- **Tên Class**: `PascalCase` (ví dụ: `AccountModel`, `InspectionGuide`, `HRPositionResponse`).
- **Tên Hàm / Method / Biến**: `snake_case` (ví dụ: `resolve_user_permissions()`, `get_all_tickets()`, `inspector_name`).
- **Tên Hằng Số**: `UPPER_SNAKE_CASE` (ví dụ: `SECRET_KEY`, `AVAILABLE_STAGES`, `PATH_TO_SCREEN_KEY`).
- **Tên Bảng CSDL (`__tablename__`)**: `snake_case` số nhiều (ví dụ: `accounts`, `system_sidebars`, `stage_inspections`).
- **Tên Cột CSDL**: `snake_case` (ví dụ: `created_at`, `is_confirmed`, `department_id`).

### 4.2. Quy chuẩn Frontend (React / JavaScript / CSS)
- **Component File**: `PascalCase.jsx` (ví dụ: `QualityOverviewView.jsx`, `AccountQualityTab.jsx`).
- **Service / Model File**: `camelCase.js` (ví dụ: `api.service.js`, `hr.service.js`).
- **Hook File**: `useCamelCase.js` (ví dụ: `useScreenMetadata.js`).
- **Component Name**: `PascalCase` (ví dụ: `const AccountQualityTab = ({ ... }) => { ... }`).
- **Biến, State & Props**: `camelCase` (ví dụ: `timePeriod`, `filteredAccounts`, `searchQuery`).
- **Event Handlers**:
  - Hàm xử lý sự kiện nội bộ: Bắt đầu bằng `handle` (`handleResetFilters`, `handleOpenDeleteModal`).
  - Callback Props truyền cho Component con: Bắt đầu bằng `on` (`onUpdateAccountCount`, `onSelectTask`).
- **CSS Class Name**: `kebab-case` (ví dụ: `account-quality-container`, `data-table`, `admin-table-card`).

### 4.3. Quy chuẩn REST API Endpoints
- **URL Prefix**: `/api/v1/...`
- **Resource Naming**: `kebab-case` dạng danh từ số nhiều (ví dụ: `/api/v1/inspections/all-tickets`, `/api/v1/hr/factory-structures`).
- **HTTP Verbs**: `GET` (Đọc), `POST` (Tạo mới/Hành động), `PUT`/`PATCH` (Sửa), `DELETE` (Xóa).

---

## 5. 🔄 LUỒNG XỬ LÝ HỆ THỐNG TỪ A-Z (FULL RUNTIME & ACL FLOW)

### 5.1. Luồng Đăng Nhập & Cấp Phát Token
```
[User điền Username/Password] ──► POST /api/v1/accounts/login
                                       │
                                       ▼
                     [AccountController Hash & Match Pass]
                                       │
                                       ▼
                     [Tạo JWT Access Token chứa sub=username]
                                       │
                                       ▼
                     [Client lưu Token vào localStorage]
```

### 5.2. Luồng Kiểm Tra Quyền Tự Động (Backend ACL Enforcement)
```
[Client gửi Request HTTP] ──► Header: "Authorization: Bearer <JWT_Token>"
                                       │
                                       ▼
                     [Backend Middleware: main.py check_write_permissions]
                                       │
                                       ├── Decode Token ──► Lấy User Account
                                       ├── Match Request Path ──► Lấy screen_key (PATH_TO_SCREEN_KEY)
                                       ├── Gọi resolve_user_permissions(user, db) trong account_controller.py
                                       │   ├── Tính toán Role + Department + permission_level + user.screen_permissions
                                       │   └── Trả về danh sách Quyền: ["read", "create", "edit", "delete", "approve", "export_import"]
                                       │
                                       └── Kiểm tra Quyền đối với HTTP Method:
                                           ├── DELETE ──► Cần quyền "delete"
                                           ├── POST ──► Cần quyền "create"
                                           ├── PUT/PATCH ──► Cần quyền "edit"
                                           └── NẾU THIẾU QUYỀN ──► Trả về HTTP 403 Forbidden:
                                               {"detail": "Bạn không có quyền thực hiện hành động này (Xóa) trên phân hệ này."}
```

### 5.3. Luồng Tải Màn Hình Quản Lý Chất Lượng (`/admin/quality`)
```
[User vào /admin/quality] ──► Render QualityOverviewView.jsx ──► Nạp Screen Metadata (CL1)
                                       │
                                       ▼
                     [Mount AccountQualityTab.jsx]
                                       │
                                       ├── Tải phiếu: GET /api/v1/inspections/all-tickets?period=today
                                       ├── Tải tài khoản: GET /api/v1/accounts/?page=1&size=1000
                                       │
                                       ▼
                     [Xử lý Dữ liệu Nội bộ qua useMemo]
                                       ├── qlclAccounts: Lọc tài khoản phòng QLCL
                                       ├── accountStats: Gom nhóm phiếu & LỌC BỎ tài khoản có total = 0
                                       ├── filteredAccounts: Lọc từ khóa, Công đoạn & Sắp xếp
                                       └── paginatedAccounts: Phân trang (Mặc định pageSize = 30)
                                       │
                                       ▼
                     [Render UI Bảng Desktop / Card Mobile]
                                       └── Cột "ĐẠT / LỖI" luôn hiển thị đủ 2 ô badge: [X Đạt] [Y Lỗi]
```

---

## 6. 🎨 PHONG CÁCH THIẾT KẾ GIAO DIỆN & UI/UX (GOLD DESIGN SYSTEM)

- **Màu chủ đạo**: Warm Sand `#FAF7F2` (Nền trang), Earth Bronze `#7B5233` (Nút chính & Điểm nhấn), Cream `#EADCC9` (Viền thẻ).
- **Màu Badge Trạng Thái**:
  - **Đạt**: Background `#DCFCE7`, Text `#15803D`
  - **Lỗi**: Background `#FEE2E2`, Text `#DC2626`
  - **Chờ duyệt**: Background `#FEF3C7`, Text `#B45309`, Border `#FDE68A`
  - **Trả về / Cách ly**: Background `#FFFBEB`, Text `#B45309`
- **Quy tắc Bảng Dữ Liệu**: Cột "ĐẠT / LỖI" trên bảng danh sách phải luôn hiển thị đầy đủ 2 ô badge (`X Đạt` và `Y Lỗi`) trên cùng một hàng để đảm bảo bố cục không bị lệch căn lề.

---

## 7. 🛠️ QUY TẮC PHÁT TRIỂN & XỬ LÝ LỖI KHẮT KHE (DEVELOPMENT RULES)

1. **Thứ tự React Hooks**: Khai báo TẤT CẢ custom hooks, `useState`, `useRef`, `useCallback`, `useMemo` ở ĐẦU Component. Không bao giờ gọi biến hoặc `useMemo` trước khi biến đó được khởi tạo (tránh lỗi Temporal Dead Zone / `ReferenceError: Cannot access 'X' before initialization`).
2. **Không nuốt Lỗi (No Silent Failures)**: Tuyệt đối không dùng `try { ... } catch (e) {}` rỗng. Luôn log `console.error` và hiển thị Toast thông báo lỗi tới người dùng.
3. **An toàn CSDL (Database Safety)**: Mọi thao tác ghi/xóa CSDL phức tạp phải bọc trong SQLAlchemy Transaction (`with engine.connect() as conn: trans = conn.begin()`) và thực hiện `rollback()` khi gặp lỗi.
4. **Môi trường Windows PowerShell**: Luôn chạy scripts Python console bằng môi trường ảo `BackEnd/venv/Scripts/python.exe` kèm lệnh thiết lập mã hóa `$env:PYTHONIOENCODING="utf-8"`.
