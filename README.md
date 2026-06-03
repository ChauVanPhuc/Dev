# 🏭 ERP G7 - Hệ thống Điều hành Sản xuất Thông minh

ERP G7 là hệ thống quản lý sản xuất toàn diện, kết nối từ đơn hàng đến từng công đoạn tại xưởng (Shopfloor) thông qua nền tảng Web và Mobile.

---

## 🏗️ Tổng quan Kiến trúc (High-Level Architecture)

Hệ thống được thiết kế theo mô hình **Client-Server**:
- **Backend**: API trung tâm xử lý logic (FastAPI) và kết nối SQL Server.
- **Web Admin**: Dành cho khối văn phòng, quản lý đơn hàng và báo cáo.
- **Mobile App**: Dành cho công nhân và QC tại xưởng máy (React Native/Capacitor).

---

## ⚡ Tính năng Nổi bật & Tối ưu hóa (Key Features)

### 1. Tối ưu hóa Hiệu suất Dashboard (High Performance)
- **Thuật toán FIFO 2-Pass**: Xử lý logic tính toán tiến độ sản xuất phức tạp với độ trễ cực thấp (từ >10 giây giảm xuống còn <0.1 giây cho 53k+ bản ghi).
- **SKU Deduplication**: Giảm tải dữ liệu xử lý bằng cách gộp nhóm BOM theo SKU thay vì ID sản phẩm đơn lẻ.

### 2. Thông báo thời gian thực (Real-time Notifications)
- **Push Notifications**: Hệ thống thông báo tức thời qua Firebase Cloud Messaging (FCM) và WebSockets.
- **Tương tác đa kênh**: Công nhân nhận lệnh sản xuất và QC nhận thông báo kết quả kiểm tra ngay lập tức trên điện thoại.

### 3. Hệ thống Định danh & Quét mã (QR Code System)
- **Truy xuất nhanh**: Tích hợp quét mã QR để nhận diện lệnh sản xuất (PO), kiện hàng và vị trí kho.
- **Dữ liệu chuẩn xác**: Loại bỏ sai sót nhập liệu thủ công bằng cách quét mã vạch/QR tốc độ cao.

### 4. Hạ tầng & Tên miền (Cloud Infrastructure)
- **Global Access**: Triển khai qua hệ thống tên miền riêng (`smartflowg7.cloud`) với bảo mật SSL/HTTPS.
- **Cloudflare Tunnel**: Đảm bảo kết nối ổn định, tốc độ cao và bảo mật tuyệt đối cho server nội bộ khi truy cập từ xa.

### 5. Hệ thống Cập nhật Tự động (OTA Update)
- Tích hợp cơ chế tự động kiểm tra phiên bản và thông báo cập nhật ngay trong ứng dụng di động.
- Hỗ trợ tải và cài đặt file APK trực tiếp từ server mà không cần qua trình duyệt.

### 7. Quản lý Mã QR Dự phòng (Backup QR System)
- **Cấp phát thông minh**: Tự động gán mã QR dự phòng cho kiện hàng khi QR chính bị hư hỏng hoặc mất.
- **Giải phóng đúng thời điểm**: Mã QR dự phòng chỉ được giải phóng (tái sử dụng) sau khi QC hoàn tất xác nhận, đảm bảo truy xuất nguồn gốc liên tục trong suốt quy trình kiểm tra.

### 8. Lọc Đơn hàng Chính xác trên Mobile (Exact Order Filter)
- **Lọc theo PO**: Hỗ trợ chọn chính xác 1 đơn hàng (PO) trên màn hình Theo dõi kế hoạch, chỉ hiển thị duy nhất đơn đó thay vì toàn bộ kế hoạch.
- **Anti-stale closure**: Khắc phục vấn đề React closure cũ (stale closure) đảm bảo bộ lọc luôn truyền giá trị mới nhất khi thay đổi trạng thái.

### 9. Màn hình Phiếu Ngoại lệ Nâng cao (Exception Delivery Enhancement)
- **Hiển thị Tỷ lệ %**: Cột Lệch/Trả được nâng cấp thành hiển thị tỷ lệ phần trăm chênh lệch so với tổng số lượng giao.
- **Phân loại ngoại lệ**: Đổi tên "Đặc trưng ngoại lệ" thành "Loại ngoại lệ" cho rõ ràng, dễ hiểu hơn.

### 10. Tài khoản Đa Công đoạn (Multi-Stage Account)
- **Gộp công đoạn**: Hỗ trợ gán nhiều công đoạn sản xuất cho cùng 1 tài khoản (ví dụ: Lắp ráp + Chà nhám dùng chung 1 tài khoản).
- **Selector công đoạn**: Hiển thị thanh chọn công đoạn khi người dùng có quyền truy cập nhiều công đoạn khác nhau.

---

## 📚 Cổng thông tin cho Lập trình viên (Developer Wiki)

Chào mừng bạn tham gia phát triển dự án. Hãy đọc kỹ các tài liệu dưới đây theo thứ tự để nắm bắt hệ thống:

### 1. Hướng dẫn Khởi chạy
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Cách cài đặt môi trường Python, Node.js và SQL Server để chạy dự án lần đầu.

### 2. Tài liệu Backend (API & Database)
- **[BackEnd/docs/DATABASE.md](./BackEnd/docs/DATABASE.md)**: Sơ đồ ERD và chi tiết các bảng dữ liệu.
- **[BackEnd/docs/AUTH_SYSTEM.md](./BackEnd/docs/AUTH_SYSTEM.md)**: Cơ chế đăng nhập và phân quyền Stage-based.
- **[BackEnd/docs/API_FLOWS.md](./BackEnd/docs/API_FLOWS.md)**: Luồng nghiệp vụ Giao - Nhận - QC chi tiết.

### 3. Tài liệu Mobile (UI & State)
- **[Mobile/docs/STATE_MANAGEMENT.md](./Mobile/docs/STATE_MANAGEMENT.md)**: Cách quản lý dữ liệu toàn cục bằng Zustand.
- **[Mobile/docs/SCREEN_WORKFLOWS.md](./Mobile/docs/SCREEN_WORKFLOWS.md)**: Logic điều hướng và xử lý trên các màn hình.
- **[Mobile/src/views/components/README.md](./Mobile/src/views/components/README.md)**: Thư viện UI Components dùng chung.

---

## 🛠️ Quy tắc Dự án (Coding Standards)

- **Ngôn ngữ**: 
    - Backend: Python (FastAPI).
    - UI: React (JavaScript/JSX).
- **Quy tắc đặt tên**:
    - Biến/Hàm: camelCase (JS), snake_case (Python).
    - Component: PascalCase.
- **Commit Message**: Sử dụng tiếng Việt hoặc tiếng Anh có ý nghĩa (vd: `feat: cập nhật logic tính số lượng nhận`).

---

## 📅 Nhật ký thay đổi (Recent Changes)
- **2026-05-20 (v1.2.0)**:
    - Hỗ trợ tài khoản đa công đoạn — gộp Lắp ráp & Chà nhám vào cùng 1 tài khoản với selector công đoạn.
    - Sửa luồng giải phóng Mã QR dự phòng — chỉ giải phóng sau khi QC xác nhận (không phải khi SX nhận hàng).
    - Ẩn mục "Kích thước" trên màn hình Kiểm tra đầu vào (MB2.4).
    - Đổi "SL Loại" → "SL Lỗi" với giá trị mặc định 0 và bắt buộc nhập trên Giao - Nhận (MB2.2).
    - Nâng cấp trang Phiếu ngoại lệ: cột Tỷ lệ (%), Loại ngoại lệ, nút Xác minh.
    - Thêm bộ lọc chính xác theo Mã đơn hàng (PO) trên Mobile Plan Tracking — sửa 3 bug stale closure, dropdown mất dữ liệu, reset PO khi đổi kế hoạch.
- **2026-05-07 (v1.1.5)**: 
    - Triển khai thuật toán FIFO 2-Pass tối ưu Dashboard (giảm 99% thời gian load).
    - Hoàn thiện hệ thống "Sticky Header & Filter" cho trang Theo dõi kế hoạch.
    - Ra mắt bộ công cụ `ONE_CLICK_PUBLISH.bat` giúp tự động hóa quy trình phát hành.
    - Sửa lỗi đường dẫn tiếng Việt khi build APK bằng cơ chế `subst` ổ đĩa ảo.
- **2026-04-27**: 
    - Xây dựng hệ thống tài liệu toàn diện (Wiki).
    - Thêm logic tự động tính số lượng thực nhận và x2 giới hạn.

---
*Dự án ERP G7 - Phát triển bởi Đội ngũ Công nghệ G7.*
