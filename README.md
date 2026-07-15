<p align="center">
  <img src="FrontEnd/Web/assets/images/logo-no-bg.png" alt="SmartFlow Logo" width="120" />
</p>

<h1 align="center">🏭 SmartFlow ERP — Hệ thống Điều hành Sản xuất Thông minh</h1>

<p align="center">
  <strong>Nền tảng quản lý sản xuất toàn diện dành cho nhà máy nội thất G7</strong><br/>
  Kết nối liền mạch từ Đơn hàng → Kế hoạch → Sản xuất → Bàn giao → Kiểm tra chất lượng → Kho → Giao hàng<br/>
  thông qua ứng dụng Web Dashboard và Mobile App (Android).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI%20(Python%203.13+)-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-SQL%20Server%202019+-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  <img src="https://img.shields.io/badge/Web-React%2018%20+%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Mobile-Capacitor%206-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloud-Cloudflare%20Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
</p>

---

## 📋 Mục lục

| # | Mục | Mô tả |
|---|-----|-------|
| 1 | [Tổng quan dự án](#-1-tổng-quan-dự-án) | Giới thiệu, Tech Stack, Kiến trúc hệ thống |
| 2 | [Tính năng nổi bật](#-2-tính-năng-nổi-bật) | 20+ tính năng cấp doanh nghiệp |
| 3 | [Tối ưu hóa hiệu suất](#-3-tối-ưu-hóa-hiệu-suất) | Các cải tiến performance cấp hệ thống |
| 4 | [Cấu trúc thư mục](#-4-cấu-trúc-thư-mục) | Sơ đồ cây thư mục chi tiết |
| 5 | [Hướng dẫn cài đặt](#-5-hướng-dẫn-cài-đặt) | Từng bước cài đặt Backend, FrontEnd, Database |
| 6 | [Hướng dẫn sử dụng](#-6-hướng-dẫn-sử-dụng) | Cách sử dụng từng module chức năng |
| 7 | [Quy tắc phát triển](#-7-quy-tắc-phát-triển) | Naming convention, commit, code standards |
| 8 | [Triển khai sản xuất](#-8-triển-khai-sản-xuất) | Quy trình deploy production |
| 9 | [Giải quyết sự cố](#-9-giải-quyết-sự-cố) | FAQ & Troubleshooting |
| 10 | [Nhật ký thay đổi](#-10-nhật-ký-thay-đổi) | Changelog theo phiên bản |
| 11 | [Hỗ trợ kỹ thuật](#-11-hỗ-trợ-kỹ-thuật) | Thông tin liên hệ & hỗ trợ |

---

## 🎯 1. Tổng quan dự án

### Giới thiệu

**SmartFlow ERP** là hệ thống hoạch định nguồn lực doanh nghiệp (Enterprise Resource Planning) được thiết kế và phát triển riêng biệt cho nhà máy sản xuất nội thất **G7**, hướng đến mục tiêu:

- 🏭 **Số hóa toàn bộ quy trình sản xuất** — từ nhận đơn hàng đến giao hàng cho khách
- 📊 **Dashboard thời gian thực** — theo dõi tiến độ sản xuất tức thì, chính xác đến từng chi tiết linh kiện
- 📱 **Mobile-first cho Shopfloor** — công nhân tại xưởng sử dụng app di động để tạo phiếu giao, nhận hàng, quét QR, kiểm tra chất lượng
- 🔔 **Thông báo đa kênh** — WebSocket + Firebase Cloud Messaging (FCM) đẩy thông báo tức thì
- 🤖 **Tích hợp AI Chatbot** — hỗ trợ tra cứu thông tin sản xuất bằng ngôn ngữ tự nhiên (Gemini API)
- 📋 **Tuân thủ ISO** — quản lý tài liệu, quy trình, biểu mẫu theo tiêu chuẩn ISO 9001

### Công nghệ sử dụng (Tech Stack)

| Lớp | Công nghệ | Phiên bản | Mô tả chi tiết |
|-----|-----------|-----------|-----------------|
| **Backend API** | Python + FastAPI | 3.13+ | RESTful API, WebSocket, JWT Auth, Auto-docs (Swagger UI) |
| **Database** | Microsoft SQL Server | 2019+ | RDBMS chính, Connection Pooling (SQLAlchemy), Performance Indexes |
| **ORM** | SQLAlchemy | 2.0+ | Object-Relational Mapping, Session Management, Query Builder |
| **Web Dashboard** | React + Vite | React 18 / Vite 6 | SPA Admin Portal cho khối văn phòng, hỗ trợ Responsive |
| **Mobile App** | React + Capacitor | Capacitor 6 | Ứng dụng Hybrid cho Android, truy cập camera/GPS/notification |
| **Authentication** | JWT (HS256) | — | Token-based auth, Role-based access control (RBAC) |
| **Real-time** | WebSocket + FCM | — | Thông báo tức thì cho Mobile & Web |
| **AI/Chatbot** | Google Gemini API | — | Chatbot hỗ trợ tra cứu dữ liệu sản xuất bằng ngôn ngữ tự nhiên |
| **Caching** | In-Memory (SWR Pattern) | — | Stale-While-Revalidate cache cho các API hot, giảm tải Database |
| **Cloud** | Cloudflare Tunnel | — | SSL/HTTPS, DDoS Protection, truy cập global không cần mở port |
| **Build Tool** | Vite | 6.4+ | HMR cực nhanh, Tree-shaking, Code-splitting tự động |
| **Mobile Build** | Gradle + Capacitor CLI | — | Build APK Android tự động, tích hợp OTA Update |

### Kiến trúc hệ thống (System Architecture)

```mermaid
flowchart LR
    %% Styling Classes
    classDef cloud fill:#FAF6F0,stroke:#7B5233,stroke-width:2px,color:#7B5233;
    classDef server fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px,color:#1E3A8A;
    classDef client fill:#ECFDF5,stroke:#10B981,stroke-width:2px,color:#064E3B;
    classDef db fill:#FEF2F2,stroke:#EF4444,stroke-width:2px,color:#991B1B;

    %% Client Subgraph (Left)
    subgraph Clients ["📱 CLIENT APPLICATIONS"]
        direction TB
        Web["💻 WEB DASHBOARD (React 18)<br>• Dashboard KPI & Báo cáo<br>• Quản lý Đơn hàng & KHSX<br>• Hồ sơ Chất lượng & ISO"]
        Mobile["📱 MOBILE APP (Capacitor 6)<br>• Tạo/Nhận Phiếu Giao & QR Code<br>• Kiểm QC & Chụp ảnh minh chứng<br>• Multi-stage Account & OTA Update"]
    end
    class Clients,Web,Mobile client;

    %% Cloud/Gateway Subgraph (Center-Left)
    subgraph Gateway ["☁️ GATEWAY & SECURITY"]
        CF["🌐 Cloudflare Tunnel (smartflowg7.cloud)<br>• SSL/HTTPS & DDoS Protection<br>• Zero-Trust Secure Access"]
    end
    class Gateway,CF cloud;

    %% Backend Subgraph (Center-Right)
    subgraph Backend ["⚙️ BACKEND API SERVER (FastAPI)"]
        direction TB
        API["📡 RESTful API (JWT Auth & RBAC)"]
        WS["🔌 WebSocket (Real-time Broadcast)"]
        Cache["💾 SWR Cache (In-Memory Stage Cache)"]
        AI["🧠 AI Chatbot Engine (Gemini API)"]
    end
    class Backend,API,WS,Cache,AI server;

    %% Database Subgraph (Right)
    subgraph Database ["🗄️ DATABASE LAYER"]
        DB["🛢️ SQL Server 2019+ (SQLAlchemy)<br>• Connection Pool (100 + 400)<br>• 30+ Performance Indexes<br>• NOLOCK Hints & Query Tuning"]
    end
    class Database,DB db;

    %% Horizontal Flow Relations
    Web -- HTTPS/WSS --> CF
    Mobile -- HTTPS/WSS --> CF
    
    CF --> API
    CF --> WS
    
    API --> DB
    WS --> DB
    Cache --> DB
    AI --> DB
```

### Luồng dữ liệu chính (Production Data Flow)

```
Đơn Hàng (PO - Purchase Order)
    │
    ▼
Kế Hoạch Sản Xuất (KHSX - Product Plan)
    │
    ▼
Lệnh Sản Xuất (Production Order) ──► Gán BOM (Bill of Materials)
    │
    ├─► Công đoạn 1: Định hình (NM1)
    │       ├─► Tạo Phiếu Giao (Delivery) ──► Chụp ảnh minh chứng
    │       │       │
    │       │       ▼
    │       ├─► Công đoạn 2: Lắp ráp (NM2) nhận hàng
    │       │       ├─► QC Kiểm tra đầu vào (Input Inspection)
    │       │       │       ├─► ✅ Đạt: Tiếp tục sản xuất
    │       │       │       └─► ❌ Lỗi: Tạo Phiếu Trả hàng (Return)
    │       │       │
    │       │       ▼
    │       ├─► Công đoạn 3: Sơn phủ (NM3)
    │       │       │
    │       │       ▼
    │       └─► Công đoạn 4: Đóng gói (NM4) ──► QC Kiểm tra cuối
    │
    ├─► Kho (Warehouse) ──► Quản lý Pallet & Vị trí
    │
    └─► Giao hàng cho Khách hàng ──► Hoàn thành ĐH
```

---

## ⚡ 2. Tính năng nổi bật

### 📊 Nhóm 1: Dashboard & Báo cáo

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 1.1 | **Dashboard Sản xuất Thời gian thực** | Hiển thị tiến độ sản xuất tổng quan, biểu đồ theo tuần/công đoạn, tỷ lệ hoàn thành theo PO. Dữ liệu cập nhật real-time qua WebSocket. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 1.2 | **Thuật toán FIFO 2-Pass** | Xử lý logic tính toán tiến độ sản xuất phức tạp trên 53,000+ bản ghi. Giảm thời gian phản hồi từ >10s xuống <0.1s. | <kbd>⚡&nbsp;Cải&nbsp;tiến</kbd> |
| 1.3 | **SKU Deduplication** | Gộp nhóm BOM (Bill of Materials) theo SKU thay vì ID sản phẩm đơn lẻ, giảm tải dữ liệu xử lý lên đến 80%. | <kbd>⚡&nbsp;Cải&nbsp;tiến</kbd> |
| 1.4 | **Báo cáo KPI đa chiều** | Báo cáo KPI theo nhân viên, phòng ban, khoảng thời gian. Hỗ trợ xuất Excel, biểu đồ trực quan. | <kbd>⭐&nbsp;Xịn</kbd> |

### 📦 Nhóm 2: Quản lý Đơn hàng & Kế hoạch Sản xuất

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 2.1 | **Quản lý Đơn hàng (PO)** | CRUD đơn hàng, theo dõi trạng thái (Chờ → Đang SX → Hoàn thành → Quá hạn), lọc theo khách hàng/hạn giao. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 2.2 | **Kế hoạch Sản xuất (KHSX)** | Tạo kế hoạch theo tháng/năm, gán danh sách PO vào kế hoạch, theo dõi tiến độ tổng thể. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 2.3 | **Quản lý Sản phẩm & BOM** | Tạo sản phẩm với mã SKU, quản lý cấu trúc BOM (Bill of Materials) đa cấp, gán công đoạn cho từng chi tiết. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 2.4 | **Import đơn hàng hàng loạt** | Upload file Excel để import hàng loạt đơn hàng, sản phẩm, chi tiết BOM. Hỗ trợ drag-and-drop, hiển thị progress. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 2.5 | **Phân trang Server-side** | Tất cả danh sách lớn (PO, KHSX, Hồ sơ CL) đều phân trang từ Backend SQL, chỉ tải 15 dòng/trang, giảm tải FE tối đa. | <kbd>⚡&nbsp;Cải&nbsp;tiến</kbd> |

### 🚚 Nhóm 3: Bàn giao & Giao nhận

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 3.1 | **Tạo Phiếu Giao (Mobile)** | Chọn chi tiết cần giao, nhập số lượng, chụp tối đa 3 ảnh minh chứng, gửi phiếu và nhận mã QR Giao Nhận. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 3.2 | **Nhận Phiếu Giao (Mobile)** | Quét mã QR hoặc chọn phiếu từ danh sách, xác nhận nhận hàng, kiểm tra số lượng và ảnh. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 3.3 | **Theo dõi Lịch sử Bàn giao** | Xem toàn bộ lịch sử giao-nhận giữa các công đoạn, lọc theo ngày/PO/công đoạn, xuất báo cáo Excel. | <kbd>⭐&nbsp;Xịn</kbd> |
| 3.4 | **Phiếu Ngoại lệ Nâng cao** | Hiển thị tỷ lệ % lệch/trả, phân loại ngoại lệ rõ ràng, nút xác minh cho quản lý. | <kbd>⚡&nbsp;Cải&nbsp;tiến</kbd> |
| 3.5 | **Kế hoạch Bàn giao (Delivery Plan)** | Hiển thị danh sách chi tiết cần giao, so sánh kế hoạch vs thực tế, trạng thái giao/nhận, xuất Excel/PDF. | <kbd>⭐&nbsp;Xịn</kbd> |

### 🔍 Nhóm 4: Kiểm tra Chất lượng (QC)

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 4.1 | **Kiểm tra Đầu vào (Input Inspection)** | QC kiểm tra số lượng nhận/lỗi, chụp ảnh lỗi, đánh dấu Đạt/Không đạt. Tự động tính SL thực nhận. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 4.2 | **Kiểm tra theo Công đoạn** | Kiểm tra chất lượng tại từng công đoạn sản xuất, theo dõi tỷ lệ lỗi. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 4.3 | **Hồ sơ Chất lượng (PO)** | Tổng hợp toàn bộ dữ liệu kiểm tra, bàn giao, trả hàng theo từng PO. Phân trang server-side. | <kbd>⭐&nbsp;Xịn</kbd> |
| 4.4 | **Quản lý Danh mục Lỗi (Defect)** | CRUD danh mục lỗi theo nhóm, cho phép tùy chỉnh checklist kiểm tra cho từng công đoạn. | <kbd>⭐&nbsp;Xịn</kbd> |
| 4.5 | **Báo cáo Kiểm tra Chất lượng** | Thống kê lỗi theo loại/công đoạn/thời gian, biểu đồ Pareto, xuất báo cáo. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |

### 📱 Nhóm 5: Hệ thống QR Code & Mobile

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 5.1 | **Quét mã QR đa năng** | Quét QR để nhận diện PO, kiện hàng, pallet, vị trí kho. Tốc độ quét <1 giây, dùng camera native. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 5.2 | **Mã QR Dự phòng Thông minh** | Tự động gán QR dự phòng khi QR chính bị hư. Chỉ giải phóng sau khi QC hoàn tất xác nhận. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 5.3 | **Tài khoản Đa Công đoạn** | Gán nhiều công đoạn cho 1 tài khoản (VD: Lắp ráp + Chà nhám). Selector chuyển đổi nhanh. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 5.4 | **Lọc Đơn hàng Chính xác (Mobile)** | Chọn chính xác 1 PO, chỉ hiển thị đơn đó thay vì toàn bộ kế hoạch, giảm tải dữ liệu Mobile. | <kbd>⚡&nbsp;Cải&nbsp;tiến</kbd> |
| 5.5 | **Cập nhật OTA tự động** | App tự động kiểm tra phiên bản, thông báo có bản mới, tải và cài đặt APK trực tiếp không qua trình duyệt. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |

### 🏢 Nhóm 6: Quản trị Hệ thống & ISO

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 6.1 | **Quản lý Người dùng & Phân quyền (RBAC)** | CRUD tài khoản, gán vai trò (Admin/Manager/QC/Worker), phân quyền chi tiết theo từng màn hình. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 6.2 | **Quản lý Phòng ban & Chức vụ** | CRUD phòng ban, chức vụ, gán nhân viên. | <kbd>⚙️&nbsp;Cốt&nbsp;lõi</kbd> |
| 6.3 | **Quản lý Tài liệu ISO** | Tạo/sửa/xóa tài liệu ISO, quản lý phiên bản, phân loại theo danh mục. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 6.4 | **Biên tập Biểu mẫu ISO (Form Editor)** | Trình soạn thảo biểu mẫu ISO dạng WYSIWYG, kéo-thả trường, xuất PDF. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 6.5 | **Biên tập Quy trình ISO (Process Flowchart)** | Trình vẽ sơ đồ quy trình ISO với canvas drag-and-drop, tự động nối các bước, xuất hình ảnh. | <kbd>🚀&nbsp;Rất&nbsp;cao&nbsp;cấp</kbd> |
| 6.6 | **Quản lý Màn hình hệ thống (Screens)** | Đăng ký, cấu hình, phân quyền truy cập cho từng màn hình chức năng. Auto-sync khi khởi động. | <kbd>⭐&nbsp;Xịn</kbd> |
| 6.7 | **Quản lý Bug & Phản hồi** | Hệ thống báo lỗi tích hợp, theo dõi trạng thái xử lý, đính kèm ảnh chụp màn hình. | <kbd>⭐&nbsp;Xịn</kbd> |
| 6.8 | **System Monitor** | Giám sát trạng thái hệ thống, thống kê API calls, database connections. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |

### 🏗️ Nhóm 7: Thiết bị, Máy móc & KPI

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 7.1 | **Quản lý Thiết bị (Equipment)** | CRUD thiết bị, phân loại theo nhóm, theo dõi lịch sử bảo trì, bàn giao thiết bị. | <kbd>⭐&nbsp;Xịn</kbd> |
| 7.2 | **Quản lý Máy móc (Machine)** | CRUD máy sản xuất, theo dõi tình trạng hoạt động, lịch sử sửa chữa, tài liệu kỹ thuật. | <kbd>⭐&nbsp;Xịn</kbd> |
| 7.3 | **Đào tạo Thiết bị & Máy** | Quản lý chương trình đào tạo vận hành thiết bị/máy, theo dõi nhân viên đã đào tạo. | <kbd>⭐&nbsp;Xịn</kbd> |
| 7.4 | **KPI Nhân viên** | Cấu hình quy tắc chấm điểm, checklist đánh giá, vi phạm, phản hồi. Báo cáo KPI đa chiều. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |

### 💰 Nhóm 8: Mua hàng & Claim

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 8.1 | **Quản lý Đơn mua hàng (Purchasing)** | Tạo yêu cầu mua hàng, duyệt đơn, theo dõi danh sách mặt hàng, đối soát với đơn đặt mua. | <kbd>⭐&nbsp;Xịn</kbd> |
| 8.2 | **Quản lý Claim & Bảng giá** | Theo dõi claim khách hàng, quản lý bảng giá, lô hàng giao, đối soát chi phí. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |

### 🤖 Nhóm 9: AI & Thông minh

| # | Tính năng | Chi tiết | Mức độ |
|---|-----------|----------|--------|
| 9.1 | **AI Chatbot sản xuất** | Tra cứu thông tin sản xuất bằng ngôn ngữ tự nhiên, tích hợp Google Gemini API. | <kbd>🚀&nbsp;Rất&nbsp;cao&nbsp;cấp</kbd> |
| 9.2 | **PDF Parser thông minh** | Trích xuất dữ liệu từ file PDF tài liệu ISO, tự động chuyển đổi sang định dạng hệ thống. | <kbd>🔥&nbsp;Cao&nbsp;cấp</kbd> |
| 9.3 | **Thông báo đa kênh Real-time** | WebSocket cho Web, FCM cho Mobile. Tự động thông báo khi có phiếu giao mới, QC hoàn thành, hàng trả về. | <kbd>⭐&nbsp;Xịn</kbd> |

---

## 🚀 3. Tối ưu hóa hiệu suất

SmartFlow ERP đã trải qua nhiều vòng tối ưu hóa hiệu suất ở cả 3 tầng (Database → Backend → FrontEnd), đảm bảo đáp ứng **500+ người dùng đồng thời** mà không bị nghẽn:

### 3.1. Tầng Database (SQL Server)

| Tối ưu | Chi tiết | Hiệu quả |
|--------|----------|-----------|
| **Performance Indexes** | 30+ chỉ mục (Index) được thiết kế riêng cho các truy vấn nặng nhất: `deliveries`, `delivery_details`, `products`, `orders`, `bom_details`, `daily_inspections`. | Giảm 70-90% thời gian query |
| **NOLOCK Hints** | Thêm hint `WITH (NOLOCK)` cho tất cả truy vấn read-only trên Dashboard để tránh lock conflict. | Loại bỏ deadlock khi đọc song song |
| **Connection Pooling** | Cấu hình `pool_size=100`, `max_overflow=400`, `pool_pre_ping=True` hỗ trợ 500 connections đồng thời. | Giảm 95% chi phí kết nối mới |
| **Server-side Pagination** | Toàn bộ danh sách lớn (Orders, Plans, Quality Records) sử dụng `OFFSET/FETCH` SQL thay vì `.slice()` JS. | FE chỉ tải 15 dòng/trang |

### 3.2. Tầng Backend (FastAPI)

| Tối ưu | Chi tiết | Hiệu quả |
|--------|----------|-----------|
| **SWR Cache (Stale-While-Revalidate)** | Cache in-memory cho các API hot (Dashboard, Plan Detail). Trả dữ liệu cũ ngay lập tức, cập nhật mới ở background. | Response <50ms cho cache hit |
| **In-Memory Stage Cache** | Cache danh sách công đoạn sản xuất (stages) trong RAM, tự động invalidate khi có thay đổi. | Loại bỏ 100% query lặp lại |
| **AnyIO Thread Pool Tuning** | Tăng giới hạn thread pool lên 800 tokens để tránh nghẽn hàng đợi dưới tải cao. | Hỗ trợ 500+ concurrent requests |
| **Startup Optimization** | Chỉ chạy duy nhất task đồng bộ screens khi khởi động, loại bỏ 6 task không cần thiết. | Thời gian boot giảm 80% |
| **FIFO 2-Pass Algorithm** | Thuật toán tối ưu tính tiến độ sản xuất, xử lý 53k+ bản ghi trong <100ms. | Giảm 99% thời gian xử lý |

### 3.3. Tầng FrontEnd (React + Vite)

| Tối ưu | Chi tiết | Hiệu quả |
|--------|----------|-----------|
| **Server-side Filtering & Sorting** | Toàn bộ logic lọc, tìm kiếm, sắp xếp chuyển về Backend SQL thay vì xử lý trên trình duyệt. | Không lag UI với 10,000+ bản ghi |
| **Stats từ Backend** | Thẻ thống kê (Tổng/Đang SX/Hoàn thành/Quá hạn) được tính trực tiếp trên DB, không dùng `useMemo`. | Chính xác 100% với dữ liệu thực |
| **Lazy Excel Export** | Chỉ tải toàn bộ dữ liệu khi người dùng bấm "Xuất Excel", không tải sẵn vào RAM. | Tiết kiệm 95% băng thông thường xuyên |
| **Loại bỏ Animation nặng** | Xóa các CSS animation phức tạp (gradient shimmer, card entrance) gây lag trên thiết bị yếu. | Mượt mà trên mọi thiết bị |

### 3.4. Công cụ tối ưu 1-Click

```bash
# Chạy tối ưu toàn bộ hệ thống (Database Indexes + Config check)
OPTIMIZE_SYSTEM.bat
```

---

## 📁 4. Cấu trúc thư mục

```
SmartFlow/
│
├── BackEnd/                              # ═══ BACKEND API (FastAPI + Python) ═══
│   ├── app/                              # Ứng dụng chính
│   │   ├── main.py                       # Entry point, Lifespan, Middleware, CORS
│   │   ├── routes.py                     # Đăng ký tất cả API routers
│   │   ├── models.py                     # Import tập trung tất cả ORM Models
│   │   └── dependencies.py               # Shared dependencies (Auth, DB session)
│   │
│   ├── modules/                          # ═══ MODULES NGHIỆP VỤ (13 modules) ═══
│   │   ├── auth/                         # Xác thực & Phân quyền (JWT, RBAC)
│   │   │   ├── models/                   #   Account, Role, Permission
│   │   │   ├── routes/                   #   Login, Register, Token refresh
│   │   │   └── services/                 #   Auth logic, Password hashing
│   │   │
│   │   ├── production/                   # Quản lý Sản xuất
│   │   │   ├── models/                   #   ProductPlan, Product, BOM
│   │   │   └── routes/                   #   product_plan_router, stage_router
│   │   │
│   │   ├── delivery/                     # Bàn giao & Giao nhận
│   │   │   ├── models/                   #   Order, Delivery, DeliveryDetail, Return
│   │   │   └── routes/                   #   delivery_router, order_router, return_router, pallet_router
│   │   │
│   │   ├── inspection/                   # Kiểm tra Chất lượng (QC)
│   │   │   ├── models/                   #   InputInspection, DailyInspection, Defect
│   │   │   └── routes/                   #   inspection_routes, qc_routes, iso_router
│   │   │
│   │   ├── equipment/                    # Quản lý Thiết bị & Máy móc
│   │   │   ├── models/                   #   Equipment, Machine, Maintenance
│   │   │   └── routes/                   #   equipment_router, machine_router
│   │   │
│   │   ├── kpi/                          # Quản lý KPI Nhân viên
│   │   │   ├── models/                   #   KPIChecklist, KPIRule, KPIFeedback
│   │   │   └── routes/                   #   kpi_router
│   │   │
│   │   ├── claim/                        # Claim & Bảng giá
│   │   │   ├── models/                   #   Claim, PriceList, Shipment
│   │   │   └── routes/                   #   claim_router
│   │   │
│   │   ├── purchasing/                   # Mua hàng & Đơn đặt mua
│   │   │   ├── models/                   #   PurchaseRequisition, PurchaseOrder
│   │   │   └── routes/                   #   purchasing_router
│   │   │
│   │   ├── chatbot/                      # AI Chatbot (Gemini API)
│   │   │   ├── models/                   #   ChatHistory, ChatContext
│   │   │   ├── services/                 #   Gemini integration, NLP processing
│   │   │   └── controllers/              #   Chat flow logic
│   │   │
│   │   ├── notification/                 # Thông báo (FCM + WebSocket)
│   │   │   ├── models/                   #   Notification, DeviceToken
│   │   │   └── routes/                   #   notification_router
│   │   │
│   │   ├── master/                       # Dữ liệu Master (Danh mục dùng chung)
│   │   ├── capa/                         # CAPA (Corrective & Preventive Action)
│   │   └── system/                       # Hệ thống (Screens, Settings, Bugs)
│   │
│   ├── shared/                           # ═══ SHARED SERVICES ═══
│   │   ├── services/
│   │   │   ├── cache_service.py          # SWR Cache (Stale-While-Revalidate)
│   │   │   ├── notification_service.py   # FCM Push Notification
│   │   │   ├── websocket_service.py      # WebSocket Connection Manager
│   │   │   └── pdf_parser_service.py     # PDF Parser (trích xuất tài liệu ISO)
│   │   └── utils/                        # Tiện ích chung (banner, helpers)
│   │
│   ├── config/                           # Cấu hình
│   │   ├── database.py                   # SQLAlchemy Engine, Session, Pool config
│   │   └── settings.py                   # Environment settings (.env)
│   │
│   ├── database/                         # Database Scripts
│   │   ├── migrations/                   # Migration scripts (tạo bảng, thêm cột)
│   │   └── seeders/                      # Seed data (dữ liệu mẫu)
│   │
│   ├── scripts/                          # ═══ TIỆN ÍCH & SCRIPTS ═══
│   │   ├── add_performance_indexes.sql   # 30+ Performance Indexes cho SQL Server
│   │   ├── run_indexes.py                # Script chạy indexes tự động
│   │   ├── bump_version.py               # Tự động tăng version trong code
│   │   └── import_bugs.py                # Import dữ liệu bugs vào DB
│   │
│   ├── static/                           # Static files (uploads, APK, images)
│   ├── tests/                            # Unit tests
│   └── requirements.txt                  # Python dependencies
│
├── FrontEnd/                             # ═══ FRONTEND APPLICATIONS ═══
│   │
│   ├── Web/                              # ═══ WEB DASHBOARD (React 18 + Vite) ═══
│   │   ├── Shared/                       # Component & Service dùng chung
│   │   │   ├── Views/components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── PortalLayout.jsx  # Layout chính (Header, Sidebar, Content)
│   │   │   │   │   ├── Sidebar.jsx       # Thanh điều hướng bên trái
│   │   │   │   │   ├── PageToolbar.jsx   # Thanh công cụ (Search, Filter, Create)
│   │   │   │   │   └── WebLayout.jsx     # Layout wrapper cho Web
│   │   │   │   └── feedback/             # Toast, Modal, Loading components
│   │   │   ├── Services/
│   │   │   │   └── api.service.js        # Axios instance, JWT interceptor
│   │   │   ├── styles/
│   │   │   │   └── index.css             # Design System CSS (tokens, utilities)
│   │   │   └── app/
│   │   │       └── bootstrap.jsx         # React Router, Lazy loading
│   │   │
│   │   └── modules/                      # ═══ 16 MODULES NGHIỆP VỤ WEB ═══
│   │       ├── Auth/                     # Đăng nhập, Quản lý User, Phân quyền
│   │       │   └── Views/
│   │       │       ├── LoginView.jsx
│   │       │       ├── UserManagementView.jsx
│   │       │       ├── UserCreateView.jsx
│   │       │       ├── UserEditView.jsx
│   │       │       ├── UserPermissionView.jsx
│   │       │       ├── DepartmentManagementView.jsx
│   │       │       └── PositionManagementView.jsx
│   │       │
│   │       ├── Dashboard/                # Dashboard & Báo cáo Sản xuất
│   │       ├── Plan/                     # Kế hoạch Sản xuất (Server-side Pagination)
│   │       ├── Order/                    # Đơn hàng Sản xuất (Server-side Pagination)
│   │       ├── Product/                  # Sản phẩm & BOM
│   │       ├── Delivery/                 # Theo dõi Bàn giao
│   │       ├── Pallet/                   # Quản lý Pallet
│   │       ├── Inspection/               # Báo cáo Kiểm tra QC & Quản lý Lỗi
│   │       ├── QualityRecords/           # Hồ sơ Chất lượng (Server-side Pagination)
│   │       ├── Equipment/                # Thiết bị & Máy móc (11 views)
│   │       ├── KPI/                      # KPI Nhân viên (5 views)
│   │       ├── ISO/                      # Tài liệu & Quy trình ISO (5 views)
│   │       ├── Claim/                    # Claim & Bảng giá
│   │       ├── Purchasing/               # Mua hàng & Đơn đặt mua
│   │       ├── CAPA/                     # Hành động Khắc phục/Phòng ngừa
│   │       └── System/                   # Quản lý Hệ thống, Bug, Monitor
│   │
│   ├── Mobile/                           # ═══ MOBILE APP (React + Capacitor 6) ═══
│   │   ├── Shared/                       # Component & Service dùng chung Mobile
│   │   ├── modules/                      # 8 Modules nghiệp vụ Mobile
│   │   │   ├── auth/                     # Đăng nhập, chọn công đoạn
│   │   │   ├── production/               # Theo dõi kế hoạch, PO, tiến độ
│   │   │   ├── delivery/                 # Tạo/Nhận phiếu giao, quét QR
│   │   │   ├── inspection/               # Kiểm tra QC, chụp ảnh lỗi
│   │   │   ├── equipment/                # Thiết bị tại xưởng
│   │   │   ├── kpi/                      # Chấm KPI tại xưởng
│   │   │   ├── capa/                     # CAPA tại xưởng
│   │   │   └── notification/             # Thông báo & Push
│   │   │
│   │   ├── capacitor.config.json         # Capacitor configuration (Android)
│   │   ├── package.json                  # Mobile dependencies
│   │   └── vite.config.js                # Vite config cho Mobile
│   │
│   ├── shared/                           # Tài nguyên chung Web & Mobile
│   │   ├── hooks/                        # Shared React Hooks (useAuth, useSocket)
│   │   ├── services/                     # Shared Services (api.js)
│   │   ├── store/                        # Shared State Stores (uiStore)
│   │   └── constants/                    # Shared Constants (appConfig.js)
│   │
│   ├── package.json                      # Root package.json
│   ├── vite.config.js                    # Root Vite config
│   └── index.html                        # Entry HTML
│
├── AI/                                   # ═══ AI MODULE ═══
│   └── gemini-web2api/                   # Gemini API integration layer
│
├── docs/                                 # Tài liệu hướng dẫn sử dụng
│
├── run_project.bat                       # 🖥️ Script chạy dự án (menu lựa chọn)
├── start_server.bat                      # 🖥️ Script khởi động Backend
├── ONE_CLICK_PUBLISH.bat                 # 🚀 Tự động: Version → Build → APK → Deploy
├── OPTIMIZE_SYSTEM.bat                   # ⚡ Tối ưu Database Indexes 1-click
├── SETUP_GUIDE.md                        # 📖 Hướng dẫn cài đặt chi tiết
├── MIGRATION_GUIDE.md                    # 📖 Hướng dẫn migration database
├── CHANGELOG.md                          # 📋 Nhật ký thay đổi
├── .gitignore                            # Git ignore rules
└── README.md                             # 📄 Tệp này
```

---

## 🛠️ 5. Hướng dẫn cài đặt

### Yêu cầu hệ thống

| Yêu cầu | Phiên bản tối thiểu | Ghi chú |
|----------|---------------------|---------|
| **Python** | 3.13+ | Backend API |
| **Node.js** | 18+ | FrontEnd build & dev server |
| **SQL Server** | 2019+ | Database chính (Express hoặc Developer Edition) |
| **Git** | Latest | Quản lý mã nguồn |
| **Capacitor CLI** | 6+ | Build Mobile APK (chỉ khi cần build Android) |
| **Android Studio** | Latest | Build APK (chỉ khi cần build Android) |

### Bước 1: Clone Repository

```bash
git clone https://github.com/mynd02work-bit/SmartFlow.git
cd SmartFlow
```

### Bước 2: Cài đặt Backend

```bash
# 1. Di chuyển vào thư mục BackEnd
cd BackEnd

# 2. Tạo môi trường ảo Python
python -m venv venv

# 3. Kích hoạt môi trường ảo
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Cài đặt thư viện
pip install -r requirements.txt

# 5. Tạo file .env (copy từ .env.example)
# Cấu hình các biến:
#   DATABASE_URL=mssql+pyodbc://sa:YourPassword@localhost/ERP_DB?driver=ODBC+Driver+17+for+SQL+Server
#   SECRET_KEY=your-secret-key-here
#   FCM_SERVER_KEY=your-fcm-key (nếu cần push notification)

# 6. Khởi động server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Lưu ý:** Lần đầu chạy, SQLAlchemy sẽ tự động tạo tất cả bảng trong Database thông qua `Base.metadata.create_all()`.

### Bước 3: Cài đặt Web Dashboard

```bash
# 1. Di chuyển vào thư mục FrontEnd
cd FrontEnd

# 2. Cài đặt dependencies
npm install

# 3. Chạy development server
npm run dev
# → Truy cập: http://localhost:3000

# 4. Build cho production
npm run build
# → Kết quả: thư mục dist/
```

### Bước 4: Cài đặt Mobile App

```bash
# 1. Di chuyển vào thư mục Mobile
cd FrontEnd/Mobile

# 2. Cài đặt dependencies
npm install

# 3. Chạy development server (trình duyệt)
npm run dev

# 4. Build cho Android
npm run build
npx cap sync android
cd android && gradlew.bat assembleDebug
# → APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Bước 5: Cấu hình SQL Server

```sql
-- Tạo database
CREATE DATABASE ERP_G7_v4;

-- Tạo user (khuyến nghị)
CREATE LOGIN smartflow_user WITH PASSWORD = 'StrongPassword@123';
USE ERP_G7_v4;
CREATE USER smartflow_user FOR LOGIN smartflow_user;
ALTER ROLE db_owner ADD MEMBER smartflow_user;
```

### Bước 6: Tối ưu Database (Quan trọng!)

```bash
# Chạy script tối ưu indexes 1-click
OPTIMIZE_SYSTEM.bat

# Hoặc chạy thủ công
python BackEnd/scripts/run_indexes.py
```

### Bước 7: Chạy toàn bộ hệ thống

```bash
# Sử dụng script tiện ích (Windows)
run_project.bat

# Menu sẽ hiển thị:
# 1. Chạy Backend Server
# 2. Chạy Web Dashboard
# 3. Chạy Mobile App (Dev)
# 4. Chạy tất cả
# 5. Build tất cả cho production
```

---

## 📖 6. Hướng dẫn sử dụng

### 6.1. Đăng nhập

**Web Dashboard:**
1. Truy cập `http://localhost:3000/login` (dev) hoặc `https://smartflowg7.cloud` (production)
2. Nhập tên đăng nhập và mật khẩu
3. Hệ thống tự động chuyển hướng dựa trên vai trò (Admin → Dashboard, Worker → Mobile)

**Mobile App:**
1. Mở ứng dụng SmartFlow trên điện thoại Android
2. Nhập tên đăng nhập và mật khẩu
3. Nếu tài khoản có nhiều công đoạn → Chọn công đoạn muốn làm việc

### 6.2. Quản lý Đơn hàng

| Thao tác | Hướng dẫn |
|----------|-----------|
| **Tạo đơn mới** | Menu "Đơn hàng" → "Thêm Đơn hàng" → Nhập mã PO, khách hàng, sản phẩm, số lượng, hạn giao → Lưu |
| **Theo dõi** | Xem danh sách đơn hàng với phân trang, lọc theo trạng thái/khách hàng/hạn giao |
| **Tìm kiếm** | Thanh tìm kiếm hỗ trợ search theo mã PO, tên khách hàng, tên sản phẩm |
| **Xuất Excel** | Bấm nút "Xuất Excel" → Hệ thống tải toàn bộ dữ liệu khớp bộ lọc và xuất file |

### 6.3. Kế hoạch Sản xuất

| Thao tác | Hướng dẫn |
|----------|-----------|
| **Tạo kế hoạch** | Menu "Kế hoạch SX" → "Tạo KHSX mới" → Chọn tháng/năm, thêm danh sách PO → Lưu |
| **Theo dõi tiến độ** | Xem Dashboard tổng quan với 4 thẻ KPI (Tổng/Đang SX/Hoàn thành/Quá hạn) |
| **Import Excel** | Upload file Excel chứa danh sách đơn hàng + sản phẩm + BOM |

### 6.4. Bàn giao Sản xuất (Mobile)

| Thao tác | Hướng dẫn |
|----------|-----------|
| **Tạo phiếu giao** | Chọn PO → Chọn chi tiết cần giao → Nhập số lượng → Chụp ảnh (tối đa 3) → Xác nhận → Nhận mã QR |
| **Nhận phiếu giao** | Quét mã QR hoặc chọn từ danh sách → Kiểm tra thông tin → Bấm "Nhận hàng" |
| **Trả hàng lỗi** | QC đánh dấu lỗi → Tạo phiếu trả hàng → Công đoạn gửi nhận thông báo |

### 6.5. Kiểm tra Chất lượng (QC)

| Thao tác | Hướng dẫn |
|----------|-----------|
| **Kiểm tra đầu vào** | Chọn phiếu giao → Kiểm tra SL nhận/lỗi → Chụp ảnh lỗi → Đánh giá Đạt/Không đạt |
| **Xem hồ sơ CL** | Menu "Hồ sơ Chất lượng" → Chọn KHSX → Xem danh sách PO với trạng thái dữ liệu |
| **Báo cáo** | Menu "Báo cáo QC" → Thống kê lỗi theo loại/công đoạn/thời gian |

### 6.6. Quản lý ISO

| Thao tác | Hướng dẫn |
|----------|-----------|
| **Tạo tài liệu** | Menu "ISO" → "Tài liệu" → "Thêm mới" → Nhập tiêu đề, nội dung, phân loại |
| **Biên tập biểu mẫu** | Menu "ISO" → "Biểu mẫu" → Chọn biểu mẫu → Mở Form Editor WYSIWYG |
| **Vẽ sơ đồ quy trình** | Menu "ISO" → "Quy trình" → Mở Process Flowchart Editor → Kéo-thả các bước |

---

## 📏 7. Quy tắc phát triển

### 7.1. Đặt tên (Naming Conventions)

**Python (Backend):**
```python
# Biến & Hàm: snake_case
def get_user_by_id(user_id: int): ...

# Class: PascalCase
class UserService: ...

# Constant: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3

# File: snake_case.py
# VD: user_service.py, order_router.py
```

**JavaScript/React (FrontEnd):**
```javascript
// Biến & Hàm: camelCase
const getUserById = (userId) => { ... }

// Component: PascalCase
const UserProfileCard = () => { ... }

// Service: camelCase.service.js
// VD: order.service.js, plan.service.js

// View: PascalCase + View.jsx
// VD: OrdersListView.jsx, PlanListView.jsx
```

### 7.2. Kiến trúc Module (MVC Pattern)

Mỗi module nghiệp vụ tuân theo cấu trúc **MVC** (Model-View-Controller):

```
modules/
└── ModuleName/
    ├── Models/           # Service layer (API calls)
    │   └── module.service.js
    └── Views/            # React Components (UI)
        ├── ModuleListView.jsx
        ├── ModuleDetailView.jsx
        └── ModuleCreateView.jsx
```

### 7.3. Quy tắc Commit

```
<type>: <subject>

<body>

<footer>
```

| Type | Mô tả | Ví dụ |
|------|--------|-------|
| `feat` | Thêm tính năng mới | `feat: thêm phân trang server-side cho trang Đơn hàng` |
| `fix` | Sửa lỗi | `fix: sửa lỗi stale closure khi đổi PO trên Mobile` |
| `perf` | Tối ưu hiệu suất | `perf: thêm NOLOCK hint cho Dashboard queries` |
| `refactor` | Cải tiến code | `refactor: tách fetchOrders thành custom hook` |
| `docs` | Cập nhật tài liệu | `docs: viết lại README.md` |
| `style` | Thay đổi giao diện | `style: cải thiện responsive cho mobile cards` |
| `chore` | Cấu hình, build | `chore: cập nhật .gitignore` |

### 7.4. Quy trình Review

```
1. Tạo branch mới từ dev_v1
   git checkout -b feature/ten-tinh-nang

2. Implement & Self-test

3. Commit với message chuẩn

4. Push & Tạo Pull Request

5. Code Review (ít nhất 1 reviewer)

6. Merge vào dev_v1

7. Deploy staging → Test → Merge vào main
```

### 7.5. Quy tắc API Endpoint

```
# RESTful conventions
GET    /api/v1/orders/                 # Danh sách (có phân trang)
GET    /api/v1/orders/{id}             # Chi tiết
POST   /api/v1/orders/                 # Tạo mới
PUT    /api/v1/orders/{id}             # Cập nhật
DELETE /api/v1/orders/{id}             # Xóa

# Phân trang response format
{
  "items": [...],
  "total_count": 150,
  "stats": { "all": 150, "production": 45, "completed": 80, "overdue": 25 }
}
```

---

## 🚢 8. Triển khai sản xuất

### 8.1. Triển khai 1-Click (Khuyến nghị)

Sử dụng script `ONE_CLICK_PUBLISH.bat` để tự động hóa toàn bộ quy trình:

```bash
ONE_CLICK_PUBLISH.bat
```

Script sẽ tự động thực hiện 5 bước:
1. ✅ Cập nhật Version trong code (bump_version.py)
2. ✅ Build Web Dashboard + Mobile (npm run build)
3. ✅ Build Android APK (Gradle assembleDebug)
4. ✅ Copy APK vào thư mục phát hành (static/apps/)
5. ✅ Tự động khởi động lại Backend Server

### 8.2. Triển khai Backend thủ công

```bash
# Production mode (multi-worker)
cd BackEnd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Hoặc dùng script
start_server.bat
```

### 8.3. Triển khai Web Dashboard

```bash
# Build production bundle
cd FrontEnd
npm run build

# Copy thư mục dist/ lên web server
# Backend FastAPI sẽ tự serve static files từ dist/
```

### 8.4. Triển khai Mobile APK

```bash
# Build APK
cd FrontEnd/Mobile
npm run build
npx cap sync android
cd android && gradlew.bat clean assembleDebug

# APK output:
# android/app/build/outputs/apk/debug/app-debug.apk

# Copy vào thư mục phát hành
copy app-debug.apk ..\..\..\..\BackEnd\static\apps\SmartFlow_Latest.apk
```

### 8.5. Cấu hình Cloudflare Tunnel

```bash
# Cài đặt cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# Tạo tunnel
cloudflared tunnel create smartflow

# Cấu hình (config.yml)
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: smartflowg7.cloud
    service: http://localhost:8000
  - service: http_status:404

# Chạy tunnel
cloudflared tunnel run smartflow
```

### 8.6. Backup & Restore Database

```sql
-- Backup
BACKUP DATABASE ERP_G7_v4
TO DISK = 'C:\backup\ERP_G7_v4.bak'
WITH FORMAT, COMPRESSION;

-- Restore
RESTORE DATABASE ERP_G7_v4
FROM DISK = 'C:\backup\ERP_G7_v4.bak'
WITH REPLACE;
```

---

## 🔧 9. Giải quyết sự cố

### Lỗi thường gặp

| # | Lỗi | Nguyên nhân | Giải pháp |
|---|-----|-------------|-----------|
| 1 | `ModuleNotFoundError: No module named 'fastapi'` | Chưa cài dependencies | `cd BackEnd && pip install -r requirements.txt` |
| 2 | `Cannot connect to SQL Server` | SQL Server chưa chạy hoặc chuỗi kết nối sai | Kiểm tra SQL Server Service + chuỗi kết nối trong `.env` |
| 3 | `Cannot resolve import '@modules/...'` | Alias chưa đúng hoặc thiếu package | Kiểm tra `vite.config.js` aliases + chạy `npm install` |
| 4 | `WebSocket connection closed` | Backend chưa chạy | Kiểm tra Backend đang chạy ở port 8000 |
| 5 | `Push notification not received` | FCM key chưa cấu hình | Kiểm tra `FCM_SERVER_KEY` trong `.env` |
| 6 | `Build APK thất bại (đường dẫn tiếng Việt)` | Gradle không hỗ trợ ký tự Unicode trong path | Dùng `ONE_CLICK_PUBLISH.bat` (tự động mount ổ đĩa ảo Z:) |
| 7 | `Pool timeout / Too many connections` | Vượt quá giới hạn connection pool | Tăng `pool_size` và `max_overflow` trong `config/database.py` |
| 8 | `CORS error` | FrontEnd gọi API khác domain | Kiểm tra `allow_origins` trong `main.py` CORS config |

### Kiểm tra Health

```bash
# Kiểm tra Backend đang chạy
curl http://localhost:8000/health
# Response: {"status": "ok"}

# Kiểm tra API docs
# Truy cập: http://localhost:8000/docs (Swagger UI)
```

---

## 📅 10. Nhật ký thay đổi

### Version 2.0.0 (2026-07-15) — 🔥 Major Performance Release

**Tối ưu hóa hiệu suất toàn diện:**
- ⚡ Server-side Pagination cho 3 màn hình dữ liệu lớn (Plans, Orders, Quality Records)
- ⚡ SWR Cache (Stale-While-Revalidate) cho Dashboard và Plan Detail API
- ⚡ In-Memory Stage Cache giảm 100% query lặp lại
- ⚡ 30+ Database Performance Indexes cho SQL Server
- ⚡ NOLOCK hints cho tất cả read-only Dashboard queries
- ⚡ AnyIO Thread Pool tuning lên 800 tokens
- ⚡ Connection Pool mở rộng: 100 base + 400 overflow
- ⚡ Startup optimization: loại bỏ 6/7 task khởi động không cần thiết
- ⚡ Loại bỏ CSS animation nặng (shimmer, card entrance) trên FrontEnd

**Tính năng mới:**
- 🆕 Công cụ OPTIMIZE_SYSTEM.bat — tối ưu database 1-click
- 🆕 Hệ thống Bug Management tích hợp
- 🆕 System Monitor giám sát real-time

### Version 1.2.0 (2026-05-20)

**Tính năng mới:**
- Tài khoản đa công đoạn (Multi-stage Account) + Selector
- Cải tiến QR dự phòng — chỉ giải phóng sau QC xác nhận
- Nâng cấp trang Phiếu ngoại lệ: cột Tỷ lệ %, Loại ngoại lệ
- Bộ lọc chính xác theo Mã PO trên Mobile

**Sửa lỗi:**
- Fix 3 bug: stale closure, dropdown mất dữ liệu, reset PO khi đổi kế hoạch

### Version 1.1.5 (2026-05-07)

**Tính năng mới:**
- Thuật toán FIFO 2-Pass tối ưu Dashboard (giảm 99% thời gian load)
- Sticky Header & Filter cho trang Theo dõi kế hoạch
- Bộ công cụ `ONE_CLICK_PUBLISH.bat` tự động hóa phát hành

### Version 1.1.0 (2026-04-27)

**Tính năng mới:**
- Hệ thống tài liệu Developer Wiki
- Logic tự động tính số lượng thực nhận và x2 giới hạn
- WebSocket real-time notifications

### Version 1.0.0 (2026-04-01) — 🎉 Initial Release

- Hệ thống ERP cơ bản: Đơn hàng, Kế hoạch SX, Phiếu giao/nhận, QC, QR Code, Notifications

---

## 📞 11. Hỗ trợ kỹ thuật

### Liên hệ hỗ trợ

| Kênh | Thông tin |
|------|-----------|
| 📱 **Zalo (Ưu tiên)** | **0888 187 044** hoặc **0981 206 221** |
| 🌐 **Website** | [smartflowg7.cloud](https://smartflowg7.cloud) |
| 💻 **GitHub** | [github.com/mynd02work-bit/SmartFlow](https://github.com/mynd02work-bit/SmartFlow) |
| 📧 **API Docs** | `https://smartflowg7.cloud/docs` (Swagger UI) |

### Tài liệu tham khảo

| Tài liệu | Link |
|-----------|------|
| FastAPI Documentation | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) |
| React Documentation | [react.dev](https://react.dev/) |
| Capacitor Documentation | [capacitorjs.com](https://capacitorjs.com/) |
| SQLAlchemy Documentation | [docs.sqlalchemy.org](https://docs.sqlalchemy.org/) |
| Vite Documentation | [vite.dev](https://vite.dev/) |
| SQL Server Documentation | [docs.microsoft.com/sql](https://docs.microsoft.com/en-us/sql/) |

---

## 📜 License

Dự án **SmartFlow ERP** — Phát triển bởi Đội ngũ Công nghệ **G7 Manufacturing**.

© 2026 G7 Manufacturing. All rights reserved.

---

<p align="center">
  <strong>SmartFlow ERP</strong> — Nền tảng Điều hành Sản xuất Thông minh<br/>
  <em>Kết nối mọi công đoạn. Tối ưu mọi quy trình. Kiểm soát mọi chi tiết.</em>
</p>

<p align="center">
  <sub>Last Updated: 2026-07-15 • Branch: dev_v1 • Version: 2.0.0</sub>
</p>
