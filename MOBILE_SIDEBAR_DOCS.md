# HƯỚNG DẪN CHI TIẾT CẤU TRÚC SIDEBAR MOBILE - SMARTFLOW ERP

---

## 📌 1. TỔNG QUAN CẤU TRÚC MENU MOBILE SIDEBAR

Dưới đây là cây thư mục menu điều hướng trên giao diện **Mobile App / Mobile Web ERP SmartFlow**:

```text
Trang chủ (/dashboard)
├── Khởi tạo phiếu (#)
│   ├── Tạo phiếu luân chuyển (/production_v2/transfer)
│   ├── Danh sách luân chuyển (/production_v2/transfer-list)
│   ├── Tạo phiếu kiểm tra (/production_v2/inspection)
│   └── Kiểm tra nhập kho (/inspection-stage)
├── Thông tin sản xuất (#)
│   ├── Lệnh sản xuất (/production/orders)
│   ├── Kế hoạch sản xuất (/production/plans)
│   └── Lịch sử luân chuyển (/production/transfers)
├── Lập báo cáo (#)
│   ├── Theo dõi CAPA (/capa-list)
│   ├── Tạo báo cáo nhanh (/quick-report-create)
│   └── Lịch sử báo cáo (/quick-report-list)
├── Báo cáo vi phạm (/awards)
└── Đánh giá nhân sự (/kpi-staff)
```

---

## 📋 2. BẢNG TỔNG HỢP DANH MỤC & ĐƯỜNG DẪN (ROUTES)

| STT | Danh mục Menu | Loại | Đường dẫn (Route Path) | Mã Component |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Trang chủ** | Đơn | `/dashboard` | `ProductionDashboard.jsx` |
| **2** | **Khởi tạo phiếu** | Nhóm | `#` | *N/A (Accordion Group)* |
| 2.1 | ├── Tạo phiếu luân chuyển | Con | `/production_v2/transfer` | `CL07_TransferCreateView.jsx` |
| 2.2 | ├── Danh sách luân chuyển | Con | `/production_v2/transfer-list` | `CL06_TransferListView.jsx` |
| 2.3 | ├── Tạo phiếu kiểm tra | Con | `/production_v2/inspection` | `CL09A_FirstSampleView.jsx` |
| 2.4 | └── Kiểm tra nhập kho | Con | `/inspection-stage` | `StageInspectionView.jsx` |
| **3** | **Thông tin sản xuất** | Nhóm | `#` | *N/A (Accordion Group)* |
| 3.1 | ├── Lệnh sản xuất | Con | `/production/orders` | `ProductionOrders.jsx` |
| 3.2 | ├── Kế hoạch sản xuất | Con | `/production/plans` | `ProductionPlanSchedule.jsx` |
| 3.3 | └── Lịch sử luân chuyển | Con | `/production/transfers` | `ProductionTransferHistory.jsx` |
| **4** | **Lập báo cáo** | Nhóm | `#` | *N/A (Accordion Group)* |
| 4.1 | ├── Theo dõi CAPA | Con | `/capa-list` | `CAPAListView.jsx` |
| 4.2 | ├── Tạo báo cáo nhanh | Con | `/quick-report-create` | `QuickReportCreateView.jsx` |
| 4.3 | └── Lịch sử báo cáo | Con | `/quick-report-list` | `QuickReportListView.jsx` |
| **5** | **Báo cáo vi phạm** | Đơn | `/awards` | `AwardDisciplineView.jsx` |
| **6** | **Đánh giá nhân sự** | Đơn | `/kpi-staff` | `KPIStaffListView.jsx` |

---

## 🔍 3. CHI TIẾT CHỨC NĂNG NGHỆP VỤ & TÍNH NĂNG TỪNG TRANG

### 🏠 1. Trang chủ
* **Đường dẫn (Route)**: `/dashboard` (hoặc `/production/dashboard`)
* **Mã Component**: `FrontEnd/Mobile/modules/production/Views/ProductionDashboardView.jsx`
* **Mục đích**: Màn hình trung tâm tổng quan dành cho người dùng Mobile ngay sau khi đăng nhập.
* **Các tính năng chính**:
  * **Chỉ số nhanh (KPI Counters)**: Hiển thị sản lượng sản xuất trong ca, số phiếu luân chuyển đang chờ xử lý, số sự cố chất lượng mới phát sinh.
  * **Lối tắt nhanh (Quick Actions)**: Nút bấm truy cập tức thì đến các chức năng *Tạo phiếu luân chuyển*, *Tạo phiếu kiểm tra khẩn cấp*.
  * **Thông báo nóng (Alerts)**: Dòng tin tức/cảnh báo real-time từ nhà máy hoặc Ban Giám Đốc.

---

### 📑 2. Khởi tạo phiếu *(Nhóm chứng từ vận hành hiện trường)*

#### 🔹 2.1. Tạo phiếu luân chuyển
* **Đường dẫn (Route)**: `/production_v2/transfer` *(Chi tiết/Sửa: `/production_v2/transfer/:id`)*
* **Mã Component**: `FrontEnd/Mobile/modules/production_v2/Views/CL07_TransferCreateView.jsx`
* **Mục đích**: Lập phiếu chuyển giao bán thành phẩm, nguyên vật liệu hoặc sản phẩm giữa các công đoạn sản xuất hoặc giữa các xưởng/kho.
* **Các tính năng chính**:
  * **Chọn Lệnh sản xuất (WO)**: Tra cứu và chọn mã Lệnh sản xuất đang chạy.
  * **Chọn công đoạn**: Chọn công đoạn nguồn (*From Stage*) và công đoạn đích (*To Stage*).
  * **Quét mã QR Code**: Dùng camera điện thoại quét mã QR dán trên pallet/thùng hàng để tự động điền thông tin lô hàng.
  * **Nhập số lượng**: Nhập số lượng luân chuyển, số lượng đạt (Pass), số lượng lỗi (NG).
  * **Chữ ký & Xác nhận**: Chọn người giao, người nhận và gửi phiếu vào hệ thống.

#### 🔹 2.2. Danh sách luân chuyển
* **Đường dẫn (Route)**: `/production_v2/transfer-list`
* **Mã Component**: `FrontEnd/Mobile/modules/production_v2/Views/CL06_TransferListView.jsx`
* **Mục đích**: Theo dõi, tra cứu và quản lý trạng thái của toàn bộ các phiếu luân chuyển đã lập trong nhà máy.
* **Các tính năng chính**:
  * **Danh sách thời gian thực**: Hiển thị phiếu luân chuyển theo thứ tự mới nhất.
  * **Bộ lọc thông minh**: Lọc phiếu theo *Trạng thái* (Mới tạo, Đang vận chuyển, Đã nhận, Bị từ chối), theo *Ngày*, hoặc theo *Lệnh sản xuất*.
  * **Xem & Duyệt phiếu**: Nhấn vào phiếu để xem chi tiết, bấm **Xác nhận nhận hàng** hoặc **Từ chối phiếu** nếu phát sinh sai lệch số lượng.

#### 🔹 2.3. Tạo phiếu kiểm tra
* **Đường dẫn (Route)**: `/production_v2/inspection` *(Chuyển hướng tới `/production_v2/inspection/first-sample`)*
* **Mã Component**: `FrontEnd/Mobile/modules/production_v2/Views/CL09A_FirstSampleView.jsx`
* **Mục đích**: Ghi nhận kết quả kiểm tra chất lượng sản phẩm (QC Inspection) tại các công đoạn sản xuất.
* **Các tính năng chính**:
  * **Chọn loại hình kiểm tra QC**:
    * *Kiểm tra mẫu đầu (First Sample - CL09A)*
    * *Kiểm tra lại (Re-inspect - CL09B)*
    * *Kiểm tra thông số kỹ thuật (CL09C)*
    * *Kiểm tra quy trình (CL09D)*
    * *Đánh giá QA (CL09E)*
    * *Kiểm tra hàng ngày (CL09F)*
  * **Nhập dữ liệu QC**: Nhập kích thước, thông số kỹ thuật, số lượng mẫu kiểm, số lượng đạt/lỗi.
  * **Chụp ảnh minh chứng**: Chụp ảnh sản phẩm bị lỗi trực tiếp từ camera và đính kèm vào phiếu kiểm tra.

#### 🔹 2.4. Kiểm tra nhập kho
* **Đường dẫn (Route)**: `/inspection-stage` (hoặc `/input-inspection`)
* **Mã Component**: `FrontEnd/Mobile/modules/inspection/Views/StageInspectionView.jsx`
* **Mục đích**: Thực hiện quy trình kiểm tra chất lượng nguyên vật liệu đầu vào (IQC) hoặc hàng thành phẩm trước khi chính thức nhập kho.
* **Các tính năng chính**:
  * **Thông tin lô hàng**: Chọn nhà cung cấp, mã nguyên vật liệu, số phiếu nhập kho.
  * **Đánh giá tiêu chuẩn**: Tích chọn checklist tiêu chuẩn (Ngoại quan, kích thước, độ ẩm, độ bám dính, đóng gói...).
  * **Quyết định chất lượng**: Đánh giá trạng thái lô hàng: **Đạt (Passed)**, **Nhập kho có điều kiện (Conditional)**, hoặc **Trả hàng (Rejected)**.

---

### 🏭 3. Thông tin sản xuất *(Tra cứu vận hành nhà máy)*

#### 🔹 3.1. Lệnh sản xuất
* **Đường dẫn (Route)**: `/production/orders` *(Chi tiết: `/production/order-detail/:poCode`)*
* **Mã Component**: `FrontEnd/Mobile/modules/production/Views/ProductionOrdersView.jsx`
* **Mục đích**: Tra cứu danh sách và tình trạng thực hiện các Lệnh sản xuất (Work Orders / PO) toàn nhà máy.
* **Các tính năng chính**:
  * **Tra cứu danh sách WO**: Tìm kiếm theo mã WO, tên sản phẩm, mã đơn hàng.
  * **Theo dõi sản lượng**: Xem tổng số lượng kế hoạch, số lượng đã hoàn thành, số lượng còn lại.
  * **Xem tiến độ từng công đoạn**: Xem chi tiết sản lượng đã đi qua từng trạm sản xuất (Cắt -> Định hình -> Lắp ráp -> Sơn -> Đóng gói).

#### 🔹 3.2. Kế hoạch sản xuất
* **Đường dẫn (Route)**: `/production/plans` (hoặc `/plan`)
* **Mã Component**: `FrontEnd/Mobile/modules/production/Views/ProductionPlanScheduleView.jsx`
* **Mục đích**: Giám sát lịch trình sản xuất và tiến độ thực hiện kế hoạch theo thời gian (Ca/Ngày/Tuần).
* **Các tính năng chính**:
  * **Xem tiến độ phần trăm (%)**: Thanh tiến độ trực quan hiển thị % hoàn thành kế hoạch.
  * **Cảnh báo tiến độ**: Đánh dấu màu cảnh báo đối với các đơn hàng có nguy cơ trễ hạn (Overdue/Delayed).
  * **Lịch trình ca làm việc**: Xem phân bổ sản xuất theo từng tổ đội/chuyền sản xuất.

#### 🔹 3.3. Lịch sử luân chuyển
* **Đường dẫn (Route)**: `/production/transfers`
* **Mã Component**: `FrontEnd/Mobile/modules/production/Views/ProductionTransferHistoryView.jsx`
* **Mục đích**: Tra cứu nhật ký vết di chuyển của vật tư và bán thành phẩm trong suốt quá trình sản xuất (Traceability).
* **Các tính năng chính**:
  * **Dòng thời gian (Timeline)**: Hiển thị chi tiết từng mốc thời gian lô hàng di chuyển qua các công đoạn.
  * **Tra cứu người thực hiện**: Xem thông tin người giao, người nhận, thời gian ký nhận.
  * **Mã QR truy xuất**: Hiển thị mã QR Code để quét truy xuất nhanh nguồn gốc lô hàng.

---

### 📢 4. Lập báo cáo *(Quản lý sự cố & CAPA)*

#### 🔹 4.1. Theo dõi CAPA
* **Đường dẫn (Route)**: `/capa-list` *(Chi tiết: `/capa-detail/:id`)*
* **Mã Component**: `FrontEnd/Mobile/modules/capa/Views/CAPAListView.jsx`
* **Mục đích**: Quản lý các phiếu **Hành động Khắc phục và Phòng ngừa (CAPA)** khi phát sinh sự cố chất lượng nghiêm trọng.
* **Các tính năng chính**:
  * **Phân loại trạng thái**: Xem danh sách phiếu CAPA (Mới tạo, Đang phân tích nguyên nhân 5-Why, Đang thực hiện, Đã nghiệm thu/đóng phiếu).
  * **Gán người trách nhiệm**: Theo dõi người chịu trách nhiệm sửa lỗi và hạn chót hoàn thành (Deadline).
  * **Minh chứng khắc phục**: Xem/tải ảnh minh chứng trước và sau khi thực hiện hành động khắc phục.

#### 🔹 4.2. Tạo báo cáo nhanh
* **Đường dẫn (Route)**: `/quick-report-create`
* **Mã Component**: `FrontEnd/Mobile/modules/quick_report/Views/QuickReportCreateView.jsx`
* **Mục đích**: Báo cáo khẩn cấp các sự cố bất ngờ tại hiện trường xưởng sản xuất.
* **Các tính năng chính**:
  * **Chọn loại sự cố**: Chọn phân loại (Sự cố máy móc, Sự cố chất lượng, Thiếu vật tư, An toàn lao động).
  * **Mô tả & Vị trí**: Nhập thông tin sự cố ngắn gọn và chọn vị trí chuyền/xưởng phát sinh.
  * **Chụp ảnh/Quay video**: Chụp ảnh hoặc quay video hiện trường gửi trực tiếp đến Ban Quản lý / Bộ phận Bảo trì / IT để hỗ trợ ứng cứu tức thì.

#### 🔹 4.3. Lịch sử báo cáo
* **Đường dẫn (Route)**: `/quick-report-list` (hoặc `/reports`)
* **Mã Component**: `FrontEnd/Mobile/modules/quick_report/Views/QuickReportListView.jsx`
* **Mục đích**: Theo dõi danh sách và tiến độ phản hồi/xử lý các báo cáo sự cố nhanh đã gửi.
* **Các tính năng chính**:
  * **Theo dõi tiến độ xử lý**: Xem trạng thái (*Đã tiếp nhận*, *Đang xử lý*, *Đã khắc phục*).
  * **Lọc báo cáo**: Lọc sự cố theo ngày gửi hoặc loại sự cố.

---

### ⚠️ 5. Báo cáo vi phạm
* **Đường dẫn (Route)**: `/awards`
* **Mã Component**: `FrontEnd/Mobile/modules/kpi/Views/AwardDisciplineView.jsx`
* **Mục đích**: Ghi nhận các trường hợp vi phạm nội quy, sai phạm quy trình kỹ thuật hoặc an toàn lao động của công nhân/nhân sự để phục vụ chấm điểm thi đua KPI.
* **Các tính năng chính**:
  * **Chọn nhân sự vi phạm**: Tìm kiếm và chọn tên công nhân/nhân sự vi phạm.
  * **Chọn lỗi vi phạm**: Chọn loại lỗi trong danh mục quy định (Không đeo đồ bảo hộ, thao tác sai quy trình, làm hỏng vật tư, đi muộn...).
  * **Nhập điểm trừ**: Nhập số điểm trừ tương ứng theo chế tài.
  * **Đính kèm bằng chứng**: Chụp ảnh bằng chứng vi phạm và gửi lên hệ thống phê duyệt.

---

### 👤 6. Đánh giá nhân sự
* **Đường dẫn (Route)**: `/kpi-staff` *(Chi tiết cá nhân: `/staff-evaluation/:id`)*
* **Mã Component**: `FrontEnd/Mobile/modules/kpi/Views/KPIStaffListView.jsx`
* **Mục đích**: Tra cứu và quản lý điểm số đánh giá hiệu suất làm việc (KPI) của nhân sự trong xưởng/tổ đội.
* **Các tính năng chính**:
  * **Danh sách điểm KPI**: Xem điểm số tổng kết KPI tháng hiện tại của từng nhân viên.
  * **Nhật ký điểm thưởng / điểm phạt**: Xem lịch sử chi tiết từng mốc cộng điểm (khen thưởng) và trừ điểm (vi phạm/lỗi sản xuất).
  * **Xếp loại thi đua**: Xem xếp loại thi đua tháng (*Xuất sắc, Tốt, Khá, Trung bình, Yếu*) và biểu đồ biến động điểm số theo tháng.

---
*Tài liệu được khởi tạo tự động từ mã nguồn dự án SmartFlow v2.*
