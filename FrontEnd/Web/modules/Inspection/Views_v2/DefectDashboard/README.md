# Quality Defect Analytics Dashboard (ERP G7)

## 📌 Tổng quan
Thư mục chuyên biệt lưu trữ toàn bộ các thành phần, giao diện, logic và styles phục vụ cho **Dashboard Thống kê số lượng lỗi (QLCL)** thuộc hệ thống **ERP G7**.

Module được thiết kế độc lập, không phụ thuộc và không làm ảnh hưởng đến các thư mục/tính năng khác trong hệ thống.

---

## 📁 Cấu trúc thư mục (`DefectDashboard/`)

```
DefectDashboard/
├── DefectDashboardView.jsx       # Component Dashboard chính
├── index.js                      # Barrel export
├── README.md                     # Tài liệu kiến trúc & hướng dẫn
├── components/                   # Các khối UI con
│   ├── KpiCardsRow.jsx           # 1 hàng 5 thẻ KPI (Tổng phiếu, SP, Lỗi, Tỷ lệ %, Nhóm max)
│   ├── DashboardToolbar.jsx      # Thanh công cụ ERP (Search, Filter, Export CSV, Dropdowns)
│   ├── TrendLineChart.jsx        # [Z1] Xu hướng tỷ lệ lỗi theo ngày (Line Chart)
│   ├── StageBarChart.jsx         # [Z2] Tỷ lệ lỗi theo công đoạn (Horizontal Bar Chart)
│   ├── ParetoDefectChart.jsx     # [Z3] Pareto lỗi trọng yếu (Composed: Bar + Cumulative Line)
│   └── CategoryDonutChart.jsx    # [Z4] Cơ cấu theo nhóm lỗi (Donut Chart + Mini Table)
├── hooks/
│   └── useDefectAnalytics.js     # Custom React Hook quản lý dữ liệu, bộ lọc & cross-filter
└── styles/
    └── DefectDashboard.css       # Quy chuẩn CSS 16:9 Zero-Scroll, màu sắc & bố cục Z-Pattern
```

---

## 🎨 Nguyên tắc thiết kế (Design Guidelines)
1. **Zero-Scroll Desktop 16:9:**
   - Toàn bộ nội dung gói gọn trong `100%` viewport desktop (1920x1080 & 1366x768).
   - Không phát sinh thanh cuộn dọc/ngang ở khung nhìn chuẩn.
2. **Luồng đọc mắt chữ Z (Z-Reading Flow):**
   - **Đỉnh:** 5 Thẻ KPI tóm tắt -> Toolbar ERP.
   - **Z1 (Trái trên ~60%):** Xu hướng tỷ lệ lỗi theo thời gian (`SUM(defects)/SUM(products)*100`).
   - **Z2 (Phải trên ~40%):** Tỷ lệ lỗi theo từng công đoạn (sắp xếp giảm dần, click để lọc).
   - **Z3 (Trái dưới ~60%):** Pareto lỗi trọng yếu (xác định 80% nguyên nhân lỗi).
   - **Z4 (Phải dưới ~40%):** Cơ cấu theo nhóm lỗi (Donut chart + bảng số lượng & % chi tiết).
3. **Bảng màu ERP G7:**
   - Tone nền: Sáng ngả beige `#faf9f6`.
   - Card trắng `#ffffff`, viền mảnh `#e8e2dc`, bo góc `8px`.
   - Màu chính: Nâu đậm `#4b301e` / `#7B5233`.
   - Màu cảnh báo: Đỏ `#dc2626` (chỉ dùng cho số lượng lỗi, tỷ lệ lỗi và cảnh báo).

---

## 🔌 Hướng dẫn sử dụng / Tích hợp

Có thể import và sử dụng trực tiếp trong bất kỳ View nào hoặc gắn vào Router:

```jsx
import DefectDashboardView from '@modules/Inspection/Views/DefectDashboard';

function MyQualityPage() {
  return <DefectDashboardView stage="Sơn" />;
}
```
