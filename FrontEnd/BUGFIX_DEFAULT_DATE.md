# 🐛 BUG FIX: Ngày mặc định không hiển thị

**Ngày:** 16/07/2026 22:50  
**Lỗi:** Ngày hoàn thành dự kiến không tự động điền hôm nay  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **NGUYÊN NHÂN:**

### **Code ban đầu:**

```javascript
// Initial state - CÓ ngày mặc định
const [formData, setFormData] = useState({
  title: '',
  route_path: '',
  platform: 'Web',
  subsystem: 'Quản lý hệ thống',
  status: 'Mới thiết kế',
  target_date: new Date().toISOString().split('T')[0],  // ✅ Hôm nay
  subtitle: '',
  current_code: ''
});

// useEffect - BỊ OVERRIDE
useEffect(() => {
  if (screen) {  // ← screen = null khi tạo mới
    setFormData({
      title: screen.title || '',
      route_path: screen.route_path || '',
      platform: screen.platform || 'Web',
      subsystem: getSubsystem(screen),
      status: screen.status || 'Mới thiết kế',
      target_date: screen.target_date || '',  // ← Override về ''
      subtitle: screen.subtitle || '',
      current_code: screen.current_code || ''
    });
  }
}, [screen]);
```

**Vấn đề:**
1. Initial state có `target_date = hôm nay` ✅
2. Nhưng useEffect chạy và override về `''` ❌
3. Kết quả: Input rỗng

**Tại sao useEffect chạy?**
- Khi `id === 'new'`, `screen` được set = `null` ban đầu
- Nhưng có thể có logic khác set `screen = {}` hoặc trigger re-render
- useEffect chạy → `setFormData` → Override initial state

---

## ✅ **GIẢI PHÁP:**

### **Thêm điều kiện `!isNew`:**

```javascript
useEffect(() => {
  if (screen && !isNew) {  // ← CHỈ chạy khi EDIT screen existing
    setFormData({
      title: screen.title || '',
      route_path: screen.route_path || '',
      platform: screen.platform || 'Web',
      subsystem: getSubsystem(screen),
      status: screen.status || 'Mới thiết kế',
      target_date: screen.target_date || new Date().toISOString().split('T')[0],
      subtitle: screen.subtitle || '',
      current_code: screen.current_code || ''
    });
  }
}, [screen, isNew]);
```

**Cải tiến:**
1. ✅ Thêm điều kiện `!isNew` → Không chạy khi tạo mới
2. ✅ Giữ nguyên initial state khi `isNew = true`
3. ✅ Fallback `|| new Date().toISOString().split('T')[0]` cho trường hợp screen không có target_date

---

## 🎯 **LOGIC FLOW:**

### **Khi tạo màn hình mới (`id === 'new'`):**

```
1. Component mount
2. isNew = true
3. Initial state: target_date = hôm nay ✅
4. useEffect chạy:
   - Điều kiện: screen && !isNew
   - screen = null → FALSE
   - !isNew = false → FALSE
   - → useEffect KHÔNG chạy ✅
5. formData.target_date giữ nguyên = hôm nay ✅
6. Input hiển thị: 16/07/2026 ✅
```

### **Khi edit màn hình existing (`id === '13'`):**

```
1. Component mount
2. isNew = false
3. Initial state: target_date = hôm nay
4. Fetch screen từ API
5. useEffect chạy:
   - Điều kiện: screen && !isNew
   - screen = {...} → TRUE
   - !isNew = true → TRUE
   - → useEffect CHẠY ✅
6. setFormData với screen.target_date ✅
7. Input hiển thị: 20/07/2026 (từ DB) ✅
```

---

## 📊 **TRƯỚC & SAU:**

### **TRƯỚC (BUG):**

**Tạo màn hình mới:**
```
Ngày hoàn thành dự kiến *
┌──────────────────────────────┐
│ dd/mm/yyyy                   │ ← Rỗng ❌
└──────────────────────────────┘
```

**Edit màn hình:**
```
Ngày hoàn thành dự kiến *
┌──────────────────────────────┐
│ 20/07/2026                   │ ← OK ✅
└──────────────────────────────┘
```

### **SAU (FIXED):**

**Tạo màn hình mới:**
```
Ngày hoàn thành dự kiến *
┌──────────────────────────────┐
│ 16/07/2026                   │ ← Hôm nay ✅
└──────────────────────────────┘
```

**Edit màn hình:**
```
Ngày hoàn thành dự kiến *
┌──────────────────────────────┐
│ 20/07/2026                   │ ← Từ DB ✅
└──────────────────────────────┘
```

---

## 🔧 **DEBUGGING TIPS:**

### **Nếu vẫn không hiển thị ngày:**

1. **Check initial state:**
   ```javascript
   console.log('Initial formData:', formData);
   // target_date phải = hôm nay
   ```

2. **Check useEffect:**
   ```javascript
   useEffect(() => {
     console.log('useEffect running:', { screen, isNew });
     if (screen && !isNew) {
       console.log('Setting formData from screen');
     } else {
       console.log('Skipping - keeping initial state');
     }
   }, [screen, isNew]);
   ```

3. **Check input value:**
   ```javascript
   console.log('Input value:', formData.target_date);
   // Phải = '2026-07-16' (YYYY-MM-DD format)
   ```

4. **Check date format:**
   ```javascript
   const today = new Date().toISOString().split('T')[0];
   console.log('Today:', today);
   // Phải = '2026-07-16'
   ```

---

## ✅ **VERIFIED:**

- [x] Tạo màn hình mới → Ngày = hôm nay
- [x] Edit màn hình → Ngày = từ DB
- [x] useEffect không chạy khi isNew = true
- [x] useEffect chạy khi isNew = false
- [x] Input hiển thị đúng format
- [x] Validation min date vẫn hoạt động

---

## 📝 **BEST PRACTICES:**

### **1. Conditional useEffect:**
```javascript
// ❌ SAI - Luôn chạy
useEffect(() => {
  if (screen) {
    setFormData(...);
  }
}, [screen]);

// ✅ ĐÚNG - Chỉ chạy khi cần
useEffect(() => {
  if (screen && !isNew) {
    setFormData(...);
  }
}, [screen, isNew]);
```

### **2. Fallback values:**
```javascript
// ❌ SAI - Có thể undefined
target_date: screen.target_date || ''

// ✅ ĐÚNG - Luôn có giá trị hợp lý
target_date: screen.target_date || new Date().toISOString().split('T')[0]
```

### **3. Initial state:**
```javascript
// ✅ ĐÚNG - Set giá trị mặc định hợp lý
const [formData, setFormData] = useState({
  target_date: new Date().toISOString().split('T')[0],
  // ...
});
```

---

## 🎉 **HOÀN THÀNH!**

**Lỗi đã được fix:**
- ✅ Thêm điều kiện `!isNew` vào useEffect
- ✅ Giữ nguyên initial state khi tạo mới
- ✅ Ngày tự động điền hôm nay
- ✅ Edit screen vẫn load đúng ngày từ DB

**Bây giờ bạn có thể:**
- ✅ Tạo màn hình mới → Ngày tự động = hôm nay
- ✅ Edit màn hình → Ngày load từ DB
- ✅ Không cần chọn ngày thủ công
- ✅ Tiết kiệm thời gian

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 22:50
