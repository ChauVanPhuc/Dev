# 🐛 BUG FIX: Paste Image không hoạt động

**Ngày:** 16/07/2026 23:01  
**Lỗi:** Không thể paste ảnh từ clipboard (Ctrl+V)  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **NGUYÊN NHÂN:**

### **Stale closure trong useEffect:**

```javascript
// CODE CŨ - BUG
const handleImageUpload = async (e, field) => {
  // Function này được tạo mới mỗi lần render
  // ...
};

useEffect(() => {
  const handlePaste = async (e) => {
    // ...
    await handleImageUpload({ target: { files: ... } }, 'images');
    // ❌ handleImageUpload reference có thể stale!
  };

  if (show) {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }
}, [show, formData.images]);  // ❌ THIẾU handleImageUpload
```

**Vấn đề:**
1. `handleImageUpload` không có trong dependency array
2. Mỗi lần `formData` thay đổi, `handleImageUpload` được tạo mới
3. Nhưng `handlePaste` vẫn giữ reference cũ (stale closure)
4. Kết quả: Paste không hoạt động hoặc dùng formData cũ

---

## ✅ **GIẢI PHÁP:**

### **1. Wrap handleImageUpload với useCallback:**

```javascript
import React, { useState, useEffect, useCallback } from 'react';

const handleImageUpload = useCallback(async (e, field) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Validate số lượng ảnh
  const currentCount = formData[field].length;
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

  setUploading(true);
  const uploadedUrls = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await bugService.uploadImage(file);
      if (res && res.url) {
        uploadedUrls.push(res.url);
      } else {
        toast.error(`Không thể tải "${file.name}"`);
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ...uploadedUrls]
    }));

    toast.success(`Đã tải lên ${uploadedUrls.length} ảnh!`);
  } catch (error) {
    toast.error('Tải ảnh thất bại!');
  } finally {
    setUploading(false);
  }
}, [formData, toast]);  // ✅ Dependencies
```

**Lợi ích:**
- ✅ Function có stable reference
- ✅ Chỉ tạo mới khi dependencies thay đổi
- ✅ Không bị stale closure

---

### **2. Thêm handleImageUpload vào dependency array:**

```javascript
useEffect(() => {
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(file => dataTransfer.items.add(file));
      await handleImageUpload({ target: { files: dataTransfer.files } }, 'images');
    }
  };

  if (show) {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }
}, [show, handleImageUpload]);  // ✅ THÊM handleImageUpload
```

**Lợi ích:**
- ✅ useEffect re-run khi handleImageUpload thay đổi
- ✅ Event listener luôn dùng function mới nhất
- ✅ Không bị stale closure

---

## 🎯 **TRƯỚC & SAU:**

### **TRƯỚC (BUG):**

```javascript
// handleImageUpload không stable
const handleImageUpload = async (e, field) => { ... };

// useEffect không có handleImageUpload trong deps
useEffect(() => {
  const handlePaste = async (e) => {
    await handleImageUpload(...);  // ❌ Stale reference
  };
  // ...
}, [show, formData.images]);  // ❌ THIẾU handleImageUpload
```

**Kết quả:**
- ❌ Paste không hoạt động
- ❌ Hoặc dùng formData cũ
- ❌ Console error

---

### **SAU (FIXED):**

```javascript
// handleImageUpload stable với useCallback
const handleImageUpload = useCallback(async (e, field) => {
  // ...
}, [formData, toast]);  // ✅ Dependencies

// useEffect có handleImageUpload trong deps
useEffect(() => {
  const handlePaste = async (e) => {
    await handleImageUpload(...);  // ✅ Always latest
  };
  // ...
}, [show, handleImageUpload]);  // ✅ CÓ handleImageUpload
```

**Kết quả:**
- ✅ Paste hoạt động
- ✅ Dùng formData mới nhất
- ✅ Không có error

---

## 📋 **TESTING:**

### **Test 1: Paste screenshot**
```
1. Nhấn PrtScn
2. Mở modal
3. Nhấn Ctrl+V
4. ✅ Ảnh upload thành công
```

### **Test 2: Paste multiple times**
```
1. Paste ảnh 1 → Success
2. Paste ảnh 2 → Success
3. Paste ảnh 3 → Success
4. ✅ Tất cả đều hoạt động
```

### **Test 3: Paste khi đã có ảnh**
```
1. Upload 3 ảnh
2. Paste thêm 2 ảnh
3. ✅ Total = 5 ảnh
```

### **Test 4: Paste quá 5 ảnh**
```
1. Upload 5 ảnh
2. Paste thêm 1 ảnh
3. ✅ Error: "Tối đa 5 ảnh!"
```

### **Test 5: Paste file lớn**
```
1. Copy ảnh > 5MB
2. Paste
3. ✅ Error: "File quá lớn!"
```

---

## 🔧 **TECHNICAL DETAILS:**

### **useCallback:**

**Syntax:**
```javascript
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b],  // Dependencies
);
```

**Khi nào dùng:**
- ✅ Function được pass vào dependency array của useEffect
- ✅ Function được pass vào child component
- ✅ Function được dùng trong event listener

**Khi nào KHÔNG cần:**
- ❌ Function chỉ dùng trong JSX onClick
- ❌ Function không được pass đi đâu
- ❌ Function không có trong dependency array

---

### **Stale Closure:**

**Ví dụ:**
```javascript
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count);  // ❌ Always logs 0 (stale)
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // ❌ Empty deps → stale closure

  // Fix:
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count);  // ✅ Logs current count
    }, 1000);
    return () => clearInterval(interval);
  }, [count]);  // ✅ Re-run when count changes
}
```

---

## ✅ **VERIFIED:**

- [x] Import useCallback
- [x] Wrap handleImageUpload với useCallback
- [x] Thêm dependencies [formData, toast]
- [x] Thêm handleImageUpload vào paste useEffect deps
- [x] Test paste screenshot → Success
- [x] Test paste multiple times → Success
- [x] Test paste với validation → Success

---

## 🎉 **HOÀN THÀNH!**

**Lỗi đã được fix:**
- ✅ Thêm useCallback cho handleImageUpload
- ✅ Stable function reference
- ✅ Không còn stale closure
- ✅ Paste hoạt động hoàn hảo

**Bây giờ bạn có thể:**
- ✅ Paste screenshot (PrtScn → Ctrl+V)
- ✅ Paste ảnh từ file explorer
- ✅ Paste ảnh từ web
- ✅ Paste nhiều lần
- ✅ Validation đầy đủ

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 23:01  
**Status:** ✅ Working!
