# 🔍 DEBUG: Paste Image - Step by Step

**Ngày:** 16/07/2026 23:23  
**Issue:** Paste vẫn không hoạt động  
**Action:** Debug từng bước

---

## 📋 **CHECKLIST DEBUG:**

### **Step 1: Kiểm tra Console**

**Mở Console (F12):**
```
1. Refresh page
2. Mở modal Khai báo lỗi
3. Click vào textarea "Mô tả lỗi"
4. Chụp màn hình (PrtScn)
5. Paste (Ctrl+V)
6. XEM CONSOLE
```

---

### **Step 2: Console Logs Expected**

**Nếu paste hoạt động, bạn sẽ thấy:**

```
🎯 handlePasteImage triggered!
📋 clipboardData: DataTransfer { ... }
📦 items: DataTransferItemList { ... } length: 1
📄 Item 0 type: image/png
🖼️ Image file: File { name: "blob", size: 123456, type: "image/png" }
✅ Total image files: 1
```

---

### **Step 3: Troubleshooting**

#### **Case 1: Không thấy "🎯 handlePasteImage triggered!"**

**Nguyên nhân:**
- `onPaste` event không được attach
- Textarea không có `onPaste={handlePasteImage}`

**Fix:**
```jsx
// Check trong code:
<textarea 
  onPaste={handlePasteImage}  // ← Phải có dòng này
  ...
/>
```

---

#### **Case 2: Thấy "❌ No clipboardData"**

**Nguyên nhân:**
- Browser không support clipboard API
- Hoặc paste không phải từ clipboard

**Fix:**
```javascript
// Thử paste lại
// Hoặc thử browser khác (Chrome, Edge)
```

---

#### **Case 3: Thấy "❌ No image files found"**

**Nguyên nhân:**
- Clipboard không có ảnh
- Hoặc copy text/file khác

**Fix:**
```
1. Chụp màn hình (PrtScn)
2. Paste ngay vào textarea
3. KHÔNG copy text trước khi paste
```

---

#### **Case 4: Thấy logs nhưng không upload**

**Nguyên nhân:**
- API error
- Network error

**Fix:**
```
Check console error sau dòng:
"Lỗi tải ảnh từ clipboard: ..."
```

---

## 🎯 **TESTING SCENARIOS:**

### **Scenario 1: Paste screenshot**

```
Step 1: Nhấn PrtScn (Windows)
Step 2: Mở modal
Step 3: Click vào textarea "Mô tả lỗi"
Step 4: Ctrl+V
Step 5: Check console

Expected:
🎯 handlePasteImage triggered!
📋 clipboardData: DataTransfer { ... }
📦 items: DataTransferItemList { ... } length: 1
📄 Item 0 type: image/png
🖼️ Image file: File { ... }
✅ Total image files: 1
```

---

### **Scenario 2: Paste from file explorer**

```
Step 1: Mở file explorer
Step 2: Chuột phải vào ảnh → Copy
Step 3: Mở modal
Step 4: Click vào textarea
Step 5: Ctrl+V
Step 6: Check console

Expected:
🎯 handlePasteImage triggered!
📋 clipboardData: DataTransfer { ... }
📦 items: DataTransferItemList { ... } length: 1
📄 Item 0 type: image/jpeg
🖼️ Image file: File { name: "photo.jpg", ... }
✅ Total image files: 1
```

---

### **Scenario 3: Paste text (should not upload)**

```
Step 1: Copy text (Ctrl+C)
Step 2: Mở modal
Step 3: Click vào textarea
Step 4: Ctrl+V
Step 5: Check console

Expected:
🎯 handlePasteImage triggered!
📋 clipboardData: DataTransfer { ... }
📦 items: DataTransferItemList { ... } length: 1
📄 Item 0 type: text/plain
❌ No image files found
```

---

## 🔧 **MANUAL VERIFICATION:**

### **1. Check textarea có onPaste:**

```javascript
// Mở DevTools → Elements
// Tìm textarea
// Check attributes:
<textarea 
  rows="3"
  value="..."
  onPaste={handlePasteImage}  // ← Phải có
  ...
/>
```

---

### **2. Check handlePasteImage function:**

```javascript
// Mở DevTools → Sources
// Tìm file BugDetailModal.jsx
// Check function handlePasteImage có tồn tại
// Check có console.log không
```

---

### **3. Check modal có mở:**

```javascript
// Check trong React DevTools
// BugDetailModal component
// Props: show = true
```

---

## 📊 **CONSOLE LOG FLOW:**

### **Success flow:**

```
User paste (Ctrl+V)
    ↓
🎯 handlePasteImage triggered!
    ↓
📋 clipboardData: DataTransfer { ... }
    ↓
📦 items: DataTransferItemList { ... } length: 1
    ↓
📄 Item 0 type: image/png
    ↓
🖼️ Image file: File { ... }
    ↓
✅ Total image files: 1
    ↓
Upload to server
    ↓
Toast: "Đã dán 1 ảnh thành công!"
    ↓
Image displayed
```

---

### **Failure flow (no image):**

```
User paste text (Ctrl+V)
    ↓
🎯 handlePasteImage triggered!
    ↓
📋 clipboardData: DataTransfer { ... }
    ↓
📦 items: DataTransferItemList { ... } length: 1
    ↓
📄 Item 0 type: text/plain
    ↓
❌ No image files found
    ↓
Return (no upload)
```

---

## ⚠️ **COMMON ISSUES:**

### **Issue 1: onPaste không trigger**

**Symptoms:**
- Không thấy console log "🎯 handlePasteImage triggered!"

**Causes:**
- Textarea không có `onPaste` attribute
- Focus không ở textarea
- Modal chưa mở

**Solutions:**
1. Check textarea có `onPaste={handlePasteImage}`
2. Click vào textarea trước khi paste
3. Đảm bảo modal đang mở

---

### **Issue 2: Clipboard rỗng**

**Symptoms:**
- Thấy "❌ No clipboardData"

**Causes:**
- Chưa copy/chụp ảnh
- Clipboard đã bị clear

**Solutions:**
1. Chụp màn hình lại (PrtScn)
2. Paste ngay sau khi chụp
3. Không copy text khác

---

### **Issue 3: Không phải ảnh**

**Symptoms:**
- Thấy "❌ No image files found"
- Item type: text/plain, application/pdf, etc.

**Causes:**
- Copy text, PDF, hoặc file khác
- Không phải ảnh

**Solutions:**
1. Chỉ copy/paste ảnh
2. Formats: JPG, PNG, GIF, WebP
3. Không paste text, PDF, Word, etc.

---

### **Issue 4: Upload failed**

**Symptoms:**
- Thấy "Lỗi tải ảnh từ clipboard: ..."
- Network error trong console

**Causes:**
- API error
- Server down
- Network issue

**Solutions:**
1. Check server đang chạy
2. Check network connection
3. Check API endpoint `/screen-bugs/upload-image`

---

## 🎯 **NEXT STEPS:**

### **Nếu vẫn không hoạt động:**

1. **Gửi cho tôi console logs:**
   ```
   - Có thấy "🎯 handlePasteImage triggered!" không?
   - Có thấy "📋 clipboardData: ..." không?
   - Có thấy "📦 items: ..." không?
   - Item type là gì?
   - Có error nào không?
   ```

2. **Screenshot console:**
   - F12 → Console tab
   - Paste ảnh
   - Screenshot toàn bộ console
   - Gửi cho tôi

3. **Check React DevTools:**
   - BugDetailModal component
   - Props: show, formData, etc.
   - Screenshot và gửi cho tôi

---

## ✅ **SUCCESS CRITERIA:**

```
✅ Thấy "🎯 handlePasteImage triggered!"
✅ Thấy "📋 clipboardData: DataTransfer { ... }"
✅ Thấy "📦 items: ... length: 1"
✅ Thấy "📄 Item 0 type: image/png"
✅ Thấy "🖼️ Image file: File { ... }"
✅ Thấy "✅ Total image files: 1"
✅ Toast: "Đã dán 1 ảnh thành công!"
✅ Ảnh hiển thị trong UI
```

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 23:23  
**Status:** 🔧 Debugging Mode  
**Action:** Gửi console logs cho tôi!
