# 🐛 BUG FIX: /admin/screens/:id Bị Trắng Màn Hình

**Ngày:** 16/07/2026 22:31  
**Lỗi:** Trang `/admin/screens/:id` bị trắng sau khi chạy script migration  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **NGUYÊN NHÂN:**

Script `auto-migrate-all.py` đã thêm `useEffect` sử dụng `screenCode`, `title`, `subtitle`, nhưng **QUÊN THÊM** dòng gọi hook `useScreenMetadataCached`!

### **Code bị lỗi:**

```javascript
const ScreenDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === 'new';
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const outletContext = useOutletContext() || {};
  const { showModal, startGlobalUpload, activeUploads, setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  
  const [screen, setScreen] = useState(null);
  
  // ❌ LỖI: Dùng screenCode, title, subtitle nhưng CHƯA ĐỊNH NGHĨA
  useEffect(() => {
    if (screenCode && title) {  // ← screenCode is not defined!
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  
  // ...
};
```

**Kết quả:**
- `ReferenceError: screenCode is not defined`
- Trang bị crash → Màn hình trắng
- Console báo lỗi

---

## ✅ **GIẢI PHÁP:**

### **Thêm hook useScreenMetadataCached:**

```javascript
const ScreenDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === 'new';
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const outletContext = useOutletContext() || {};
  const { showModal, startGlobalUpload, activeUploads, setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  
  // ✅ THÊM: Dynamic metadata - chỉ dùng khi KHÔNG phải trang new
  const { screenCode, title, subtitle } = useScreenMetadataCached(
    isNew ? null : '/admin/screens/:id'
  );
  
  const [screen, setScreen] = useState(null);
  
  // ✅ FIX: Thêm điều kiện cho trang new
  useEffect(() => {
    if (!isNew && screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    } else if (isNew) {
      // Fallback cho trang tạo mới
      if (setCustomTitle) setCustomTitle('Đặc tả màn hình');
      if (setCustomSubtitle) setCustomSubtitle('Tạo mới đặc tả màn hình');
      if (setCustomScreenCode) setCustomScreenCode('HD03');
    }
  }, [isNew, screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  
  // ...
};
```

---

## 🎯 **CẢI TIẾN:**

### **1. Thêm hook với conditional route:**
```javascript
const { screenCode, title, subtitle } = useScreenMetadataCached(
  isNew ? null : '/admin/screens/:id'
);
```

**Lý do:**
- Khi `isNew = true` (trang `/admin/screens/new`), không cần fetch metadata
- Khi `isNew = false` (trang `/admin/screens/13`), fetch metadata từ DB

### **2. Thêm fallback cho trang new:**
```javascript
} else if (isNew) {
  if (setCustomTitle) setCustomTitle('Đặc tả màn hình');
  if (setCustomSubtitle) setCustomSubtitle('Tạo mới đặc tả màn hình');
  if (setCustomScreenCode) setCustomScreenCode('HD03');
}
```

**Lý do:**
- Trang tạo mới không có metadata trong DB
- Cần hardcode title/subtitle cho trang này

### **3. Thêm điều kiện !isNew:**
```javascript
if (!isNew && screenCode && title) {
```

**Lý do:**
- Chỉ set metadata khi KHÔNG phải trang new
- Tránh conflict giữa dynamic metadata và hardcoded values

---

## 🔧 **SCRIPT ISSUE:**

Script `auto-migrate-all.py` có bug:
- ✅ Thêm import `useScreenMetadataCached` ✓
- ✅ Thêm `useEffect` với `screenCode`, `title`, `subtitle` ✓
- ❌ **QUÊN** thêm dòng gọi hook `useScreenMetadataCached(...)` ✗

**Cần fix script để:**
1. Detect vị trí đúng để insert hook call
2. Handle edge cases (trang new, dynamic routes, etc.)
3. Thêm validation sau khi migrate

---

## ✅ **VERIFIED:**

- [x] Trang `/admin/screens/13` hiển thị bình thường
- [x] Trang `/admin/screens/new` hiển thị bình thường
- [x] Header hiển thị đúng metadata
- [x] Không có ReferenceError
- [x] Console sạch sẽ

---

## 📋 **TESTING CHECKLIST:**

### **Test 1: Trang detail existing screen**
```
1. Vào /admin/screens/13
2. ✅ Trang hiển thị bình thường
3. ✅ Header: "AD13: Hồ sơ chất lượng"
4. ✅ Form hiển thị đầy đủ
```

### **Test 2: Trang tạo mới**
```
1. Vào /admin/screens/new
2. ✅ Trang hiển thị bình thường
3. ✅ Header: "HD03: Đặc tả màn hình"
4. ✅ Form tạo mới hiển thị
```

### **Test 3: Sửa metadata**
```
1. Vào /admin/screens
2. Sửa tên màn hình AD13
3. Vào /admin/screens/13
4. ✅ Header cập nhật tên mới
```

---

## 🎉 **HOÀN THÀNH!**

**Lỗi đã được fix:**
- ✅ Thêm hook `useScreenMetadataCached`
- ✅ Thêm conditional route (null khi isNew)
- ✅ Thêm fallback cho trang new
- ✅ Trang không còn bị trắng

**Bây giờ bạn có thể:**
- ✅ Vào `/admin/screens/:id` bình thường
- ✅ Tạo màn hình mới tại `/admin/screens/new`
- ✅ Sửa metadata và thấy cập nhật ngay

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 22:31
