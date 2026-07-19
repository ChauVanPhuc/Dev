# Cập nhật Module Hồ sơ - Nhân sự theo Mockup

## ✅ Thay đổi đã thực hiện

### 1. Tạo trang tổng hợp với Tab Navigation
**File mới:** `FrontEnd/Web/modules/Auth/Views/HRManagementView.jsx`

Trang này hiển thị:
- Header chung: "Hồ sơ - nhân sự"
- 5 tabs ngang:
  1. Sơ đồ tổ chức
  2. Sơ đồ cấp bậc
  3. Sơ đồ nhân sự
  4. Sơ đồ cấu trúc nhà máy
  5. Danh sách nhân viên

### 2. Cập nhật Routing
**File:** `FrontEnd/Web/Shared/app/App.jsx`

Thay đổi:
- **Trước:** 5 routes riêng biệt
  - `/admin/hr/org-chart`
  - `/admin/hr/hierarchy`
  - `/admin/hr/personnel`
  - `/admin/hr/factory`
  - `/admin/hr/employees`

- **Sau:** 1 route duy nhất
  - `/admin/hr` → Hiển thị HRManagementView với tabs

### 3. Cập nhật Sidebar Menu
**File:** `FrontEnd/Web/Shared/Views/components/layout/Sidebar.jsx`

Thay đổi:
- **Trước:** Menu group "Hồ sơ - nhân sự" với 5 submenu items
- **Sau:** Menu link đơn "Hồ sơ - nhân sự" → dẫn đến `/admin/hr`

### 4. Cập nhật các View Components
Loại bỏ page header khỏi tất cả các view vì đã có header chung:

- ✅ `OrgChartView.jsx` - Bỏ header "Sơ đồ tổ chức"
- ✅ `HierarchyChartView.jsx` - Bỏ header "Sơ đồ cấp bậc"
- ✅ `PersonnelChartView.jsx` - Bỏ header "Sơ đồ nhân sự"
- ✅ `FactoryStructureView.jsx` - Bỏ header "Sơ đồ cấu trúc nhà máy"
- ✅ `EmployeeListView.jsx` - Bỏ header "Danh sách nhân sự"

## 🎨 Giao diện theo Mockup

### Khi nhấn "Hồ sơ - nhân sự" (Ảnh 1)
```
┌─────────────────────────────────────────────────┐
│ Hồ sơ - nhân sự                                 │
│ Quản lý thông tin về cấu trúc tổ chức, nhân sự  │
├─────────────────────────────────────────────────┤
│ [Sơ đồ tổ chức] [Sơ đồ cấp bậc] [Sơ đồ nhân sự]│
│ [Sơ đồ cấu trúc nhà máy] [Danh sách nhân viên]  │
├─────────────────────────────────────────────────┤
│                                                 │
│         Nội dung tab đang active                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Tab "Sơ đồ tổ chức" (Ảnh 2 - Bên trái)
- Hiển thị sơ đồ cây phân cấp
- Chế độ xem: Sơ đồ / Bảng
- Toolbar: Tìm kiếm, Lọc, Thêm mới, Xuất dữ liệu

### Tab "Danh sách nhân viên" (Ảnh 3)
- Hiển thị bảng danh sách nhân viên
- Các cột: Mã NV, Phòng ban, Vị trí, Bộ phận, Ngày vào làm, Thao tác
- Toolbar: Tìm kiếm, Lọc, Thêm mới, Import/Export Excel
- Modal "NS05: Thông tin nhân sự" khi nhấn Thêm mới/Sửa

## 🔄 Luồng hoạt động

1. **Click menu "Hồ sơ - nhân sự"** → Chuyển đến `/admin/hr`
2. **HRManagementView render** → Hiển thị header + tabs
3. **Tab mặc định** → "Sơ đồ tổ chức" (activeTab = 'org-chart')
4. **Click tab khác** → Thay đổi activeTab, render component tương ứng
5. **Mỗi tab** → Hiển thị toolbar riêng + nội dung riêng

## 📝 Lưu ý

- Tất cả các view components vẫn giữ nguyên chức năng CRUD
- Chỉ thay đổi cách hiển thị (từ trang riêng → tab trong trang chung)
- Backend API không thay đổi
- Các modal (NS02, NS03, NS05) vẫn hoạt động bình thường

## 🚀 Kiểm tra

1. Khởi động ứng dụng
2. Click menu "Hồ sơ - nhân sự" ở sidebar
3. Kiểm tra hiển thị 5 tabs ngang
4. Click từng tab để kiểm tra chuyển đổi
5. Kiểm tra chức năng CRUD trên mỗi tab

## ✨ Kết quả

Giao diện giờ đây khớp với mockup:
- ✅ Menu đơn giản hơn (1 item thay vì 5)
- ✅ Tabs ngang như thiết kế
- ✅ Header chung cho toàn bộ module
- ✅ Dễ dàng chuyển đổi giữa các loại sơ đồ
- ✅ Trải nghiệm người dùng tốt hơn
