# 🔍 REVIEW: BugDetailModal Component

**Ngày:** 16/07/2026 22:55  
**File:** `Web/Shared/Views/components/modals/BugDetailModal.jsx`  
**Trạng thái:** ⚠️ Cần cải thiện

---

## ✅ **ĐIỂM TỐT:**

### **1. UI/UX:**
- ✅ Design đẹp, modern
- ✅ Layout rõ ràng, 2 columns
- ✅ Sticky header
- ✅ Backdrop blur effect
- ✅ Responsive width (660px max)

### **2. Validation:**
- ✅ Required fields có dấu *
- ✅ Check screen_id và description
- ✅ Check ít nhất 1 ảnh
- ✅ Toast notifications

### **3. Features:**
- ✅ Upload multiple images
- ✅ Preview images
- ✅ Remove images
- ✅ Auto-fill reporter
- ✅ Auto-fill dates
- ✅ Component dropdown từ screen

---

## ⚠️ **VẤN ĐỀ CẦN FIX:**

### **1. CRITICAL: Toast API sai**

**Vấn đề:**
```javascript
toast('success', 'Message');  // ❌ SAI
toast('error', 'Message');    // ❌ SAI
```

**Đúng phải là:**
```javascript
toast.success('Message');  // ✅ ĐÚNG
toast.error('Message');    // ✅ ĐÚNG
```

**Locations cần fix:**
- Line 107: `toast('success', ...)`
- Line 109: `toast('error', ...)`
- Line 126: `toast('error', ...)`
- Line 131: `toast('error', ...)`
- Line 139: `toast('error', ...)`

---

### **2. Missing min date validation**

**Vấn đề:**
```javascript
<input type="date" 
  value={formData.requested_at} 
  onChange={...}
  required
  // ❌ THIẾU min={today}
/>
```

**Fix:**
```javascript
<input type="date" 
  value={formData.requested_at} 
  onChange={...}
  required
  min={new Date().toISOString().split('T')[0]}  // ✅ THÊM
/>
```

---

### **3. Hardcoded screen code**

**Vấn đề:**
```javascript
<h3>HD04: Thông tin chi tiết lỗi</h3>  // ❌ Hardcoded
```

**Fix:**
```javascript
<h3>🐛 Khai báo lỗi</h3>  // ✅ Generic
// Hoặc
<h3>Thông tin chi tiết lỗi</h3>  // ✅ Simple
```

---

### **4. Image upload không có loading state**

**Vấn đề:**
```javascript
{uploading && <p>Đang tải...</p>}  // ❌ KHÔNG CÓ
```

**Fix:**
```javascript
{uploading && (
  <div style={{ marginTop: '12px', color: '#6B7280', fontSize: '0.84rem' }}>
    ⏳ Đang tải ảnh...
  </div>
)}
```

---

### **5. Không có error handling cho image upload**

**Vấn đề:**
```javascript
const res = await bugService.uploadImage(file);
if (res && res.url) {
  uploadedUrls.push(res.url);
}
// ❌ Nếu res.url = null thì sao?
```

**Fix:**
```javascript
const res = await bugService.uploadImage(file);
if (res && res.url) {
  uploadedUrls.push(res.url);
} else {
  console.error('Upload failed for file:', file.name);
  toast.error(`Không thể tải ${file.name}`);
}
```

---

### **6. Không validate file size/type**

**Vấn đề:**
```javascript
const handleImageUpload = async (e, field) => {
  const files = e.target.files;
  // ❌ KHÔNG check file size
  // ❌ KHÔNG check file type
```

**Fix:**
```javascript
const handleImageUpload = async (e, field) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  const invalidFiles = Array.from(files).filter(f => f.size > maxSize);
  if (invalidFiles.length > 0) {
    toast.error(`File quá lớn! Tối đa 5MB.`);
    return;
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const invalidTypes = Array.from(files).filter(f => !validTypes.includes(f.type));
  if (invalidTypes.length > 0) {
    toast.error(`Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)!`);
    return;
  }

  // Continue upload...
};
```

---

### **7. Không có max images limit**

**Vấn đề:**
```javascript
// User có thể upload vô hạn ảnh
```

**Fix:**
```javascript
const MAX_IMAGES = 5;

const handleImageUpload = async (e, field) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const currentCount = formData[field].length;
  const newCount = currentCount + files.length;

  if (newCount > MAX_IMAGES) {
    toast.error(`Tối đa ${MAX_IMAGES} ảnh!`);
    return;
  }

  // Continue upload...
};
```

---

### **8. Component dropdown có thể rỗng**

**Vấn đề:**
```javascript
{selectedScreen?.components?.map(c => (
  <option key={c.id} value={c.name}>{c.name}</option>
))}
// ❌ Nếu không có components thì chỉ có "Chung"
```

**Fix:**
```javascript
<select ...>
  <option value="Chung">Chung (Toàn màn hình)</option>
  {selectedScreen?.components && selectedScreen.components.length > 0 ? (
    selectedScreen.components.map(c => (
      <option key={c.id} value={c.name}>{c.name}</option>
    ))
  ) : (
    <option disabled>Chưa có components</option>
  )}
</select>
```

---

### **9. Không có keyboard shortcuts**

**Suggestion:**
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
  };
  
  if (show) {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }
}, [show]);
```

---

### **10. Không có click outside to close**

**Suggestion:**
```javascript
const handleOverlayClick = (e) => {
  if (e.target.className === 'modal-overlay') {
    onClose();
  }
};

<div className="modal-overlay" onClick={handleOverlayClick} ...>
```

---

## 🔧 **RECOMMENDED FIXES:**

### **Priority 1 (CRITICAL):**
1. ✅ Fix toast API calls
2. ✅ Add min date validation
3. ✅ Add file size/type validation
4. ✅ Add max images limit

### **Priority 2 (HIGH):**
5. ✅ Add loading state for image upload
6. ✅ Better error handling
7. ✅ Fix hardcoded screen code

### **Priority 3 (MEDIUM):**
8. ✅ Add keyboard shortcuts
9. ✅ Add click outside to close
10. ✅ Improve component dropdown

---

## 📊 **TESTING CHECKLIST:**

### **Functional:**
- [ ] Upload 1 ảnh → Success
- [ ] Upload nhiều ảnh → Success
- [ ] Upload file > 5MB → Error
- [ ] Upload file không phải ảnh → Error
- [ ] Upload > 5 ảnh → Error
- [ ] Remove ảnh → Success
- [ ] Submit không có ảnh → Error
- [ ] Submit không có description → Error
- [ ] Chọn màn hình → Component dropdown update
- [ ] Chọn component → Success
- [ ] Chọn người xử lý → Success
- [ ] Chọn ngày quá khứ → Không được

### **UI/UX:**
- [ ] Modal hiển thị đẹp
- [ ] Scroll smooth
- [ ] Sticky header hoạt động
- [ ] Backdrop blur
- [ ] Toast notifications
- [ ] Loading state khi upload
- [ ] ESC để đóng
- [ ] Click outside để đóng
- [ ] Ctrl+Enter để submit

---

## 💡 **SUGGESTIONS:**

### **1. Add drag & drop:**
```javascript
const handleDrop = (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  handleImageUpload({ target: { files } }, 'images');
};

<div 
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  ...
>
```

### **2. Add image preview modal:**
```javascript
const [previewImage, setPreviewImage] = useState(null);

<img 
  src={img} 
  onClick={() => setPreviewImage(img)}
  style={{ cursor: 'pointer' }}
/>

{previewImage && (
  <div className="image-preview-modal">
    <img src={previewImage} />
    <button onClick={() => setPreviewImage(null)}>×</button>
  </div>
)}
```

### **3. Add paste from clipboard:**
```javascript
useEffect(() => {
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        handleImageUpload({ target: { files: [file] } }, 'images');
      }
    }
  };
  
  if (show) {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }
}, [show]);
```

---

## 🎯 **OVERALL RATING:**

**Code Quality:** ⭐⭐⭐⭐☆ (4/5)  
**UI/UX:** ⭐⭐⭐⭐⭐ (5/5)  
**Functionality:** ⭐⭐⭐⭐☆ (4/5)  
**Error Handling:** ⭐⭐⭐☆☆ (3/5)  
**Validation:** ⭐⭐⭐⭐☆ (4/5)  

**TOTAL:** ⭐⭐⭐⭐☆ (4/5)

---

## ✅ **CONCLUSION:**

Component **tốt** nhưng cần fix một số vấn đề:
1. **Toast API** - CRITICAL
2. **File validation** - HIGH
3. **Error handling** - MEDIUM

Sau khi fix sẽ là **⭐⭐⭐⭐⭐ (5/5)**!

---

**Reviewed by:** ERP G7 Team  
**Date:** 16/07/2026 22:55
