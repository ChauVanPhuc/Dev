# 🧪 Quick Test Guide - Export Đặc Tả Chi Tiết

## ✅ Checklist trước khi test

### **1. Restart Backend Server**
```powershell
# Tìm terminal đang chạy server
# Nhấn Ctrl+C để dừng
# Chạy lại:
cd m:\ERP\BackEnd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. Kiểm tra files đã tạo**
```powershell
# Template DOCX
ls m:\ERP\BackEnd\static\templates\screen_export\standard\screen_detail.docx

# Service files
ls m:\ERP\BackEnd\modules\system\services\screen_export_detail_service.py
ls m:\ERP\BackEnd\modules\system\services\export_template_engine.py
```

---

## 🎯 Test Scenarios

### **Test 1: Xuất DOCX với ảnh mockup**

**Steps**:
1. Vào `http://localhost:3000/admin/screens`
2. Tìm màn hình có ảnh mockup (ví dụ: HS01.1 - Thông tin nhân sự)
3. Click menu 3 chấm (...) → "Xuất đặc tả chi tiết"
4. Modal hiển thị:
   - ✅ Thông tin màn hình đúng
   - ✅ Chọn format: **DOCX**
   - ✅ Check: Thông tin cơ bản, **Ảnh Mockup**, Components
   - ✅ Template: Standard
5. Click "Xuất file"

**Expected**:
- ✅ File tải về: `HS01.1_detail_[timestamp].docx`
- ✅ Mở file Word:
  - Có title "ĐẶC TẢ CHI TIẾT MÀN HÌNH"
  - Có thông tin: Mã, Tên, Nền tảng, Trạng thái
  - **Có ảnh mockup** (không phải text `{{mockup_image}}`)
  - Có table Components với dữ liệu thật
  - Có footer: Ngày xuất, Người xuất

---

### **Test 2: Xuất DOCX không có ảnh**

**Steps**:
1. Chọn màn hình không có ảnh mockup
2. Click "Xuất đặc tả chi tiết"
3. **Uncheck** "Ảnh Mockup giao diện"
4. Click "Xuất file"

**Expected**:
- ✅ File tải về
- ✅ Mở file: Không có section "Ảnh Mockup"

---

### **Test 3: Xuất nhiều lần liên tiếp**

**Steps**:
1. Xuất lần 1 → Thành công
2. Đóng modal
3. Mở lại modal → Xuất lần 2
4. Đóng modal
5. Mở lại modal → Xuất lần 3

**Expected**:
- ✅ Tất cả 3 lần đều thành công
- ✅ Không có lỗi 400 Bad Request
- ✅ State modal reset mỗi lần mở

---

### **Test 4: Xuất Excel**

**Steps**:
1. Click "Xuất đặc tả chi tiết"
2. Chọn format: **Excel**
3. Check: Thông tin cơ bản, Components
4. Click "Xuất file"

**Expected**:
- ✅ File tải về: `[screen_code]_detail_[timestamp].xlsx`
- ✅ Mở Excel:
  - Sheet "Thông tin": Mã màn hình, Tên, Nền tảng...
  - Sheet "Components": Table với STT, Tên, Loại, Mô tả

---

### **Test 5: Màn hình không có components**

**Steps**:
1. Chọn màn hình mới tạo (chưa có components)
2. Xuất DOCX với option "Components" checked
3. Click "Xuất file"

**Expected**:
- ✅ File tải về
- ✅ Mở file: Table Components có header nhưng không có data rows
- ✅ Không bị lỗi

---

## 🐛 Troubleshooting

### **Lỗi: File chỉ có placeholder `{{stt}}`, `{{name}}`**
**Nguyên nhân**: Server chưa restart
**Fix**: Restart backend server

### **Lỗi: 400 Bad Request lần 2 trở đi**
**Nguyên nhân**: State modal không reset
**Fix**: Đã fix bằng useEffect, cần refresh trang

### **Lỗi: Không có ảnh mockup trong file**
**Nguyên nhân**: 
- Template chưa có placeholder `{{mockup_image}}`
- Hoặc `mockup_path` trong DB = null
**Fix**: 
- Kiểm tra template
- Kiểm tra DB: `SELECT mockup_path FROM system_screens WHERE id = ?`

### **Lỗi: "[Không tìm thấy ảnh: ...]"**
**Nguyên nhân**: File ảnh không tồn tại
**Fix**: 
- Kiểm tra đường dẫn: `ls m:\ERP\BackEnd\static\uploads\mockups\`
- Upload lại ảnh mockup

---

## 📊 Test Results Template

```
Test Date: [DD/MM/YYYY]
Tester: [Your Name]

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1: DOCX với ảnh | ✅/❌ | |
| Test 2: DOCX không ảnh | ✅/❌ | |
| Test 3: Xuất nhiều lần | ✅/❌ | |
| Test 4: Excel | ✅/❌ | |
| Test 5: Không có components | ✅/❌ | |

Issues found:
1. [Mô tả lỗi nếu có]
2. ...
```

---

## ✅ Sign-off Checklist

Trước khi deploy production:
- [ ] Tất cả test cases pass
- [ ] Template DOCX đẹp, chuyên nghiệp
- [ ] Ảnh mockup hiển thị đúng kích thước
- [ ] Không có lỗi console
- [ ] Performance OK (xuất file < 5s)
- [ ] File size hợp lý (< 10MB)
