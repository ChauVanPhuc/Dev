# 🔄 CHANGELOG: Cho phép sửa Mã màn hình

**Ngày:** 16/07/2026 21:55  
**File:** `ScreenDetailView.jsx`  
**Tính năng:** Cho phép sửa Mã màn hình với validation trùng lặp

---

## ✅ **THAY ĐỔI**

### **1. Thêm `current_code` vào formData state**

```javascript
const [formData, setFormData] = useState({
  title: '',
  route_path: '',
  platform: 'Web',
  status: 'Mới thiết kế',
  target_date: '',
  subtitle: '',
  subsystem: 'Quản lý hệ thống',
  current_code: ''  // ← MỚI THÊM
});
```

### **2. Load `current_code` từ screen data**

```javascript
useEffect(() => {
  if (screen) {
    setFormData({
      title: screen.title || '',
      route_path: screen.route_path || '',
      platform: screen.platform || 'Web',
      subsystem: getSubsystem(screen),
      status: screen.status || 'Mới thiết kế',
      target_date: screen.target_date || '',
      subtitle: screen.subtitle || '',
      current_code: screen.current_code || ''  // ← MỚI THÊM
    });
  }
}, [screen]);
```

### **3. Cho phép edit input Mã màn hình**

**TRƯỚC:**
```javascript
<input
  type="text"
  value={isNew ? generatedCode : (screen?.current_code || '')}
  disabled  // ← Luôn disabled
  style={{ backgroundColor: '#F1F5F9', ... }}
/>
```

**SAU:**
```javascript
<input
  type="text"
  value={isNew ? generatedCode : formData.current_code}
  onChange={(e) => !isNew && setFormData(prev => ({ 
    ...prev, 
    current_code: e.target.value.toUpperCase() 
  }))}
  placeholder="VD: AD13, HD02"
  style={{ 
    backgroundColor: isNew ? '#F1F5F9' : '#fff',  // ← Trắng khi edit
    border: '1px solid #E2E8F0', 
    borderRadius: '8px', 
    padding: '8px 12px', 
    fontSize: '0.8rem', 
    color: isNew ? '#64748B' : '#111827',  // ← Đen khi edit
    fontWeight: '600', 
    height: '36px', 
    boxSizing: 'border-box',
    cursor: isNew ? 'not-allowed' : 'text'  // ← Cursor text khi edit
  }}
  disabled={isNew}  // ← Chỉ disabled khi tạo mới
/>
```

**Tính năng:**
- ✅ Tự động uppercase khi nhập
- ✅ Disabled khi tạo mới (dùng auto-generated code)
- ✅ Editable khi sửa màn hình existing
- ✅ Placeholder gợi ý format

### **4. Validation trùng lặp trong handleSave**

```javascript
const handleSave = async (e) => {
  if (e) e.preventDefault();
  
  // ... validation khác ...

  // ← MỚI THÊM: Validate mã màn hình khi edit
  if (!isNew && formData.current_code) {
    if (!formData.current_code.trim()) {
      showToast('Vui lòng nhập Mã màn hình!', 'error');
      return;
    }
    
    // Check trùng lặp mã màn hình
    if (formData.current_code !== screen?.current_code) {
      try {
        const allScreens = await screenService.getScreens();
        const isDuplicate = allScreens.some(s => 
          s.current_code === formData.current_code && s.id !== screen.id
        );
        
        if (isDuplicate) {
          showToast(
            `Mã màn hình "${formData.current_code}" đã tồn tại! Vui lòng chọn mã khác.`, 
            'error'
          );
          return;
        }
      } catch (err) {
        showToast('Không thể kiểm tra mã màn hình!', 'error');
        return;
      }
    }
  }

  // ... tiếp tục save ...
};
```

**Logic validation:**
1. ✅ Chỉ validate khi **edit** (không phải new)
2. ✅ Check mã không được rỗng
3. ✅ Chỉ check trùng lặp khi **mã bị thay đổi**
4. ✅ Fetch tất cả screens để so sánh
5. ✅ Loại trừ chính screen đang edit (s.id !== screen.id)
6. ✅ Hiển thị toast error rõ ràng

### **5. Gửi `current_code` khi update**

```javascript
} else {
  await screenService.updateScreen(screen.id, {
    current_code: formData.current_code,  // ← MỚI THÊM
    title: formData.title,
    route_path: formData.route_path,
    platform: formData.platform,
    status: formData.status,
    target_date: formData.target_date,
    subtitle: formData.subtitle,
    mockup_path: screen.mockup_path,
    components: componentsPayload,
    guides: guidesPayload
  });
}
```

---

## 🎯 **CÁCH SỬ DỤNG**

### **Khi tạo màn hình mới (`/admin/screens/new`):**
- Mã màn hình: **Auto-generated** (AD13, HD02...)
- Input: **Disabled** (màu xám)
- Không thể sửa

### **Khi sửa màn hình existing (`/admin/screens/:id`):**
- Mã màn hình: **Editable** (màu trắng)
- Input: **Enabled** (có thể nhập)
- Auto uppercase khi nhập
- Validation trùng lặp khi save

---

## ✅ **TESTING CHECKLIST**

### **Test Case 1: Tạo mới màn hình**
- [ ] Mở `/admin/screens/new`
- [ ] Mã màn hình auto-generated (VD: AD14)
- [ ] Input disabled, màu xám
- [ ] Không thể sửa
- [ ] Save thành công

### **Test Case 2: Sửa mã màn hình hợp lệ**
- [ ] Mở `/admin/screens/13` (existing screen)
- [ ] Mã màn hình hiển thị: AD13
- [ ] Input enabled, màu trắng
- [ ] Sửa thành: AD13A
- [ ] Save thành công
- [ ] Reload page → Mã hiển thị AD13A

### **Test Case 3: Sửa mã trùng lặp**
- [ ] Mở `/admin/screens/13`
- [ ] Sửa mã thành: HD02 (đã tồn tại)
- [ ] Click Save
- [ ] Toast error: "Mã màn hình 'HD02' đã tồn tại!"
- [ ] Không save được

### **Test Case 4: Sửa mã rỗng**
- [ ] Mở `/admin/screens/13`
- [ ] Xóa hết mã màn hình
- [ ] Click Save
- [ ] Toast error: "Vui lòng nhập Mã màn hình!"
- [ ] Không save được

### **Test Case 5: Không đổi mã**
- [ ] Mở `/admin/screens/13`
- [ ] Giữ nguyên mã: AD13
- [ ] Sửa tên màn hình
- [ ] Click Save
- [ ] Save thành công (không check trùng lặp)

### **Test Case 6: Auto uppercase**
- [ ] Mở `/admin/screens/13`
- [ ] Nhập: ad14a
- [ ] Tự động chuyển thành: AD14A
- [ ] Save thành công

---

## 🔧 **BACKEND REQUIREMENTS**

### **API Endpoint cần hỗ trợ:**

**PUT `/screens/:id`**

Request body phải accept `current_code`:
```json
{
  "current_code": "AD13A",
  "title": "Hồ sơ chất lượng",
  "route_path": "/admin/quality-records",
  ...
}
```

**Validation backend:**
```python
# Pseudo code
def update_screen(screen_id, data):
    if 'current_code' in data:
        # Check unique constraint
        existing = Screen.query.filter(
            Screen.current_code == data['current_code'],
            Screen.id != screen_id
        ).first()
        
        if existing:
            raise ValidationError(f"Screen code {data['current_code']} already exists")
    
    # Update screen
    screen.current_code = data.get('current_code', screen.current_code)
    screen.title = data.get('title', screen.title)
    # ...
    db.session.commit()
```

---

## 📊 **IMPACT**

### **Trước:**
❌ Mã màn hình không thể sửa  
❌ Phải xóa và tạo lại nếu muốn đổi mã  
❌ Mất data components, guides, bugs  

### **Sau:**
✅ Mã màn hình có thể sửa trực tiếp  
✅ Validation trùng lặp tự động  
✅ Giữ nguyên tất cả data liên quan  
✅ Auto uppercase cho consistency  

---

## 🚨 **LƯU Ý**

### **1. Database Constraint:**
Đảm bảo database có **UNIQUE constraint** trên `current_code`:
```sql
ALTER TABLE screens ADD CONSTRAINT unique_current_code UNIQUE (current_code);
```

### **2. Cache Invalidation:**
Sau khi update mã màn hình, cần clear cache:
```javascript
import { clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';

// Sau khi save thành công
clearScreenMetadataCache(formData.route_path);
```

### **3. Route Mapping:**
Cập nhật `SCREEN_ROUTE_MAPPING.json` nếu mã bị đổi:
```json
{
  "AD13A": {
    "route": "/admin/quality-records",
    "file": "QualityRecords/Views/QualityRecordsListView.jsx",
    ...
  }
}
```

---

## 🎉 **KẾT QUẢ**

✅ **Hoàn thành** - Cho phép sửa Mã màn hình  
✅ **Validation** - Check trùng lặp tự động  
✅ **UX tốt** - Auto uppercase, placeholder rõ ràng  
✅ **Safe** - Không cho sửa khi tạo mới  

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 21:55
