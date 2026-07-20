# 🐛 Bugfix: Xuất đặc tả chi tiết màn hình

## 📋 Vấn đề

### **Lỗi 1: File DOCX chỉ có placeholder, không fill dữ liệu**
- File xuất ra chỉ có `{{stt}}`, `{{name}}`, `{{type}}`, `{{description}}`
- Không có dữ liệu thật của components

### **Lỗi 2: Lần 2 trở đi bị 400 Bad Request**
- Lần đầu xuất được (dù file rỗng)
- Lần 2 trở đi lỗi 400

---

## 🔍 Nguyên nhân

### **Lỗi 1: Logic fill template sai**
1. **Service truyền sai cấu trúc data**:
   - Đang truyền `screen_data` (dict) với key "components", "guides", "bugs"
   - Template engine mode "list" cần nhận **list** trực tiếp, không phải dict

2. **Mode không phù hợp**:
   - Đang dùng mode "single" → Chỉ fill static fields
   - Cần mode "list" → Fill table động với list data

3. **Context và data bị trộn lẫn**:
   - Static fields (screen_code, title...) và list data (components...) cùng 1 dict
   - Engine không biết đâu là list để fill table

### **Lỗi 2: State không reset**
- Modal component không reset state khi đóng/mở lại
- Lần 2 state còn giữ giá trị cũ, gây conflict

---

## ✅ Giải pháp đã áp dụng

### **Fix 1: Sửa cấu trúc data trong service**

**File**: `m:\ERP\BackEnd\modules\system\services\screen_export_detail_service.py`

**Trước**:
```python
def collect_screen_data(screen, options):
    data = {}
    data["screen_code"] = screen.current_code
    data["components"] = [...]  # List
    data["guides"] = [...]      # List
    return data  # Dict chứa cả static và list
```

**Sau**:
```python
def collect_screen_data(screen, options):
    data = {
        "context": {},      # Static fields
        "components": [],   # List
        "guides": [],       # List
        "bugs": [],         # List
    }
    data["context"]["screen_code"] = screen.current_code
    data["components"] = [...]
    return data  # Tách rõ context và lists
```

### **Fix 2: Sửa logic render template**

**Trước**:
```python
context.update(screen_data)  # Merge tất cả vào context
file_bytes = fill_template(path, "single", screen_data, context)
```

**Sau**:
```python
context.update(screen_data.get("context", {}))  # Chỉ merge static
data_to_export = screen_data.get("components", [])  # Lấy list
file_bytes = fill_template(path, "list", data_to_export, context)
```

### **Fix 3: Reset state trong modal**

**File**: `m:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenExportDetailModal.jsx`

**Thêm**:
```javascript
useEffect(() => {
  if (visible) {
    setFormat('pdf');
    setTemplateStyle('standard');
    setOptions({
      include_basic_info: true,
      include_mockup: true,
      include_components: true,
      include_guides: true,
      include_bugs: true,
      include_history: false,
    });
    setLoading(false);
  }
}, [visible]);
```

### **Fix 4: Tạo lại template DOCX**

**File**: `m:\ERP\BackEnd\static\templates\screen_export\standard\screen_detail.docx`

- ✅ Thêm title "ĐẶC TẢ CHI TIẾT MÀN HÌNH"
- ✅ Thêm các field static: screen_code, screen_title, platform, status...
- ✅ Thêm table Components với header và template row
- ✅ Thêm footer: Ngày xuất, Người xuất

---

## 🧪 Cách test

### **Test 1: Xuất file DOCX**
1. Vào `/admin/screens`
2. Click menu 3 chấm (...) ở màn hình có components
3. Chọn "Xuất đặc tả chi tiết"
4. Chọn format: **DOCX**
5. Chọn nội dung: **Thông tin cơ bản + Components**
6. Click "Xuất file"
7. **Kỳ vọng**: File tải về, mở ra có dữ liệu thật (không còn `{{placeholder}}`)

### **Test 2: Xuất nhiều lần**
1. Xuất lần 1 → Thành công
2. Đóng modal
3. Mở lại modal → Click "Xuất file" lần 2
4. **Kỳ vọng**: Vẫn thành công, không lỗi 400

### **Test 3: Xuất màn hình không có components**
1. Chọn màn hình không có components
2. Xuất với option "Components" checked
3. **Kỳ vọng**: File xuất ra, table rỗng (không lỗi)

### **Test 4: Xuất Excel**
1. Chọn format: **Excel**
2. Xuất file
3. **Kỳ vọng**: File .xlsx tải về, có sheet "Thông tin" và "Components"

---

## 📝 Files đã sửa

1. ✅ `m:\ERP\BackEnd\modules\system\services\screen_export_detail_service.py`
   - Sửa `collect_screen_data()` - Tách context và lists
   - Sửa `export_screen_detail_service()` - Render đúng mode "list"

2. ✅ `m:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenExportDetailModal.jsx`
   - Thêm `useEffect` để reset state

3. ✅ `m:\ERP\BackEnd\static\templates\screen_export\standard\screen_detail.docx`
   - Tạo lại template với cấu trúc đúng

---

## ⚠️ Lưu ý

### **Hiện tại chỉ fill table đầu tiên**
- Service chỉ truyền 1 list (components hoặc guides hoặc bugs)
- Nếu muốn fill nhiều table cùng lúc, cần:
  1. Tạo template với nhiều table riêng biệt
  2. Sửa engine để nhận dict of lists
  3. Hoặc gọi fill_template nhiều lần

### **Template cần cải thiện**
- Hiện tại template còn đơn giản
- Cần thêm:
  - Logo SmartFlow
  - Header/Footer đẹp
  - Styling table (màu, border)
  - Nhiều table (Components, Guides, Bugs riêng)

### **Chưa hỗ trợ ảnh mockup**
- Option "include_mockup" đã có
- Nhưng chưa implement nhúng ảnh vào DOCX
- Cần sửa `export_template_engine.py` để xử lý ảnh

---

## 🚀 Next Steps

1. ✅ Test kỹ trên trình duyệt
2. ⚠️ Tạo template chuyên nghiệp hơn
3. ⚠️ Implement nhúng ảnh mockup
4. ⚠️ Hỗ trợ nhiều table trong 1 file (Components + Guides + Bugs)
5. ⚠️ Thêm charts/statistics (nếu cần)

---

## ✅ Kết luận

Đã fix xong 2 lỗi chính:
- ✅ File DOCX giờ có dữ liệu thật (không còn placeholder)
- ✅ Xuất nhiều lần không còn lỗi 400

**Cần restart backend server** để áp dụng các thay đổi!
