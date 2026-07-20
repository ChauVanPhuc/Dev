# ✨ Feature: Nhúng ảnh Mockup vào file xuất

## 📋 Tổng quan

Đã implement tính năng nhúng ảnh mockup vào file DOCX khi xuất đặc tả chi tiết màn hình.

---

## ✅ Đã hoàn thành

### **1. Function nhúng ảnh vào DOCX**

**File**: `m:\ERP\BackEnd\modules\system\services\export_template_engine.py`

#### **`_docx_insert_image_if_needed()`**
- Tìm placeholder `{{mockup_image}}` trong paragraph
- Lấy `mockup_path` từ context
- Resolve đường dẫn tuyệt đối
- Nhúng ảnh vào DOCX với width 6 inches (~15cm)
- Xử lý lỗi: File không tồn tại, format không hỗ trợ...

#### **`_resolve_image_path()`**
- Chuyển đường dẫn tương đối → tuyệt đối
- Hỗ trợ các format:
  - `/static/uploads/mockups/abc.png`
  - `static/uploads/mockups/abc.png`
  - `uploads/mockups/abc.png`
- Base directory: `m:\ERP\BackEnd\`

### **2. Cập nhật template DOCX**

**File**: `m:\ERP\BackEnd\static\templates\screen_export\standard\screen_detail.docx`

Thêm section:
```
Ảnh Mockup
{{mockup_image}}
```

### **3. Cập nhật README**

**File**: `m:\ERP\BackEnd\static\templates\screen_export\README.md`

Thêm hướng dẫn về placeholder `{{mockup_image}}`

---

## 🎯 Cách sử dụng

### **Trong template DOCX**

1. Tạo paragraph mới
2. Gõ `{{mockup_image}}`
3. Save template

Khi export:
- Nếu màn hình có `mockup_path` → Ảnh sẽ được nhúng vào
- Nếu không có → Hiển thị "[Không có ảnh mockup]"

### **Từ UI**

1. Vào `/admin/screens`
2. Click menu 3 chấm (...) ở màn hình có ảnh mockup
3. Chọn "Xuất đặc tả chi tiết"
4. **Check** option "Ảnh Mockup giao diện"
5. Chọn format DOCX
6. Click "Xuất file"
7. Mở file → Ảnh mockup sẽ xuất hiện

---

## 🔧 Chi tiết kỹ thuật

### **Flow xử lý**

```
1. User chọn "include_mockup" = true
   ↓
2. Service collect mockup_path từ DB
   ↓
3. Context = { "mockup_path": "/static/uploads/mockups/screen_123.png" }
   ↓
4. Template engine tìm {{mockup_image}}
   ↓
5. _resolve_image_path() → "m:/ERP/BackEnd/static/uploads/mockups/screen_123.png"
   ↓
6. Check file exists
   ↓
7. Nhúng ảnh vào DOCX với width=6 inches
   ↓
8. Return file DOCX có ảnh
```

### **Xử lý lỗi**

| Trường hợp | Kết quả |
|------------|---------|
| `mockup_path` = None | "[Không có ảnh mockup]" |
| File không tồn tại | "[Không tìm thấy ảnh: /path/to/file.png]" |
| Format ảnh không hỗ trợ | "[Lỗi nhúng ảnh: ...]" |
| Ảnh quá lớn | Resize về width 6 inches, height auto |

### **Kích thước ảnh**

- **Width**: 6 inches (~15.24 cm)
- **Height**: Auto (giữ tỷ lệ)
- **DPI**: Mặc định của python-docx (72 DPI)

Nếu muốn thay đổi:
```python
from docx.shared import Inches, Cm

# Width 10cm
run.add_picture(image_path, width=Cm(10))

# Width 4 inches, height 3 inches
run.add_picture(image_path, width=Inches(4), height=Inches(3))
```

---

## 📦 Dependencies

### **Backend**
```bash
pip install python-docx pillow
```

- `python-docx`: Xử lý file DOCX
- `pillow`: Xử lý ảnh (resize, convert format)

---

## 🧪 Test Cases

### ✅ Test 1: Màn hình có ảnh mockup
1. Chọn màn hình có `mockup_path` = `/static/uploads/mockups/screen_123.png`
2. Check option "Ảnh Mockup giao diện"
3. Xuất DOCX
4. **Kỳ vọng**: File có ảnh mockup, kích thước ~15cm width

### ✅ Test 2: Màn hình không có ảnh
1. Chọn màn hình có `mockup_path` = None
2. Check option "Ảnh Mockup giao diện"
3. Xuất DOCX
4. **Kỳ vọng**: File có text "[Không có ảnh mockup]"

### ✅ Test 3: File ảnh không tồn tại
1. Chọn màn hình có `mockup_path` = `/static/uploads/mockups/not_exist.png`
2. Check option "Ảnh Mockup giao diện"
3. Xuất DOCX
4. **Kỳ vọng**: File có text "[Không tìm thấy ảnh: ...]"

### ✅ Test 4: Uncheck option "Ảnh Mockup"
1. Chọn màn hình có ảnh
2. **Uncheck** option "Ảnh Mockup giao diện"
3. Xuất DOCX
4. **Kỳ vọng**: File không có ảnh, placeholder `{{mockup_image}}` bị xóa

### ✅ Test 5: Nhiều định dạng ảnh
1. Test với PNG, JPG, JPEG, BMP, GIF
2. **Kỳ vọng**: Tất cả đều nhúng được vào DOCX

---

## ⚠️ Lưu ý

### **1. Đường dẫn ảnh trong DB**

Đảm bảo `mockup_path` trong DB có format:
- ✅ `/static/uploads/mockups/screen_123.png`
- ✅ `static/uploads/mockups/screen_123.png`
- ✅ `uploads/mockups/screen_123.png`
- ❌ `C:\Users\...\screen_123.png` (absolute path Windows)
- ❌ `http://example.com/image.png` (URL)

### **2. Kích thước file**

- Ảnh lớn (>5MB) sẽ làm file DOCX nặng
- Nên resize ảnh trước khi upload
- Hoặc thêm logic resize trong `_docx_insert_image_if_needed()`

### **3. Format ảnh hỗ trợ**

python-docx hỗ trợ:
- ✅ PNG, JPG, JPEG, BMP, GIF, TIFF
- ❌ SVG, WebP (cần convert trước)

### **4. Excel và PDF**

Hiện tại chỉ hỗ trợ DOCX. Để hỗ trợ Excel/PDF:
- **Excel**: Dùng `openpyxl` + `PIL` để insert image vào sheet
- **PDF**: Dùng `reportlab` hoặc `fpdf` để vẽ ảnh

---

## 🚀 Cải tiến tiếp theo

### **Ngắn hạn**
1. ✅ Test với nhiều format ảnh
2. ⚠️ Thêm resize ảnh nếu quá lớn (>2MB)
3. ⚠️ Hỗ trợ nhiều ảnh (mockup mobile + web)

### **Trung hạn**
1. ⚠️ Hỗ trợ nhúng ảnh vào Excel
2. ⚠️ Hỗ trợ nhúng ảnh vào PDF
3. ⚠️ Compress ảnh trước khi nhúng

### **Dài hạn**
1. ⚠️ Watermark trên ảnh (logo SmartFlow)
2. ⚠️ Crop/resize ảnh theo template
3. ⚠️ Gallery nhiều ảnh (mockup + screenshots)

---

## 📝 Code Example

### **Thêm ảnh vào template DOCX thủ công**

```python
from docx import Document
from docx.shared import Inches

doc = Document()
doc.add_heading('Ảnh Mockup', 1)

# Placeholder - sẽ được thay thế khi export
doc.add_paragraph('{{mockup_image}}')

doc.save('template.docx')
```

### **Resize ảnh trước khi nhúng**

```python
from PIL import Image
from docx.shared import Inches

def resize_image_if_large(image_path, max_width_inches=6):
    """Resize ảnh nếu quá lớn"""
    img = Image.open(image_path)
    
    # Convert inches to pixels (72 DPI)
    max_width_px = int(max_width_inches * 72)
    
    if img.width > max_width_px:
        ratio = max_width_px / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width_px, new_height), Image.LANCZOS)
        
        # Save to temp file
        temp_path = image_path + '.resized.png'
        img.save(temp_path)
        return temp_path
    
    return image_path
```

---

## ✅ Kết luận

Đã implement thành công tính năng nhúng ảnh mockup vào file DOCX:
- ✅ Tự động nhúng ảnh từ `mockup_path`
- ✅ Xử lý lỗi đầy đủ (file không tồn tại, format không hỗ trợ...)
- ✅ Kích thước ảnh tự động (6 inches width)
- ✅ Template đã cập nhật với placeholder `{{mockup_image}}`

**Cần restart backend server** để áp dụng!
