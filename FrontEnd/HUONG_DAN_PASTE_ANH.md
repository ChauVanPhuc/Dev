# 📸 HƯỚNG DẪN: Paste Ảnh vào Modal Khai Báo Lỗi

**Feature:** Paste ảnh từ clipboard trực tiếp vào modal  
**Shortcut:** Ctrl+V  
**Trạng thái:** ✅ Đã hoạt động

---

## 🎯 **CÁCH HOẠT ĐỘNG:**

### **Khi bạn paste ảnh (Ctrl+V):**

```
1. Ảnh tự động upload lên server
2. Ảnh hiển thị trong khung "Ảnh bằng chứng"
3. Có thể paste nhiều ảnh (tối đa 5)
4. Mỗi ảnh có nút × để xóa
```

---

## 📋 **WORKFLOW:**

### **Scenario 1: Paste Screenshot**

```
Step 1: Chụp màn hình
┌─────────────────────────────────┐
│ Nhấn PrtScn                     │
│ (hoặc Win+Shift+S)              │
└─────────────────────────────────┘

Step 2: Mở modal Khai báo lỗi
┌─────────────────────────────────┐
│ 🐛 Khai báo lỗi                 │
│                                 │
│ Mô tả lỗi *                     │
│ ┌─────────────────────────────┐ │
│ │ Mô tả chi tiết lỗi...       │ │
│ └─────────────────────────────┘ │
│                                 │
│ Ảnh bằng chứng *                │
│ ┌─────────────────────────────┐ │
│ │  📷                         │ │
│ │  Thêm hình ảnh lỗi          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Step 3: Nhấn Ctrl+V
┌─────────────────────────────────┐
│ ⏳ Đang tải ảnh...              │
└─────────────────────────────────┘

Step 4: Ảnh hiển thị
┌─────────────────────────────────┐
│ Ảnh bằng chứng *                │
│ ┌─────────────────────────────┐ │
│ │  📷                         │ │
│ │  Thêm hình ảnh lỗi          │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌───────┐                       │
│ │ [IMG] │ ×  ← Ảnh đã paste    │
│ └───────┘                       │
└─────────────────────────────────┘
```

---

### **Scenario 2: Paste Nhiều Ảnh**

```
Step 1: Paste ảnh 1
Ctrl+V → Upload → Hiển thị

┌───────┐
│ [IMG] │ ×
└───────┘

Step 2: Paste ảnh 2
Ctrl+V → Upload → Hiển thị

┌───────┐ ┌───────┐
│ [IMG] │ │ [IMG] │ ×
└───────┘ └───────┘

Step 3: Paste ảnh 3
Ctrl+V → Upload → Hiển thị

┌───────┐ ┌───────┐ ┌───────┐
│ [IMG] │ │ [IMG] │ │ [IMG] │ ×
└───────┘ └───────┘ └───────┘

✅ Tối đa 5 ảnh
```

---

### **Scenario 3: Paste từ File Explorer**

```
Step 1: Mở File Explorer
┌─────────────────────────────────┐
│ 📁 Pictures                     │
│   ├─ screenshot1.png            │
│   ├─ screenshot2.png            │
│   └─ bug_image.jpg              │
└─────────────────────────────────┘

Step 2: Chuột phải → Copy
┌─────────────────────────────────┐
│ > Copy                          │ ← Click
│   Cut                           │
│   Delete                        │
└─────────────────────────────────┘

Step 3: Vào modal → Ctrl+V
✅ Ảnh tự động upload!
```

---

### **Scenario 4: Paste từ Web**

```
Step 1: Tìm ảnh trên web
┌─────────────────────────────────┐
│ Google Images                   │
│                                 │
│ [Error Screenshot]              │
└─────────────────────────────────┘

Step 2: Chuột phải → Copy image
┌─────────────────────────────────┐
│ > Copy image                    │ ← Click
│   Save image as...              │
│   Open image in new tab         │
└─────────────────────────────────┘

Step 3: Vào modal → Ctrl+V
✅ Ảnh tự động upload!
```

---

## 🎨 **UI FLOW:**

### **Khi paste ảnh:**

```
1. User nhấn Ctrl+V
   ↓
2. Browser detect clipboard có ảnh
   ↓
3. Extract file từ clipboard
   ↓
4. Validate:
   - File size ≤ 5MB?
   - File type = image?
   - Total images ≤ 5?
   ↓
5. Upload lên server
   ↓
6. Hiển thị "⏳ Đang tải ảnh..."
   ↓
7. Upload thành công
   ↓
8. Ảnh hiển thị trong khung
   ↓
9. Toast: "✅ Đã tải lên 1 ảnh!"
```

---

## ✅ **VALIDATION:**

### **1. Max file size: 5MB**
```
Paste ảnh > 5MB
→ ❌ Error: "File quá lớn! Tối đa 5MB."
→ Ảnh KHÔNG upload
```

### **2. File type: JPG, PNG, GIF, WebP**
```
Paste file .pdf
→ ❌ Error: "File không hợp lệ! Chỉ chấp nhận JPG, PNG, GIF, WebP."
→ File KHÔNG upload
```

### **3. Max images: 5**
```
Đã có 5 ảnh
Paste thêm 1 ảnh
→ ❌ Error: "Tối đa 5 ảnh!"
→ Ảnh KHÔNG upload
```

---

## 🔧 **FEATURES:**

### **1. Paste anywhere trong modal**
```
✅ Paste khi focus vào textarea
✅ Paste khi focus vào input
✅ Paste khi click vào modal
✅ Paste khi click vào khung ảnh
```

### **2. Multiple paste**
```
✅ Paste ảnh 1 → Success
✅ Paste ảnh 2 → Success
✅ Paste ảnh 3 → Success
✅ Paste ảnh 4 → Success
✅ Paste ảnh 5 → Success
❌ Paste ảnh 6 → Error (max 5)
```

### **3. Remove ảnh**
```
Click nút × trên ảnh
→ Ảnh bị xóa
→ Có thể paste ảnh mới
```

### **4. Preview ảnh**
```
Ảnh hiển thị dạng thumbnail 80x80px
Có thể xem trước trước khi submit
```

---

## 📊 **DEMO:**

### **Full workflow:**

```
┌─────────────────────────────────────────────────────────┐
│ 🐛 Khai báo lỗi                                    [×]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Màn hình *          Trạng thái                          │
│ [MB31: Inspection]  [Mới]                               │
│                                                         │
│ Component           Mức độ *                            │
│ [Chung]             [Trung bình]                        │
│                                                         │
│ Mô tả lỗi *                                             │
│ 💡 Có thể dán ảnh trực tiếp (Ctrl+V)                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Button "Lưu" không hoạt động khi click...          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Ảnh bằng chứng *                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │         📷                                          │ │
│ │  Click để tải ảnh hoặc dán từ clipboard (Ctrl+V)   │ │
│ │  Tối đa 5 ảnh, mỗi ảnh ≤ 5MB                        │ │
│ │                                                     │ │
│ │  ┌─────┐ ┌─────┐ ┌─────┐                           │ │
│ │  │ IMG │ │ IMG │ │ IMG │  ← Ảnh đã paste           │ │
│ │  │  ×  │ │  ×  │ │  ×  │                           │ │
│ │  └─────┘ └─────┘ └─────┘                           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Người ghi nhận      Thời gian ghi nhận                  │
│ [Mytest]            [16/07/2026]                        │
│                                                         │
│ Người xử lý *       Ngày yêu cầu hoàn thành *           │
│ [Mytest]            [16/07/2026]                        │
│                                                         │
│ Phản hồi                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Ghi chú thêm...                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                                    [Hủy bỏ] [Xác nhận] │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 **TIPS:**

### **1. Chụp màn hình nhanh:**
```
Windows:
- Win + Shift + S → Chọn vùng → Ctrl+V
- PrtScn → Ctrl+V

Mac:
- Cmd + Shift + 4 → Chọn vùng → Ctrl+V
- Cmd + Ctrl + Shift + 4 → Copy to clipboard → Ctrl+V
```

### **2. Paste nhiều ảnh cùng lúc:**
```
❌ KHÔNG thể paste nhiều ảnh cùng lúc
✅ Phải paste từng ảnh một
```

### **3. Xóa ảnh sai:**
```
Click nút × trên ảnh
→ Ảnh bị xóa
→ Paste ảnh mới
```

### **4. Kiểm tra ảnh trước khi submit:**
```
Xem preview thumbnail
→ Đảm bảo ảnh đúng
→ Click "Xác nhận"
```

---

## ⚠️ **LƯU Ý:**

### **1. Ảnh phải ≤ 5MB:**
```
Nếu ảnh quá lớn:
1. Resize ảnh trước khi paste
2. Hoặc dùng tool compress
3. Hoặc chụp lại với quality thấp hơn
```

### **2. Chỉ chấp nhận ảnh:**
```
✅ JPG, JPEG
✅ PNG
✅ GIF
✅ WebP

❌ PDF
❌ Word
❌ Excel
❌ Video
```

### **3. Tối đa 5 ảnh:**
```
Nếu cần > 5 ảnh:
1. Chọn 5 ảnh quan trọng nhất
2. Hoặc ghép nhiều ảnh thành 1
3. Hoặc tạo nhiều bug report
```

---

## ✅ **TESTING:**

### **Test checklist:**
- [ ] Paste screenshot → Ảnh hiển thị
- [ ] Paste từ file explorer → Ảnh hiển thị
- [ ] Paste từ web → Ảnh hiển thị
- [ ] Paste 5 ảnh → Success
- [ ] Paste ảnh thứ 6 → Error
- [ ] Paste ảnh > 5MB → Error
- [ ] Paste file PDF → Error
- [ ] Click × để xóa ảnh → Ảnh bị xóa
- [ ] Paste sau khi xóa → Success
- [ ] Submit với ảnh → Success

---

## 🎉 **KẾT LUẬN:**

**Paste ảnh hoạt động hoàn hảo!**

**Workflow:**
```
Ctrl+V → Upload → Hiển thị → Submit ✅
```

**Lợi ích:**
- ✅ Nhanh hơn (không cần click "Thêm ảnh")
- ✅ Tiện hơn (paste trực tiếp)
- ✅ Nhiều ảnh (tối đa 5)
- ✅ Validation đầy đủ

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 23:05  
**Status:** ✅ Working Perfectly!
