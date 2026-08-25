# 🎯 SLIDE THUYẾT TRINH DEMO DỰ ÁN SMARTFLOW
### HỆ THỐNG QUẢN LÝ SẢN XUẤT VÀ KIỂM SOÁT CHẤT LƯỢNG SẢN PHẨM GỖ NỘI THẤT
*(Tài liệu chuẩn hóa nội dung trình chiếu — Có thể dùng trực tiếp trên Canva hoặc trình chiếu)*

---

--- slide ---

<!-- SLIDE 1 -->
# 🏭 SMARTFLOW - VẬN HÀNH SẢN XUẤT & KIỂM SOÁT CHẤT LƯỢNG 4.0
### BUỔI BÁO CÁO & DEMO HỆ THỐNG QUẢN TRỊ TOÀN DIỆN

**Thông tin buổi Demo:**
- 🎙️ **Người thực hiện (Presenter):** [Tên của bạn / Nhóm Dự Án]
- 🤝 **Người hỗ trợ (Supporter / Team):** Đội ngũ Phát triển Hệ thống & Phòng QLCL
- 🏢 **Đơn vị áp dụng:** Phân Xưởng 1 (PX1), Phân Xưởng 2 (PX2), Nhà Máy 3 (NM3)
- 📅 **Thời gian:** 25/08/2026

*Chuyển đổi số toàn diện: Từ Đơn hàng PO ➜ Lệnh Sản Xuất ➜ Kiểm Mẫu Đầu ➜ Bàn giao theo Thẻ Pallet ➜ QC Kiểm Tra Nối Tiếp ➜ Báo cáo Realtime*

--- slide ---

<!-- SLIDE 2 -->
# 📋 NỘI DUNG TRÌNH BÀY (OUTLINE)
### TRỌNG TÂM: QUẢN LÝ PHIẾU BÀN GIAO & PHIẾU KIỂM TRA CHẤT LƯỢNG THEO PALLET

1. **📦 Phiếu Bàn Giao Luân Chuyển (Happy Case)**
   - Luồng chuẩn 3 bên: SX Giao ➜ QC Duyệt ➜ SX Nhận gắn với Mã Thẻ Pallet.

2. **🔄 Phiếu Trả Hàng Khi Có Lỗi (Return Case)**
   - Bắt lỗi tại trạm, gắn mã lỗi G7, gửi trả CĐ trước làm bù theo mã Pallet.

3. **🔍 Phiếu Kiểm Tra Chất Lượng QC (Inspection)**
   - QC kiểm tra Mẫu đầu tiên (sinh mã Pallet) & Kiểm tra nối tiếp theo Pallet qua các công đoạn.

4. **📶 Luồng Dự Phòng Thay Thế**
   - Quét thẻ Pallet QR khi mất mạng, xử lý phiếu ngoại lệ.

5. **📊 Báo Cáo QC Thời Gian Thực**
   - Tự động tổng hợp lỗi theo công đoạn và người kiểm tại `/admin/reports`.

--- slide ---

<!-- SLIDE 3 -->
# 👥 BẢN ĐỒ USE CASES THEO VAI TRÒ

👷 **1. Công Nhân Sản Xuất (Tại Xưởng)**
- Chọn mã Pallet đã được QC kiểm mẫu đầu để tạo phiếu bàn giao luân chuyển.
- Xác nhận nhận bán thành phẩm vào tổ của mình hoặc nhận lại chi tiết lỗi trả về.

🔍 **2. Nhân Viên Kiểm Định QC**
- Thực hiện kiểm tra Mẫu đầu tiên (First Sample) kích hoạt Thẻ Pallet.
- Kiểm đếm số lượng bàn giao, lập phiếu trả hàng khi phát hiện lỗi.
- Quét mã Pallet để kiểm tra nối tiếp tại các công đoạn sau (Routine/Final).

🏭 **3. Phòng Kế Hoạch & Kỹ Thuật**
- Quản lý BOM định mức chi tiết sản phẩm.
- Lập Lệnh SX tự động kéo chi tiết BOM từ PO khách hàng.

📊 **4. Ban Giám Đốc & Quản Lý QLCL**
- Ban hành bộ tiêu chuẩn kỹ thuật HDKT / SOS / CTQ.
- Giám sát báo cáo chất lượng thời gian thực (`/admin/reports`).

--- slide ---

<!-- SLIDE 4 -->
# 🔄 QUY TRÌNH TỔNG THỂ TẠO PHIẾU & VẬN HÀNH THEO PALLET

```
[1. PO Khách Hàng] ➔ [2. Lệnh SX Tự Kéo BOM] ➔ [3. QC Kiểm Mẫu Đầu ➜ Sinh Mã Pallet]
                                                                        │
                                                                        ▼
[6. Báo Cáo QC Tổng Hợp] ◄── [5. QC Đo Kiểm Nối Tiếp] ◄── [4. Bàn Giao & Nhận/Trả]
```

### 6 Bước Vận Hành Chuẩn:
1. **Bước 1 (Sale):** Tạo Đơn bán hàng PO (`PO-2026-0801` - Khách hàng Atlas International).
2. **Bước 2 (Kế hoạch):** Mở Lệnh SX, chọn PO ➜ Hệ thống tự động bóc tách BOM chi tiết (Mặt bàn, Chân tủ...).
3. **Bước 3 (QC Kiểm Mẫu Đầu):** QC kiểm tra mẫu đầu tiên tại xưởng ➜ Kích hoạt **Mã Thẻ Pallet (`PLT0012`)**.
4. **Bước 4 (Bàn Giao Theo Pallet):** Công nhân chọn mã `PLT0012` tạo bàn giao ➜ QC duyệt ➜ CĐ nhận bấm nhận hàng (hoặc trả hàng nếu có lỗi).
5. **Bước 5 (QC Kiểm Tra Nối Tiếp):** QC công đoạn sau quét mã `PLT0012` để kiểm tra nối tiếp/Routine/Final.
6. **Bước 6 (Báo cáo):** Dữ liệu tự động đổ về Dashboard `/admin/reports` theo đúng người kiểm và công đoạn.

--- slide ---

<!-- SLIDE 5 -->
# ✅ LUỒNG CHUẨN (HAPPY CASE): BÀN GIAO THEO MÃ PALLET

### Kịch bản luân chuyển chuẩn không phát sinh lỗi:
- **Bối cảnh:** Tổ Tạo Phôi 1 hoàn thành 100 cái `Mặt bàn` (Lệnh SX `APT-0041-01`), QC kiểm tra mẫu đầu tiên gắn mã Pallet `PLT0012`.

```
[QC: hai.dq]             [SX Giao: thuy.ntt]         [QC Duyệt]             [SX Nhận: tinh.bt]
     │                           │                        │                          │
     ├─ 1. Kiểm Mẫu Đầu ────────>│                        │                          │
     │  Sinh Mã Pallet PLT0012   │                        │                          │
     │                           ├─ 2. Giao theo Pallet ─>│                          │
     │                           │  Chọn mã PLT0012       │                          │
     │                           │                        ├─ 3. Duyệt 100% Đạt ─────>│
     │                           │                        │  SL nhận: 100, Lỗi: 0    │
     │                           │                        │                          ├─ 4. Nhận hàng
     │                           │                        │                          │  Tăng kho Định Hình
```

--- slide ---

<!-- SLIDE 6 -->
# ⚠️ LUỒNG DỰ PHÒNG THAY THẾ & XỬ LÝ HÀNG LỖI

### 1. Phát Hiện Hàng Lỗi ➜ Tạo Phiếu Trả Hàng
- Giao 100 `Mặt bàn` theo Pallet `PLT0012`, QC phát hiện 98 đạt, 2 cái nứt tét.
- QC nhận 98 cái vào Định Hình và bấm **"Tạo phiếu trả hàng"** gửi 2 cái lỗi `APP-001` về Tạo Phôi theo đúng mã Pallet `PLT0012`.

### 2. Mất Mạng Wifi / Sự Cố Thiết Bị
- Sử dụng hệ thống **Mã QR Dự Phòng (`/admin/backup-qrs`)** và **Thẻ Pallet cứng**.
- Ghi nhận mã lô offline ➜ Tự động đồng bộ đối soát khi có mạng trở lại.

### 3. Chuyển Giao Bất Thường / Gia Công Ngoài
- Sử dụng phân hệ **Phiếu ngoại lệ (`/admin/exception-deliveries`)** để quản lý các lô hàng chuyển gấp giữa các nhà máy.

--- slide ---

<!-- SLIDE 7 -->
# 🔬 QC KIỂM TRA NỐI TIẾP & KIỂM TRA LẠI THEO MÃ PALLET

### Cơ chế truy xuất nguồn gốc thông minh theo Pallet:
- **Truy xuất toàn bộ lịch sử:** Khi Pallet `PLT0012` sang Định Hình ➜ Lắp Ráp ➜ Sơn, QC chỉ cần quét mã Pallet để xem lại toàn bộ kết quả đo kiểm từ các công đoạn trước.
- **Kiểm tra định kỳ (Routine Inspection):** Đo đạc định kỳ theo mã Pallet và lưu lịch sử nhiều lần kiểm tra trên cùng 1 kiện hàng.
- **Kiểm tra xuất xưởng (Final Inspection):** Nghiệm thu toàn bộ thùng hàng dựa trên dữ liệu tổng hợp của từng Pallet thành phần.

--- slide ---

<!-- SLIDE 8 -->
# 📊 BÁO CÁO CHẤT LƯỢNG QC THỜI GIAN THỰC (`/admin/reports`)

### Tổng hợp tức thì dữ liệu chất lượng toàn nhà máy:
- **Minh bạch theo công đoạn & Nhà máy:** Tạo Phôi (IQC), Định Hình - Lắp Ráp (PQC1), Sơn - Đóng Gói (PQC2), Xuất xưởng (FQC).
- **Đúng người - Đúng trách nhiệm:** Tự động gắn tên nhân sự QC phụ trách (`Đặng Quý Hải`, `Hà Đình Thành`, `Hồ Sỹ Khẩn`...).
- **Truy vết theo Pallet:** Nhấp vào từng dòng báo cáo để xem chi tiết mã Pallet, ảnh chụp vết nứt và kích thước đo thực tế.

--- slide ---

<!-- SLIDE 9 -->
# 🚀 KẾ HOẠCH TRIỂN KHAI 3 GIAI ĐOẠN

🔵 **GIAI ĐOẠN 1: CHUẨN BỊ & THIẾT LẬP (Tuần 1 - 2)**
- Cấu hình Master Data (Nhà máy, Dòng hàng, Khách hàng, AQL).
- Số hóa 21 mã lỗi G7 và ban hành bộ tài liệu HDKT, SOS, CTQ.

🟢 **GIAI ĐOẠN 2: THÍ ĐIỂM & ĐÀO TẠO TẠI PX1 (Tuần 3 - 4)**
- Chạy thử nghiệm Lệnh SX APT-0041-01 tại Phân Xưởng 1.
- Đào tạo công nhân & QC thao tác kiểm mẫu đầu, gắn mã Pallet và bàn giao trên App.

🟣 **GIAI ĐOẠN 3: GO-LIVE TOÀN DIỆN (Tuần 5 - 6)**
- Nhân rộng toàn bộ 15 tổ sản xuất (PX1, PX2, Nhà Máy 3 & FQC).
- Cắt bỏ hoàn toàn phiếu giấy, 100% điều hành qua báo cáo Realtime.

--- slide ---

<!-- SLIDE 10 -->
# 🎯 SO SÁNH TRƯỚC & SAU KHI ỨNG DỤNG SMARTFLOW

| Tiêu Chí | Trước Khi Có SmartFlow | Sau Khi Ứng Dụng SmartFlow |
| :--- | :--- | :--- |
| **Bàn giao hàng hóa** | Ghi sổ tay, dễ thất lạc số lượng | Bàn giao theo Thẻ Pallet, 3 bên xác nhận minh bạch |
| **Kiểm soát hàng lỗi** | Hàng lỗi lẫn lộn, khó quy trách nhiệm | Tạo phiếu trả hàng ngay tại trạm, gắn mã lỗi G7 rõ ràng |
| **Truy xuất nguồn gốc** | Mất dấu phôi gỗ khi qua nhiều tổ | Quét mã Pallet xem lại toàn bộ lịch sử đo kiểm các CĐ trước |
| **Báo cáo chất lượng** | Mất 2-3 tiếng cuối ngày nhập lại Excel | Tự động tổng hợp thời gian thực chỉ sau 1 cú click |

--- slide ---

<!-- SLIDE 11 -->
# 💬 TRÂN TRỌNG CẢM ƠN!

### HỆ THỐNG QUẢN LÝ SẢN XUẤT & QLCL SMARTFLOW 4.0
- **Hỗ trợ kỹ thuật:** Phòng QLCL & Đội Ngũ Dự Án
- **Truy cập hệ thống:** `http://localhost:3000/admin`
- **DỰ ÁN SMARTFLOW 2026**
