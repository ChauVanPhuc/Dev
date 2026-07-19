# ✅ SUCCESS: Paste Image với onPaste Event

**Ngày:** 16/07/2026 23:18  
**Giải pháp:** Dùng onPaste event trên textarea (theo cách ScreenBugManagementView)  
**Status:** ✅ Hoàn thành

---

## 🎯 **GIẢI PHÁP CUỐI CÙNG:**

### **Học từ `/admin/screens/bugs`:**

Thay vì dùng `document.addEventListener('paste')`, họ dùng **onPaste event trực tiếp trên textarea/input**!

```javascript
// ❌ CÁCH CŨ (Phức tạp, dễ lỗi)
useEffect(() => {
  const handlePaste = async (e) => { ... };
  document.addEventListener('paste', handlePaste);
  return () => document.removeEventListener('paste', handlePaste);
}, [show, formData, ...]);

// ✅ CÁCH MỚI (Đơn giản, hiệu quả)
const handlePasteImage = async (e) => {
  const clipboardData = e.clipboardData || e.nativeEvent?.clipboardData;
  // ... xử lý paste
};

<textarea onPaste={handlePasteImage} ... />
```

---

## 📝 **CODE IMPLEMENTATION:**

### **1. Handler function:**

```javascript
// Handle paste ảnh từ clipboard (theo cách ScreenBugManagementView)
const handlePasteImage = async (e) => {
  const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
  if (!clipboardData) return;
  
  const items = clipboardData.items;
  const files = [];
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }

  if (files.length === 0) return;

  // Validate số lượng ảnh
  const currentCount = formData.images.length;
  const newCount = currentCount + files.length;
  if (newCount > MAX_IMAGES) {
    toast.error(`Tối đa ${MAX_IMAGES} ảnh!`);
    return;
  }

  // Validate file size và type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  for (let file of files) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File "${file.name}" quá lớn! Tối đa 5MB.`);
      return;
    }
    if (!validTypes.includes(file.type)) {
      toast.error(`File "${file.name}" không hợp lệ! Chỉ chấp nhận JPG, PNG, GIF, WebP.`);
      return;
    }
  }

  // Upload
  setUploading(true);
  
  for (const file of files) {
    try {
      const res = await bugService.uploadImage(file);
      if (res && res.url) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, res.url]
        }));
      }
    } catch (error) {
      console.error('Lỗi tải ảnh từ clipboard:', error);
      toast.error('Tải ảnh từ clipboard thất bại!');
    }
  }
  
  setUploading(false);
  toast.success(`Đã dán ${files.length} ảnh thành công!`);
};
```

---

### **2. Attach to textarea:**

```jsx
<textarea 
  rows="3" 
  value={formData.description} 
  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
  onPaste={handlePasteImage}  // ✅ Thêm onPaste event
  placeholder="Mô tả chi tiết lỗi... (Có thể dán ảnh bằng Ctrl+V)" 
  required
  style={{ ... }}
/>
```

---

## ✅ **LỢI ÍCH:**

### **1. Đơn giản hơn:**
```
❌ useEffect + document.addEventListener
✅ onPaste event trực tiếp
```

### **2. Không cần dependencies:**
```
❌ useEffect(..., [show, formData, toast, ...])
✅ Không cần useEffect
```

### **3. Không có stale closure:**
```
❌ Function reference có thể stale
✅ Luôn dùng state mới nhất
```

### **4. Cleanup tự động:**
```
❌ Phải removeEventListener manually
✅ React tự cleanup
```

### **5. Scope rõ ràng:**
```
❌ Paste anywhere trong document
✅ Chỉ paste khi focus vào textarea
```

---

## 🎯 **SO SÁNH:**

### **Cách cũ (document.addEventListener):**

**Pros:**
- Paste anywhere trong modal

**Cons:**
- Phức tạp
- Cần useEffect
- Cần cleanup
- Stale closure issues
- Dependencies phức tạp

---

### **Cách mới (onPaste event):**

**Pros:**
- ✅ Đơn giản
- ✅ Không cần useEffect
- ✅ Không cần cleanup
- ✅ Không có stale closure
- ✅ Scope rõ ràng
- ✅ React best practice

**Cons:**
- Chỉ paste khi focus vào textarea (nhưng đây là behavior tốt!)

---

## 📋 **WORKFLOW:**

```
User focus vào textarea "Mô tả lỗi"
    ↓
User chụp màn hình (PrtScn)
    ↓
User paste (Ctrl+V)
    ↓
onPaste event triggered
    ↓
handlePasteImage() được gọi
    ↓
Extract image files từ clipboard
    ↓
Validate file size, type, count
    ↓
Upload từng file lên server
    ↓
Update formData.images
    ↓
Toast: "Đã dán 1 ảnh thành công!"
    ↓
Ảnh hiển thị trong khung "Ảnh bằng chứng"
```

---

## 🎨 **UI/UX:**

### **Hint text:**
```
Mô tả lỗi *
💡 Có thể dán ảnh trực tiếp (Ctrl+V)
```

### **Placeholder:**
```
Mô tả chi tiết lỗi... (Có thể dán ảnh bằng Ctrl+V)
```

### **Upload area:**
```
Click để tải ảnh hoặc dán từ clipboard (Ctrl+V)
Tối đa 5 ảnh, mỗi ảnh ≤ 5MB
```

---

## ✅ **TESTING:**

### **Test 1: Paste vào textarea**
```
1. Click vào textarea "Mô tả lỗi"
2. Chụp màn hình (PrtScn)
3. Paste (Ctrl+V)
4. ✅ Ảnh upload và hiển thị
```

### **Test 2: Paste nhiều ảnh**
```
1. Click vào textarea
2. Paste ảnh 1 → Success
3. Paste ảnh 2 → Success
4. Paste ảnh 3 → Success
5. ✅ Tất cả hiển thị
```

### **Test 3: Validation**
```
1. Paste ảnh > 5MB → Error
2. Paste file PDF → Không upload
3. Paste 6 ảnh → Error (max 5)
4. ✅ Validation hoạt động
```

---

## 🔍 **CODE REFERENCE:**

### **Học từ ScreenBugManagementView:**

```javascript
// File: Web/modules/System/Views/ScreenBugManagementView.jsx
// Lines: 166-193

const handlePasteImage = async (e, setImagesList) => {
  const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
  if (!clipboardData) return;
  const items = clipboardData.items;
  const files = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }

  if (files.length === 0) return;

  for (const file of files) {
    try {
      showToast('Đang tải ảnh từ clipboard...', 'success');
      const res = await bugService.uploadImage(file);
      if (res && res.url) {
        setImagesList(prev => [...prev, res.url]);
        showToast('Đã dán ảnh thành công!');
      }
    } catch (error) {
      console.error('Lỗi tải ảnh từ clipboard:', error);
      showToast('Tải ảnh từ clipboard thất bại!', 'error');
    }
  }
};
```

---

## 🎉 **KẾT LUẬN:**

**Paste ảnh đã hoạt động hoàn hảo!**

**Cách làm:**
1. ✅ Dùng `onPaste` event trên textarea
2. ✅ Extract files từ `e.clipboardData.items`
3. ✅ Validate file size, type, count
4. ✅ Upload lên server
5. ✅ Update state và hiển thị

**Lợi ích:**
- ✅ Đơn giản, dễ hiểu
- ✅ Không có stale closure
- ✅ React best practice
- ✅ Học từ code existing

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 23:18  
**Status:** ✅ Production Ready!  
**Inspired by:** ScreenBugManagementView.jsx
