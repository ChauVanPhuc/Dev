# 📘 HƯỚNG DẪN: DYNAMIC SCREEN METADATA

## 🎯 MỤC ĐÍCH

Thay vì **hardcode** thông tin màn hình (Screen Code, Title, Subtitle) trong từng component, hệ thống sẽ **tự động lấy từ database** dựa trên cấu hình trong `/admin/screens`.

### **Lợi ích:**
✅ Cập nhật thông tin màn hình tập trung tại 1 nơi  
✅ Không cần sửa code khi đổi tên màn hình  
✅ Đồng bộ giữa cấu hình và hiển thị thực tế  
✅ Hỗ trợ đa ngôn ngữ trong tương lai  

---

## 🔧 CÁCH HOẠT ĐỘNG

### **Luồng dữ liệu:**

```
1. Admin cấu hình màn hình tại /admin/screens
   ↓
2. Lưu vào database (screens table):
   - current_code: "AD13"
   - title: "Hồ sơ chất lượng"
   - subtitle: "Nhật ký và hồ sơ kiểm soát chất lượng"
   - route_path: "/admin/quality-records"
   ↓
3. Component gọi useScreenMetadataCached('/admin/quality-records')
   ↓
4. Hook fetch data từ API và cache
   ↓
5. Component nhận { screenCode, title, subtitle }
   ↓
6. Hiển thị lên Header
```

---

## 📦 CÀI ĐẶT

### **1. Hook đã tạo sẵn**

**File**: `M:\ERP\FrontEnd\Web\Shared\hooks\useScreenMetadata.js`

**2 Variants:**

#### **A. useScreenMetadata** - Basic version
```javascript
import { useScreenMetadata } from '@webShared/hooks/useScreenMetadata';

const { screenCode, title, subtitle, loading, error } = useScreenMetadata('/admin/quality-records');
```

#### **B. useScreenMetadataCached** - Recommended (có cache)
```javascript
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const { screenCode, title, subtitle, loading, error } = useScreenMetadataCached('/admin/quality-records');
```

**Khuyến nghị**: Dùng `useScreenMetadataCached` để tránh gọi API nhiều lần.

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

### **Bước 1: Import hook**

```javascript
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
```

### **Bước 2: Gọi hook trong component**

```javascript
const MyView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/my-route');
  
  // ... rest of component
};
```

### **Bước 3: Cập nhật header khi metadata sẵn sàng**

```javascript
useEffect(() => {
  if (screenCode && title) {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode);
  }
}, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
```

---

## 📝 VÍ DỤ HOÀN CHỈNH

### **TRƯỚC (Hardcode):**

```javascript
const QualityRecordsListView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  useEffect(() => {
    setCustomTitle("Hồ sơ chất lượng (PO)");
    setCustomSubtitle("Quản lý và xem hồ sơ chất lượng của các đơn hàng theo kế hoạch sản xuất.");
    setCustomScreenCode('AD13');
  }, []);
  
  return <div>...</div>;
};
```

### **SAU (Dynamic):**

```javascript
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const QualityRecordsListView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records');
  
  // Cập nhật header khi metadata sẵn sàng
  useEffect(() => {
    if (screenCode && title) {
      setCustomTitle(title);
      setCustomSubtitle(subtitle || '');
      setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  
  return <div>...</div>;
};
```

---

## 🗂️ CẤU HÌNH DATABASE

### **Bảng `screens` cần có:**

```sql
CREATE TABLE screens (
  id INT PRIMARY KEY,
  current_code VARCHAR(10),      -- "AD13"
  title VARCHAR(255),             -- "Hồ sơ chất lượng"
  subtitle TEXT,                  -- "Nhật ký và hồ sơ kiểm soát chất lượng"
  route_path VARCHAR(255) UNIQUE, -- "/admin/quality-records"
  platform VARCHAR(20),           -- "Web" | "Mobile"
  status VARCHAR(50),             -- "Hoàn thành" | "Mới thiết kế"
  -- ... other fields
);
```

### **Ví dụ data:**

```sql
INSERT INTO screens (current_code, title, subtitle, route_path, platform, status) VALUES
('AD13', 'Hồ sơ chất lượng', 'Nhật ký và hồ sơ kiểm soát chất lượng', '/admin/quality-records', 'Web', 'Hoàn thành'),
('AD13.1', 'Chi tiết hồ sơ chất lượng', 'Xem lịch sử bàn giao, kiểm tra đầu vào và kết quả QC chi tiết', '/admin/quality-records/:id', 'Web', 'Hoàn thành'),
('AD02', 'Danh sách màn hình', 'Hiển thị thông tin về các màn hình thuộc hệ thống', '/admin/screens', 'Web', 'Hoàn thành');
```

---

## 🔄 CACHE MANAGEMENT

### **Clear cache khi cần:**

```javascript
import { clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';

// Clear cache của 1 route cụ thể
clearScreenMetadataCache('/admin/quality-records');

// Clear toàn bộ cache
clearScreenMetadataCache();
```

### **Khi nào cần clear cache?**

1. Sau khi update screen trong `/admin/screens/:id`
2. Sau khi import/export screens
3. Khi phát hiện data không đồng bộ

### **Ví dụ: Clear cache sau khi save**

```javascript
const handleSaveScreen = async () => {
  await screenService.updateScreen(id, formData);
  
  // Clear cache để lần sau fetch lại data mới
  clearScreenMetadataCache(formData.route_path);
  
  showToast('Cập nhật màn hình thành công!');
};
```

---

## 📋 DANH SÁCH SCREENS CẦN CẬP NHẬT

### **Ưu tiên cao:**

- [x] **QualityRecordsListView** - `/admin/quality-records` (AD13)
- [ ] **QualityRecordsDetailView** - `/admin/quality-records/:id` (AD13.1)
- [ ] **ScreenManagementView** - `/admin/screens` (AD02)
- [ ] **ScreenDetailView** - `/admin/screens/:id` (AD03)
- [ ] **ScreenBugManagementView** - `/admin/screens/bugs` (AD06)
- [ ] **ProjectProgressView** - `/admin/screens/progress` (AD07)

### **Ưu tiên trung bình:**

- [ ] **DashboardView** - `/admin/dashboard` (AD01)
- [ ] **UserManagementView** - `/admin/users` (AD04)
- [ ] **DepartmentManagementView** - `/admin/departments` (AD05)
- [ ] **ProductionPlanView** - `/admin/plans` (MA02)
- [ ] **DeliveryManagementView** - `/admin/deliveries` (NS01)

### **Tất cả screens khác:**

```bash
# Tìm tất cả files có setCustomScreenCode
grep -r "setCustomScreenCode" Web/modules --include="*.jsx"

# Hoặc tìm hardcoded screen codes
grep -r "setCustomScreenCode\('AD" Web/modules --include="*.jsx"
```

---

## 🧪 TESTING

### **Test cases:**

1. **Load metadata thành công:**
   - Mở trang `/admin/quality-records`
   - Kiểm tra header hiển thị: "AD13 | Hồ sơ chất lượng"
   - Kiểm tra subtitle

2. **Metadata không tồn tại:**
   - Tạo route mới chưa có trong DB
   - Kiểm tra console warning
   - Kiểm tra header fallback

3. **Cache hoạt động:**
   - Mở trang lần 1 → check network tab (có API call)
   - Reload trang → check network tab (không có API call)
   - Metadata vẫn hiển thị đúng

4. **Clear cache:**
   - Update screen trong `/admin/screens/:id`
   - Clear cache
   - Reload trang → metadata cập nhật

---

## 🐛 TROUBLESHOOTING

### **Lỗi: "Screen metadata not found"**

**Nguyên nhân**: Route path trong DB không khớp với route thực tế

**Giải pháp**:
```javascript
// Kiểm tra route_path trong database
SELECT * FROM screens WHERE route_path = '/admin/quality-records';

// Nếu không có, thêm vào:
INSERT INTO screens (current_code, title, route_path, ...) VALUES (...);
```

### **Lỗi: Metadata không cập nhật sau khi save**

**Nguyên nhân**: Cache chưa được clear

**Giải pháp**:
```javascript
import { clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';

// Trong handleSave
await screenService.updateScreen(id, data);
clearScreenMetadataCache(data.route_path);
```

### **Lỗi: API gọi quá nhiều lần**

**Nguyên nhân**: Dùng `useScreenMetadata` thay vì `useScreenMetadataCached`

**Giải pháp**:
```javascript
// Thay đổi
import { useScreenMetadata } from '@webShared/hooks/useScreenMetadata';
// Thành
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
```

---

## 🔐 PERMISSIONS

### **API Endpoint cần có:**

```javascript
// GET /screens/
// Response:
[
  {
    "id": 13,
    "current_code": "AD13",
    "title": "Hồ sơ chất lượng",
    "subtitle": "Nhật ký và hồ sơ kiểm soát chất lượng",
    "route_path": "/admin/quality-records",
    "platform": "Web",
    "status": "Hoàn thành"
  }
]
```

### **Không cần permission đặc biệt:**

Hook này chỉ **đọc** metadata công khai, không cần kiểm tra quyền.

---

## 📊 PERFORMANCE

### **Metrics:**

- **First load**: ~100-200ms (API call)
- **Cached load**: ~0ms (instant)
- **Memory usage**: ~1KB per screen (negligible)

### **Optimization tips:**

1. Dùng `useScreenMetadataCached` thay vì `useScreenMetadata`
2. Preload metadata cho các routes thường dùng
3. Clear cache định kỳ (vd: mỗi 24h)

---

## 🚀 MIGRATION PLAN

### **Phase 1: Core screens (Week 1)**
- QualityRecordsListView ✅
- QualityRecordsDetailView
- ScreenManagementView
- ScreenDetailView

### **Phase 2: System screens (Week 2)**
- DashboardView
- UserManagementView
- DepartmentManagementView
- PositionManagementView

### **Phase 3: Module screens (Week 3-4)**
- Production module (MA*)
- Delivery module (NS*)
- Inspection module (KT*)
- All remaining screens

### **Phase 4: Testing & Cleanup (Week 5)**
- Remove all hardcoded metadata
- Update documentation
- Performance testing

---

## 📚 RELATED DOCS

- [Screen Management Guide](./TINH_CHINH_SCREENS_MOCKUP.md)
- [API Documentation](./API_DOCS.md)
- [Component Guidelines](./COMPONENT_GUIDELINES.md)

---

**Tài liệu này được tạo:** 16/07/2026  
**Phiên bản:** 1.0  
**Tác giả:** Cascade AI Assistant
