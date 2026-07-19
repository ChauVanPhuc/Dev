# 🎯 DYNAMIC SCREEN METADATA - TỔNG HỢP

## 📌 TỔNG QUAN

Hệ thống **Dynamic Screen Metadata** cho phép cấu hình thông tin màn hình (Screen Code, Title, Subtitle) tập trung tại `/admin/screens` và tự động áp dụng cho toàn bộ ứng dụng.

### **Vấn đề cũ:**
```javascript
// Hardcode trong từng component
useEffect(() => {
  setCustomTitle("Hồ sơ chất lượng");
  setCustomSubtitle("AD13 - Nhật ký và hồ sơ kiểm soát chất lượng");
  setCustomScreenCode('AD13');
}, []);
```

❌ Phải sửa code khi đổi tên màn hình  
❌ Không đồng bộ giữa cấu hình và hiển thị  
❌ Khó bảo trì khi có nhiều màn hình  

### **Giải pháp mới:**
```javascript
// Lấy từ database
const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records');

useEffect(() => {
  if (screenCode && title) {
    setCustomTitle(title);
    setCustomSubtitle(subtitle);
    setCustomScreenCode(screenCode);
  }
}, [screenCode, title, subtitle]);
```

✅ Cập nhật tập trung tại `/admin/screens`  
✅ Tự động đồng bộ toàn hệ thống  
✅ Dễ bảo trì và mở rộng  

---

## 📂 CẤU TRÚC FILES

```
FrontEnd/
├── Web/
│   └── Shared/
│       └── hooks/
│           └── useScreenMetadata.js          ← Hook chính
│
├── scripts/
│   └── migrate-to-dynamic-metadata.js        ← Script migration tự động
│
├── HUONG_DAN_DYNAMIC_SCREEN_METADATA.md      ← Hướng dẫn chi tiết
├── TINH_CHINH_SCREENS_MOCKUP.md              ← Phân tích mockup
└── README_DYNAMIC_METADATA.md                ← File này
```

---

## 🚀 QUICK START

### **1. Cấu hình màn hình trong database**

Truy cập `/admin/screens/new` hoặc `/admin/screens/:id`:

```
Mã màn hình: AD13 (auto-generate)
Tên màn hình: Hồ sơ chất lượng
Đường dẫn: /admin/quality-records
Mô tả: Nhật ký và hồ sơ kiểm soát chất lượng
Nền tảng: Web
Trạng thái: Hoàn thành
```

Nhấn **"Lưu đặc tả"** → Dữ liệu lưu vào database.

### **2. Sử dụng trong component**

```javascript
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const MyView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/my-route');
  
  // Cập nhật header
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

### **3. Kiểm tra kết quả**

Mở trang → Header hiển thị:
```
AD13 | Hồ sơ chất lượng
Nhật ký và hồ sơ kiểm soát chất lượng
```

---

## 🔧 MIGRATION

### **Tự động (Khuyến nghị):**

```bash
# Dry-run trước (không sửa file)
node scripts/migrate-to-dynamic-metadata.js --dry-run

# Apply changes
node scripts/migrate-to-dynamic-metadata.js
```

### **Thủ công:**

Xem hướng dẫn chi tiết tại: [HUONG_DAN_DYNAMIC_SCREEN_METADATA.md](./HUONG_DAN_DYNAMIC_SCREEN_METADATA.md)

---

## 📊 TIẾN ĐỘ MIGRATION

### **Đã hoàn thành:**
- [x] QualityRecordsListView (AD13)

### **Đang thực hiện:**
- [ ] QualityRecordsDetailView (AD13.1)
- [ ] ScreenManagementView (AD02)
- [ ] ScreenDetailView (AD03)

### **Chờ thực hiện:**
- [ ] 50+ screens khác

**Xem chi tiết:** [HUONG_DAN_DYNAMIC_SCREEN_METADATA.md - Migration Plan](./HUONG_DAN_DYNAMIC_SCREEN_METADATA.md#-migration-plan)

---

## 🎨 DEMO

### **Trước khi cấu hình:**

Header hiển thị:
```
AD13 | Hồ sơ chất lượng (PO)
Quản lý và xem hồ sơ chất lượng của các đơn hàng theo kế hoạch sản xuất.
```

### **Sau khi cấu hình lại trong `/admin/screens/13`:**

```
Tên màn hình: Hồ sơ Chất Lượng Sản Phẩm
Mô tả: Theo dõi và quản lý toàn bộ hồ sơ chất lượng
```

Nhấn **Lưu** → Header tự động cập nhật:
```
AD13 | Hồ sơ Chất Lượng Sản Phẩm
Theo dõi và quản lý toàn bộ hồ sơ chất lượng
```

✨ **Không cần sửa code!**

---

## 🔍 API ENDPOINTS

### **GET /screens/**

Lấy danh sách tất cả màn hình:

```json
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

### **GET /screens/:id**

Lấy chi tiết 1 màn hình:

```json
{
  "id": 13,
  "current_code": "AD13",
  "title": "Hồ sơ chất lượng",
  "subtitle": "Nhật ký và hồ sơ kiểm soát chất lượng",
  "route_path": "/admin/quality-records",
  "platform": "Web",
  "status": "Hoàn thành",
  "components": [...],
  "guides": [...],
  "bugs": [...]
}
```

### **PUT /screens/:id**

Cập nhật màn hình:

```json
{
  "title": "Hồ sơ Chất Lượng Sản Phẩm",
  "subtitle": "Theo dõi và quản lý toàn bộ hồ sơ chất lượng",
  "route_path": "/admin/quality-records"
}
```

---

## 🧪 TESTING

### **Test Case 1: Load metadata thành công**

```javascript
// 1. Cấu hình screen trong /admin/screens
// 2. Mở trang /admin/quality-records
// 3. Kiểm tra:
expect(header.screenCode).toBe('AD13');
expect(header.title).toBe('Hồ sơ chất lượng');
expect(header.subtitle).toContain('Nhật ký');
```

### **Test Case 2: Cache hoạt động**

```javascript
// 1. Mở trang lần 1
// 2. Check network tab → có API call
// 3. Reload trang
// 4. Check network tab → không có API call
// 5. Metadata vẫn hiển thị đúng
```

### **Test Case 3: Update metadata**

```javascript
// 1. Mở /admin/screens/13
// 2. Sửa title: "Hồ sơ mới"
// 3. Lưu
// 4. Clear cache
// 5. Mở /admin/quality-records
// 6. Kiểm tra header hiển thị "Hồ sơ mới"
```

---

## 🐛 TROUBLESHOOTING

### **Lỗi: Header không hiển thị**

**Kiểm tra:**
1. Route path trong DB có đúng không?
2. Component có gọi hook không?
3. Console có warning không?

**Debug:**
```javascript
const { screenCode, title, subtitle, loading, error } = useScreenMetadataCached('/admin/quality-records');

console.log({ screenCode, title, subtitle, loading, error });
```

### **Lỗi: Metadata không cập nhật**

**Nguyên nhân:** Cache chưa clear

**Giải pháp:**
```javascript
import { clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';

clearScreenMetadataCache('/admin/quality-records');
// Hoặc clear toàn bộ:
clearScreenMetadataCache();
```

### **Lỗi: API gọi nhiều lần**

**Nguyên nhân:** Dùng `useScreenMetadata` thay vì `useScreenMetadataCached`

**Giải pháp:** Đổi sang `useScreenMetadataCached`

---

## 📚 TÀI LIỆU LIÊN QUAN

1. **[HUONG_DAN_DYNAMIC_SCREEN_METADATA.md](./HUONG_DAN_DYNAMIC_SCREEN_METADATA.md)**  
   Hướng dẫn chi tiết cách sử dụng, migration, troubleshooting

2. **[TINH_CHINH_SCREENS_MOCKUP.md](./TINH_CHINH_SCREENS_MOCKUP.md)**  
   Phân tích mockup và đề xuất tinh chỉnh trang /admin/screens

3. **[scripts/migrate-to-dynamic-metadata.js](./scripts/migrate-to-dynamic-metadata.js)**  
   Script tự động migration

---

## 🎯 ROADMAP

### **Phase 1: Foundation (Hoàn thành)**
- [x] Tạo hook `useScreenMetadata`
- [x] Tạo hook `useScreenMetadataCached` với cache
- [x] Migrate QualityRecordsListView
- [x] Viết documentation

### **Phase 2: Core Screens (Tuần 1-2)**
- [ ] Migrate tất cả Admin screens (AD*)
- [ ] Migrate tất cả System screens
- [ ] Testing & bug fixes

### **Phase 3: Module Screens (Tuần 3-4)**
- [ ] Migrate Production module (MA*)
- [ ] Migrate Delivery module (NS*)
- [ ] Migrate Inspection module (KT*)
- [ ] Migrate Equipment module (BT*)

### **Phase 4: Optimization (Tuần 5)**
- [ ] Performance optimization
- [ ] Preload metadata cho routes thường dùng
- [ ] Clear cache tự động
- [ ] Analytics & monitoring

### **Phase 5: Advanced Features (Tương lai)**
- [ ] Multi-language support
- [ ] Dynamic permissions
- [ ] Screen versioning
- [ ] A/B testing

---

## 💡 BEST PRACTICES

### **1. Luôn dùng cached version:**
```javascript
// ✅ Good
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// ❌ Bad (gọi API nhiều lần)
import { useScreenMetadata } from '@webShared/hooks/useScreenMetadata';
```

### **2. Clear cache sau khi update:**
```javascript
const handleSave = async () => {
  await screenService.updateScreen(id, data);
  clearScreenMetadataCache(data.route_path);
  showToast('Cập nhật thành công!');
};
```

### **3. Fallback cho metadata:**
```javascript
const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/my-route');

useEffect(() => {
  if (screenCode && title) {
    setCustomTitle(title);
    setCustomSubtitle(subtitle || ''); // Fallback empty string
    setCustomScreenCode(screenCode);
  }
}, [screenCode, title, subtitle]);
```

### **4. Error handling:**
```javascript
const { screenCode, title, subtitle, error } = useScreenMetadataCached('/admin/my-route');

if (error) {
  console.error('Failed to load screen metadata:', error);
  // Fallback to hardcoded values
  setCustomTitle('Fallback Title');
}
```

---

## 🤝 CONTRIBUTING

### **Thêm screen mới:**

1. Cấu hình trong `/admin/screens/new`
2. Thêm mapping vào `scripts/migrate-to-dynamic-metadata.js`:
   ```javascript
   const SCREEN_MAPPINGS = {
     'AD14': '/admin/new-screen',
     // ...
   };
   ```
3. Sử dụng hook trong component
4. Test kỹ trước khi commit

### **Report bugs:**

Tạo issue với template:
```
**Screen Code:** AD13
**Route:** /admin/quality-records
**Issue:** Metadata không hiển thị
**Steps to reproduce:**
1. ...
2. ...
**Expected:** ...
**Actual:** ...
```

---

## 📞 SUPPORT

**Slack:** #erp-frontend  
**Email:** dev@company.com  
**Documentation:** [Confluence Link]

---

## 📝 CHANGELOG

### **v1.0.0 (16/07/2026)**
- ✨ Initial release
- ✨ Hook `useScreenMetadata` và `useScreenMetadataCached`
- ✨ Migration script
- ✨ Documentation
- ✅ Migrated QualityRecordsListView

---

**Made with ❤️ by ERP G7 Team**
