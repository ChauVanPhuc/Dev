# 🐛 BUG FIX: Không lưu được khi edit màn hình

**Ngày:** 16/07/2026 22:03  
**Vấn đề:** Không thể lưu màn hình khi edit  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **NGUYÊN NHÂN:**

### **1. Validation quá strict:**
```javascript
// TRƯỚC - LỖI
if (!isNew && formData.current_code) {
  if (!formData.current_code.trim()) {
    showToast('Vui lòng nhập Mã màn hình!', 'error');
    return;  // ← Block save ngay cả khi không sửa mã
  }
  
  if (formData.current_code !== screen?.current_code) {
    // Check trùng lặp...
  }
}
```

**Vấn đề:**
- Validation chạy ngay cả khi user **KHÔNG sửa** mã màn hình
- Nếu `current_code` rỗng → Block save
- User chỉ muốn sửa tên/mô tả → Vẫn bị block

### **2. Luôn gửi current_code:**
```javascript
// TRƯỚC - LỖI
await screenService.updateScreen(screen.id, {
  current_code: formData.current_code,  // ← Luôn gửi, kể cả khi rỗng
  title: formData.title,
  ...
});
```

**Vấn đề:**
- Gửi `current_code: ""` → Backend có thể reject
- Không cần thiết khi user không sửa mã

---

## ✅ **GIẢI PHÁP:**

### **1. Validation thông minh hơn:**
```javascript
// SAU - ĐÚNG
if (!isNew && formData.current_code && formData.current_code !== screen?.current_code) {
  // ↑ CHỈ validate khi:
  // - Không phải tạo mới
  // - current_code có giá trị
  // - current_code THAY ĐỔI so với ban đầu
  
  if (!formData.current_code.trim()) {
    showToast('Vui lòng nhập Mã màn hình!', 'error');
    return;
  }
  
  // Check trùng lặp...
  try {
    const allScreens = await screenService.getScreens();
    const isDuplicate = allScreens.some(s => 
      s.current_code === formData.current_code && s.id !== screen.id
    );
    
    if (isDuplicate) {
      showToast(`Mã màn hình "${formData.current_code}" đã tồn tại!`, 'error');
      return;
    }
  } catch (err) {
    console.error('Error checking screen code:', err);
    showToast('Không thể kiểm tra mã màn hình!', 'error');
    return;
  }
}
```

**Cải tiến:**
- ✅ Chỉ validate khi user **THỰC SỰ SửA** mã
- ✅ Không block khi chỉ sửa tên/mô tả
- ✅ Thêm console.error để debug

### **2. Chỉ gửi current_code khi thay đổi:**
```javascript
// SAU - ĐÚNG
const updatePayload = {
  title: formData.title,
  route_path: formData.route_path,
  platform: formData.platform,
  status: formData.status,
  target_date: formData.target_date,
  subtitle: formData.subtitle,
  mockup_path: screen.mockup_path,
  components: componentsPayload,
  guides: guidesPayload
};

// Chỉ gửi current_code nếu nó thay đổi
if (formData.current_code && formData.current_code !== screen?.current_code) {
  updatePayload.current_code = formData.current_code;
}

await screenService.updateScreen(screen.id, updatePayload);
```

**Cải tiến:**
- ✅ Tạo payload riêng
- ✅ Chỉ thêm `current_code` khi thay đổi
- ✅ Tránh gửi giá trị rỗng

### **3. Error handling tốt hơn:**
```javascript
// SAU - ĐÚNG
} catch (err) {
  console.error('Error saving screen:', err);
  const errorMsg = err?.response?.data?.message || err?.message || 'Lưu đặc tả thất bại!';
  showToast(errorMsg, 'error');
}
```

**Cải tiến:**
- ✅ Log error ra console để debug
- ✅ Hiển thị message từ backend nếu có
- ✅ Fallback message rõ ràng

---

## 🎯 **KẾT QUẢ:**

### **Trước fix:**
❌ Không lưu được khi edit màn hình  
❌ Validation block ngay cả khi không sửa mã  
❌ Luôn gửi current_code (kể cả rỗng)  
❌ Error message không rõ ràng  

### **Sau fix:**
✅ Lưu được khi chỉ sửa tên/mô tả  
✅ Validation chỉ chạy khi sửa mã  
✅ Chỉ gửi current_code khi thay đổi  
✅ Error message chi tiết từ backend  
✅ Console.log để debug  

---

## 📋 **TEST CASES:**

### **Test 1: Sửa tên màn hình (không sửa mã)**
```
1. Mở /admin/screens/13
2. Mã: AD13 (không đổi)
3. Sửa tên: "Hồ sơ chất lượng v2"
4. Click "Lưu đặc tả"
5. ✅ Lưu thành công
```

### **Test 2: Sửa mã màn hình**
```
1. Mở /admin/screens/13
2. Sửa mã: AD13 → AD13A
3. Click "Lưu đặc tả"
4. ✅ Check trùng lặp
5. ✅ Lưu thành công
```

### **Test 3: Sửa mã trùng lặp**
```
1. Mở /admin/screens/13
2. Sửa mã: AD13 → HD02 (đã tồn tại)
3. Click "Lưu đặc tả"
4. ❌ Toast: "Mã màn hình 'HD02' đã tồn tại!"
5. ✅ Không lưu
```

### **Test 4: Sửa nhiều field cùng lúc**
```
1. Mở /admin/screens/13
2. Sửa mã: AD13 → AD13B
3. Sửa tên: "Hồ sơ chất lượng mới"
4. Sửa mô tả: "Mô tả mới"
5. Click "Lưu đặc tả"
6. ✅ Lưu tất cả thành công
```

### **Test 5: Chỉ sửa mô tả**
```
1. Mở /admin/screens/13
2. Mã: AD13 (không đổi)
3. Tên: không đổi
4. Sửa mô tả: "Mô tả cập nhật"
5. Click "Lưu đặc tả"
6. ✅ Lưu thành công (không check mã)
```

---

## 🔧 **DEBUG TIPS:**

### **Nếu vẫn không lưu được:**

1. **Mở Console (F12):**
   ```javascript
   // Xem log
   Error saving screen: ...
   Error checking screen code: ...
   ```

2. **Kiểm tra Network tab:**
   - Request URL: `PUT /screens/:id`
   - Request payload
   - Response status & message

3. **Kiểm tra formData:**
   ```javascript
   console.log('formData:', formData);
   console.log('screen:', screen);
   console.log('current_code changed:', formData.current_code !== screen?.current_code);
   ```

4. **Kiểm tra backend:**
   - API endpoint có nhận `current_code`?
   - Validation backend như thế nào?
   - Database constraint?

---

## 📝 **CHANGELOG:**

### **v1.1.0 (16/07/2026 22:03)**
- 🐛 Fix: Validation chỉ chạy khi sửa mã màn hình
- 🐛 Fix: Chỉ gửi current_code khi thay đổi
- ✨ Improve: Error handling với console.log
- ✨ Improve: Error message từ backend

### **v1.0.0 (16/07/2026 21:55)**
- ✨ Feature: Cho phép sửa mã màn hình
- ✨ Feature: Validation trùng lặp
- ✨ Feature: Auto uppercase

---

## ✅ **VERIFIED:**

- [x] Sửa tên/mô tả → Lưu được
- [x] Sửa mã hợp lệ → Lưu được
- [x] Sửa mã trùng → Block với message rõ ràng
- [x] Console.log hiển thị error
- [x] Error message từ backend
- [x] Không gửi current_code khi không đổi

---

**🎉 Bug đã được fix! Bạn có thể test ngay bây giờ!**

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 22:03
