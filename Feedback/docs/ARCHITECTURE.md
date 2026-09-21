# Kiến Trúc Hệ Thống SmartFlow Feedback (Quanly_Feedback)

## 1. Tổng quan hệ thống
Hệ thống **SmartFlow Feedback** là phân hệ chuyên biệt hoạt động trên cổng mạng `3001` (`http://localhost:3001`), nằm ngang cấp với phân hệ `Claim`. Phân hệ này phục vụ công tác giám sát, tiếp nhận, xử lý và phản hồi các sự cố dừng chuyền, bất thường chất lượng và biên bản cuộc họp được khởi tạo từ ứng dụng Mobile (`/quick-report-create` - MB37).

---

## 2. Mô hình liên thông dữ liệu & CSDL
- **CSDL trung tâm:** Microsoft SQL Server (`SmartFlow_v5`)
- **Bảng dữ liệu chính:** `quick_reports`
- **Luồng dữ liệu thời gian thực:**
  1. Người dùng / QC tại hiện trường dùng Mobile (`cổng 3000` hoặc thiết bị cầm tay) vào `/quick-report-create` để lập Báo cáo vấn đề / Biên bản cuộc họp kèm ảnh chụp.
  2. Báo cáo được gửi qua API `POST /api/v1/quick-reports/` lưu trực tiếp vào bảng `quick_reports`.
  3. Cán bộ quản lý QC / Giám đốc mở Feedback Portal tại `http://localhost:3001` xem danh sách cập nhật ngay lập tức.
  4. Quản lý xem chi tiết, xem ảnh phóng to, dùng AI Local Gemini gợi ý giải pháp, phê duyệt hoặc từ chối phiếu.
  5. Trạng thái và phản hồi được lưu trực tiếp vào `quick_reports` trong CSDL `SmartFlow_v5`.

---

## 3. Cấu trúc thư mục
```
Feedback/
├── FrontEnd/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.jsx               # Điều phối routing
│   │   │   └── bootstrap.jsx         # Entrypoint React 19
│   │   ├── modules/
│   │   │   └── feedback/
│   │   │       ├── views/
│   │   │       │   └── FeedbackOverviewView.jsx  # Màn hình giao diện chuẩn /admin/quality
│   │   │       ├── components/
│   │   │       │   ├── FeedbackDetailModal.jsx   # Modal xem chi tiết & xử lý
│   │   │       │   ├── FeedbackFilterBar.jsx     # Bộ lọc đa năng
│   │   │       │   └── FeedbackStatsCards.jsx    # Thẻ KPI thống kê
│   │   │       └── services/
│   │   │           └── feedback.service.js       # Gọi API backend /quick-reports
│   │   ├── shared/
│   │   │   ├── layouts/              # FeedbackLayout, Header, Sidebar
│   │   │   ├── components/           # ToastContext, ImageLightboxModal
│   │   │   └── styles/               # feedback.css
│   │   ├── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js                # Port 3001 + Proxy /api sang Backend 8000
└── docs/
    ├── ARCHITECTURE.md
    └── SETUP.md
```
