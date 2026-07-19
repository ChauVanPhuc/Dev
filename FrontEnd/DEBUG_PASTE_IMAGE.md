# 🔍 DEBUG: Paste Image Feature

**Ngày:** 16/07/2026 23:07  
**Issue:** Paste image không hoạt động  
**Status:** 🔧 Debugging

---

## 🐛 **CÁCH DEBUG:**

### **1. Mở Console (F12):**

```
1. Mở modal Khai báo lỗi
2. Nhấn F12 → Console tab
3. Nhấn Ctrl+V để paste
4. Xem console logs
```

---

## 📋 **EXPECTED CONSOLE LOGS:**

### **Khi modal mở:**
```
Adding paste listener
```

### **Khi paste ảnh:**
```
Paste event triggered
Item type: image/png
Image file found: image.png 123456
Processing 1 images
handlePasteImages called with 1 files
Uploading file: image.png
Upload success: http://...
```

### **Khi đóng modal:**
```
Removing paste listener
```

---

## ⚠️ **POSSIBLE ISSUES:**

### **Issue 1: Không thấy "Paste event triggered"**

**Nguyên nhân:**
- Event listener chưa được add
- Modal chưa mở (`show = false`)

**Fix:**
```javascript
// Check trong Console:
console.log('Modal show:', show);

// Nếu show = false → Modal chưa mở
```

---

### **Issue 2: "No clipboard items"**

**Nguyên nhân:**
- Clipboard rỗng
- Chưa copy ảnh

**Fix:**
```
1. Chụp màn hình (PrtScn)
2. Hoặc copy ảnh từ file explorer
3. Paste lại
```

---

### **Issue 3: "No image files found in clipboard"**

**Nguyên nhân:**
- Clipboard có data nhưng không phải ảnh
- Copy text, file PDF, etc.

**Fix:**
```
Chỉ copy/paste ảnh:
- JPG, PNG, GIF, WebP
```

---

### **Issue 4: "File quá lớn"**

**Nguyên nhân:**
- File > 5MB

**Fix:**
```
Resize ảnh trước khi paste
```

---

### **Issue 5: Upload failed**

**Nguyên nhân:**
- API error
- Network error
- Server error

**Fix:**
```javascript
// Check console error:
Upload error: [Error details]

// Check network tab:
POST /api/upload → Status 500
```

---

## 🔧 **MANUAL TESTING:**

### **Test 1: Screenshot**
```
1. Nhấn PrtScn
2. Mở modal
3. F12 → Console
4. Ctrl+V
5. Check console logs
```

**Expected:**
```
Paste event triggered
Item type: image/png
Image file found: ...
Processing 1 images
handlePasteImages called with 1 files
Uploading file: ...
Upload success: ...
```

---

### **Test 2: Copy from file**
```
1. Mở file explorer
2. Chuột phải ảnh → Copy
3. Mở modal
4. F12 → Console
5. Ctrl+V
6. Check console logs
```

**Expected:**
```
Paste event triggered
Item type: image/jpeg
Image file found: photo.jpg 234567
Processing 1 images
...
```

---

### **Test 3: Copy text (should fail)**
```
1. Copy text (Ctrl+C)
2. Mở modal
3. Ctrl+V
4. Check console
```

**Expected:**
```
Paste event triggered
Item type: text/plain
No image files found in clipboard
```

---

## 🎯 **TROUBLESHOOTING:**

### **Nếu paste không hoạt động:**

**Step 1: Check modal show**
```javascript
console.log('Modal show:', show);
// Should be: true
```

**Step 2: Check event listener**
```javascript
// Should see in console:
Adding paste listener
```

**Step 3: Check clipboard**
```javascript
// Paste → Should see:
Paste event triggered
```

**Step 4: Check clipboard items**
```javascript
// Should see:
Item type: image/png
Image file found: ...
```

**Step 5: Check upload**
```javascript
// Should see:
Uploading file: ...
Upload success: ...
```

---

## 📊 **CONSOLE LOG FLOW:**

```
Modal Open
    ↓
Adding paste listener
    ↓
User paste (Ctrl+V)
    ↓
Paste event triggered
    ↓
Item type: image/png
    ↓
Image file found: image.png 123456
    ↓
Processing 1 images
    ↓
handlePasteImages called with 1 files
    ↓
Uploading file: image.png
    ↓
Upload success: http://...
    ↓
Toast: "Đã tải lên 1 ảnh!"
    ↓
Image displayed in UI
```

---

## 🔍 **DETAILED CHECKS:**

### **1. Check browser support:**
```javascript
// Test in Console:
const dt = new DataTransfer();
console.log('DataTransfer supported:', !!dt);

// Test clipboard API:
navigator.clipboard.read().then(items => {
  console.log('Clipboard API supported:', !!items);
});
```

### **2. Check paste event:**
```javascript
document.addEventListener('paste', (e) => {
  console.log('Paste event:', e);
  console.log('Clipboard data:', e.clipboardData);
  console.log('Items:', e.clipboardData?.items);
});
```

### **3. Check file type:**
```javascript
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  for (let item of items) {
    console.log('Type:', item.type);
    console.log('Kind:', item.kind);
    if (item.kind === 'file') {
      const file = item.getAsFile();
      console.log('File:', file);
    }
  }
});
```

---

## ✅ **VERIFICATION:**

### **Checklist:**
- [ ] Modal mở → Console: "Adding paste listener"
- [ ] Paste ảnh → Console: "Paste event triggered"
- [ ] Detect ảnh → Console: "Image file found"
- [ ] Upload → Console: "Upload success"
- [ ] Toast hiển thị: "Đã tải lên 1 ảnh!"
- [ ] Ảnh hiển thị trong UI

---

## 🎉 **SUCCESS CRITERIA:**

```
1. Mở modal
2. Paste ảnh (Ctrl+V)
3. Console logs đầy đủ
4. Toast success
5. Ảnh hiển thị
```

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 23:07  
**Status:** 🔧 Debugging Mode
