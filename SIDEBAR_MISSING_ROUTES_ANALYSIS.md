# 📊 Phân tích Routes chưa có trong Sidebar

## 🔍 Tổng quan

Đã kiểm tra toàn bộ routes trong `App.jsx` và so sánh với sidebar hiện tại.

---

## ❌ Routes CHƯA CÓ trong Sidebar

### **1. Quản lý hệ thống**
- ✅ `/admin/screens` - Có trong sidebar
- ✅ `/admin/iso-processes` - Có trong sidebar  
- ✅ `/admin/feedback` - Có trong sidebar
- ✅ `/admin/data` - Có trong sidebar
- ✅ `/admin/users` - Có trong sidebar (Quản lý tài khoản)
- ❌ `/admin/monitor` - **THIẾU** (SystemMonitor - Giám sát hệ thống)
- ❌ `/admin/screens/bugs` - **THIẾU** (ScreenBugManagement)
- ❌ `/admin/screens/progress` - **THIẾU** (ProjectProgress - Tiến độ dự án)
- ❌ `/admin/iso-documents` - **THIẾU** (ISODocumentList - Quản lý mẫu tài liệu)

### **2. Quản lý nhân sự**
- ✅ `/admin/hr/employees` - Có trong sidebar
- ✅ `/admin/users/positions` - Có trong sidebar
- ✅ `/admin/hr/org-chart` - Có trong sidebar
- ❌ `/admin/users/departments` - **THIẾU** (DepartmentManagement - Quản lý phòng ban)

### **3. Quản lý sản xuất**
- ✅ `/admin/plan` - Có trong sidebar
- ✅ `/admin/delivery-tracking` - Có trong sidebar
- ✅ `/admin/exception-deliveries` - Có trong sidebar
- ✅ `/admin/manufacture-dashboard` - Có trong sidebar
- ✅ `/admin/backup-qrs` - Có trong sidebar
- ❌ `/admin/products` - **THIẾU** (ManufactureProducts - BOM sản phẩm)
- ❌ `/admin/orders` - **THIẾU** (ManufactureOrders - Đơn hàng)

### **4. Quản lý chất lượng**
- ✅ `/admin/quality-records` - Có trong sidebar
- ✅ `/admin/defects` - Có trong sidebar
- ✅ `/admin/claims` - Có trong sidebar
- ✅ `/admin/feedback?type=quality` - Có trong sidebar (CAPA)
- ✅ `/admin/reports` - Có trong sidebar
- ✅ `/admin/handovers` - Có trong sidebar
- ✅ `/admin/hotspots` - Có trong sidebar
- ✅ `/admin/equipment` - Có trong sidebar
- ❌ `/admin/logs` - **THIẾU** (IncidentLogs - Nhật ký sự cố)

### **5. Quản lý kinh doanh**
- ✅ `/admin/shipments` - Có trong sidebar
- ✅ `/admin/prices` - Có trong sidebar
- ✅ `/admin/purchase-requisitions` - Có trong sidebar
- ✅ `/admin/purchase-order-items` - Có trong sidebar

### **6. Quản lý kỹ thuật**
- ✅ `/admin/products` - Có trong sidebar (Bom sản phẩm)
- ❌ Nhưng đang ở "Quản lý sản xuất" trong routes, nên có trong sidebar ở "Quản lý kỹ thuật"

### **7. Bảo trì - cơ sở hạ tầng**
- ✅ `/admin/machines` - Có trong sidebar
- ✅ `/admin/machines/history` - Có trong sidebar
- ✅ `/admin/machines/training` - Có trong sidebar
- ❌ `/admin/equipment/categories` - **THIẾU** (EquipmentCategories - Danh mục thiết bị)
- ❌ `/admin/equipment/history` - **THIẾU** (EquipmentHistory - Lịch sử thiết bị)
- ❌ `/admin/equipment/training` - **THIẾU** (EquipmentTraining - Đào tạo thiết bị)

### **8. Quản lý KPI**
- ✅ `/admin/kpi` - Có trong sidebar
- ❌ `/admin/kpi/checklist` - **THIẾU** (KPIChecklist)
- ❌ `/admin/kpi/list` - **THIẾU** (KPIItems - Danh sách KPI)
- ❌ `/admin/kpi/rules` - **THIẾU** (KPIRules - Quy tắc KPI)
- ❌ `/admin/kpi/feedback` - **THIẾU** (KPIFeedback - Phản hồi KPI)

---

## 📋 Danh sách đầy đủ routes THIẾU

| STT | Route | Component | Nhóm đề xuất | Tên đề xuất |
|-----|-------|-----------|--------------|-------------|
| 1 | `/admin/monitor` | SystemMonitor | Quản lý hệ thống | Giám sát hệ thống |
| 2 | `/admin/screens/bugs` | ScreenBugManagement | Quản lý hệ thống | Quản lý lỗi màn hình |
| 3 | `/admin/screens/progress` | ProjectProgress | Quản lý hệ thống | Tiến độ dự án |
| 4 | `/admin/iso-documents` | ISODocumentList | Hồ sơ ISO (mới) | Quản lý mẫu tài liệu |
| 5 | `/admin/users/departments` | DepartmentManagement | Quản lý nhân sự | Quản lý phòng ban |
| 6 | `/admin/logs` | IncidentLogs | Quản lý chất lượng | Nhật ký sự cố |
| 7 | `/admin/equipment/categories` | EquipmentCategories | Bảo trì - CSHT | Danh mục thiết bị |
| 8 | `/admin/equipment/history` | EquipmentHistory | Bảo trì - CSHT | Lịch sử thiết bị |
| 9 | `/admin/equipment/training` | EquipmentTraining | Bảo trì - CSHT | Đào tạo thiết bị |
| 10 | `/admin/kpi/checklist` | KPIChecklist | Quản lý KPI | Checklist KPI |
| 11 | `/admin/kpi/list` | KPIItems | Quản lý KPI | Danh sách KPI |
| 12 | `/admin/kpi/rules` | KPIRules | Quản lý KPI | Quy tắc KPI |
| 13 | `/admin/kpi/feedback` | KPIFeedback | Quản lý KPI | Phản hồi KPI |

---

## 💡 Đề xuất cấu trúc sidebar mới

### **Quản lý hệ thống**
```
├─ Danh sách màn hình (/admin/screens)
├─ Quản lý lỗi màn hình (/admin/screens/bugs) [MỚI]
├─ Tiến độ dự án (/admin/screens/progress) [MỚI]
├─ Quy trình nghiệp vụ (/admin/iso-processes)
├─ Theo dõi góp ý (/admin/feedback)
├─ Đóng gói dữ liệu (/admin/data)
├─ Quản lý tài khoản (/admin/users)
└─ Giám sát hệ thống (/admin/monitor) [MỚI]
```

### **Quản lý nhân sự**
```
├─ Danh sách nhân viên (/admin/hr/employees)
├─ Quản lý chức vụ (/admin/users/positions)
├─ Quản lý phòng ban (/admin/users/departments) [MỚI]
└─ Sơ đồ tổ chức (/admin/hr/org-chart)
```

### **Hồ sơ ISO** [GROUP MỚI]
```
├─ Quản lý mẫu tài liệu (/admin/iso-documents) [MỚI]
└─ Quy trình nghiệp vụ (/admin/iso-processes) [DI CHUYỂN từ Quản lý hệ thống]
```

### **Quản lý chất lượng**
```
├─ Hồ sơ chất lượng (/admin/quality-records)
├─ Danh sách lỗi (/admin/defects)
├─ Claim khách hàng (/admin/claims)
├─ Quản lý CAPA (/admin/feedback?type=quality)
├─ Báo cáo kiểm tra (/admin/reports)
├─ Danh sách bàn giao (/admin/handovers)
├─ Điểm nóng cần chú ý (/admin/hotspots)
├─ Quản lý thiết bị (/admin/equipment)
└─ Nhật ký sự cố (/admin/logs) [MỚI]
```

### **Bảo trì - cơ sở hạ tầng**
```
├─ Danh sách thiết bị (/admin/machines)
├─ Lịch sử bảo trì (/admin/machines/history)
├─ Hướng dẫn sử dụng (/admin/machines/training)
├─ Danh mục thiết bị (/admin/equipment/categories) [MỚI]
├─ Lịch sử thiết bị (/admin/equipment/history) [MỚI]
└─ Đào tạo thiết bị (/admin/equipment/training) [MỚI]
```

### **Quản lý KPI**
```
Chuyển từ link đơn thành group:
├─ Báo cáo KPI (/admin/kpi)
├─ Checklist KPI (/admin/kpi/checklist) [MỚI]
├─ Danh sách KPI (/admin/kpi/list) [MỚI]
├─ Quy tắc KPI (/admin/kpi/rules) [MỚI]
└─ Phản hồi KPI (/admin/kpi/feedback) [MỚI]
```

---

## 🎯 Ưu tiên thêm vào sidebar

### **Ưu tiên cao (cần thêm ngay)**
1. ✅ `/admin/monitor` - Giám sát hệ thống (quan trọng cho IT)
2. ✅ `/admin/users/departments` - Quản lý phòng ban (quan trọng cho HR)
3. ✅ `/admin/iso-documents` - Quản lý mẫu tài liệu (quan trọng cho ISO)
4. ✅ `/admin/logs` - Nhật ký sự cố (quan trọng cho QC)

### **Ưu tiên trung bình**
5. `/admin/screens/bugs` - Quản lý lỗi màn hình
6. `/admin/screens/progress` - Tiến độ dự án
7. `/admin/equipment/categories` - Danh mục thiết bị
8. `/admin/equipment/history` - Lịch sử thiết bị
9. `/admin/equipment/training` - Đào tạo thiết bị

### **Ưu tiên thấp (có thể để sau)**
10. `/admin/kpi/checklist` - Checklist KPI
11. `/admin/kpi/list` - Danh sách KPI
12. `/admin/kpi/rules` - Quy tắc KPI
13. `/admin/kpi/feedback` - Phản hồi KPI

---

## 🔧 Routes chỉ dùng nội bộ (KHÔNG cần thêm vào sidebar)

Các routes này là detail/edit pages, không cần menu riêng:
- `/admin/users/create` - Tạo user mới
- `/admin/users/edit/:id` - Sửa user
- `/admin/users/permissions/:id` - Phân quyền user
- `/admin/screens/:id` - Chi tiết màn hình
- `/admin/quality-records/:id` - Chi tiết hồ sơ chất lượng
- `/admin/iso-documents/edit/:id` - Sửa tài liệu ISO
- `/admin/iso-processes/edit/:id` - Sửa quy trình ISO
- `/admin/plan/:id` - Chi tiết kế hoạch
- `/admin/plan/create` - Tạo kế hoạch mới
- `/admin/products/:id` - Chi tiết sản phẩm
- `/admin/products/create` - Tạo sản phẩm mới
- `/admin/progress/:id` - Tiến độ sản xuất
- `/admin/orders/create` - Tạo đơn hàng
- `/admin/purchase-requisitions/:id` - Chi tiết đơn đặt mua
- `/admin/equipment/detail/:id` - Chi tiết thiết bị
- `/admin/equipment/training/detail/:id` - Chi tiết đào tạo
- `/admin/machines/detail/:id` - Chi tiết máy móc
- `/admin/equipment/handover/:id` - Bàn giao thiết bị

---

## 📊 Thống kê

- **Tổng routes trong App.jsx**: ~60 routes
- **Routes có trong sidebar**: ~30 routes
- **Routes THIẾU trong sidebar**: **13 routes**
- **Routes detail/edit (không cần sidebar)**: ~17 routes

---

## ✅ Khuyến nghị

### **Ngay lập tức**
1. Thêm group "Hồ sơ ISO" với:
   - Quản lý mẫu tài liệu (`/admin/iso-documents`)
   - Quy trình nghiệp vụ (`/admin/iso-processes`) - di chuyển từ "Quản lý hệ thống"

2. Thêm vào "Quản lý hệ thống":
   - Giám sát hệ thống (`/admin/monitor`)

3. Thêm vào "Quản lý nhân sự":
   - Quản lý phòng ban (`/admin/users/departments`)

4. Thêm vào "Quản lý chất lượng":
   - Nhật ký sự cố (`/admin/logs`)

### **Giai đoạn 2**
5. Mở rộng "Bảo trì - CSHT" với các trang thiết bị
6. Chuyển "Quản lý KPI" từ link thành group với 5 sub-items

### **Lưu ý**
- Cần xem xét lại vị trí của "Quy trình nghiệp vụ" - hiện ở "Quản lý hệ thống" nhưng có thể phù hợp hơn ở "Hồ sơ ISO"
- "Giám sát hệ thống" (`/admin/monitor`) đang được gọi khi click vào group header "Quản lý hệ thống" nhưng không có trong menu
