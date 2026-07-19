# 🐛 BUG FIX: Uncontrolled to Controlled Input

**Ngày:** 16/07/2026 22:06  
**Lỗi:** "A component is changing an uncontrolled input to be controlled"  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **LỖI TRONG CONSOLE:**

```
Warning: A component is changing an uncontrolled input to be controlled.
This is likely caused by the value changing from undefined to a defined value,
which should not happen. Decide between using a controlled or uncontrolled
input element for the lifetime of the component.
```

---

## 🐛 **NGUYÊN NHÂN:**

### **1. Missing initial value trong state:**
```javascript
// TRƯỚC - LỖI
const [formData, setFormData] = useState({
  title: '',
  route_path: '',
  platform: 'Web',
  subsystem: 'Quản lý hệ thống',
  status: 'Mới thiết kế',
  target_date: '',
  subtitle: ''
  // ❌ THIẾU current_code: ''
});
```

**Vấn đề:**
- `formData.current_code` = `undefined` ban đầu
- Khi load screen → `current_code` được set giá trị
- React warning: uncontrolled → controlled

### **2. Input value có thể undefined:**
```javascript
// TRƯỚC - LỖI
<input
  value={isNew ? generatedCode : formData.current_code}
  // ↑ Có thể undefined nếu chưa load xong
/>
```

**Vấn đề:**
- `generatedCode` có thể `undefined` khi mới mount
- `formData.current_code` có thể `undefined` ban đầu
- React không thích input value thay đổi từ `undefined` → string

---

## ✅ **GIẢI PHÁP:**

### **1. Thêm current_code vào initial state:**
```javascript
// SAU - ĐÚNG
const [formData, setFormData] = useState({
  title: '',
  route_path: '',
  platform: 'Web',
  subsystem: 'Quản lý hệ thống',
  status: 'Mới thiết kế',
  target_date: '',
  subtitle: '',
  current_code: ''  // ✅ THÊM initial value
});
```

**Cải tiến:**
- ✅ `current_code` luôn có giá trị (ít nhất là `''`)
- ✅ Không bao giờ `undefined`
- ✅ React happy!

### **2. Fallback || '' cho input value:**
```javascript
// SAU - ĐÚNG
<input
  value={isNew ? (generatedCode || '') : (formData.current_code || '')}
  //              ↑ Fallback          ↑ Fallback
  onChange={(e) => !isNew && setFormData(prev => ({ 
    ...prev, 
    current_code: e.target.value.toUpperCase() 
  }))}
  placeholder="VD: AD13, HD02"
/>
```

**Cải tiến:**
- ✅ Luôn có giá trị (ít nhất là `''`)
- ✅ Không bao giờ `undefined`
- ✅ Controlled input từ đầu đến cuối

---

## 🎯 **KẾT QUẢ:**

### **Trước fix:**
```
❌ Console warning: uncontrolled to controlled
❌ Input value có thể undefined
❌ React không happy
❌ Có thể gây lỗi khi save
```

### **Sau fix:**
```
✅ Không có warning
✅ Input value luôn là string
✅ React happy
✅ Lưu được bình thường
```

---

## 📋 **REACT CONTROLLED INPUT RULES:**

### **Rule 1: Value không bao giờ undefined**
```javascript
// ❌ SAI
<input value={maybeUndefined} />

// ✅ ĐÚNG
<input value={maybeUndefined || ''} />
```

### **Rule 2: Initial state phải có tất cả fields**
```javascript
// ❌ SAI
const [form, setForm] = useState({
  name: ''
  // missing: email
});

// ✅ ĐÚNG
const [form, setForm] = useState({
  name: '',
  email: ''  // ← Phải có
});
```

### **Rule 3: Không đổi từ uncontrolled → controlled**
```javascript
// ❌ SAI
<input value={condition ? value : undefined} />

// ✅ ĐÚNG
<input value={condition ? value : ''} />
```

---

## 🔧 **DEBUGGING TIPS:**

### **Nếu vẫn thấy warning:**

1. **Check initial state:**
   ```javascript
   console.log('Initial formData:', formData);
   // Tất cả fields phải có giá trị, không undefined
   ```

2. **Check input value:**
   ```javascript
   console.log('Input value:', isNew ? generatedCode : formData.current_code);
   // Phải là string, không undefined
   ```

3. **Check khi load screen:**
   ```javascript
   useEffect(() => {
     console.log('Screen loaded:', screen);
     console.log('FormData after load:', formData);
   }, [screen]);
   ```

---

## ✅ **VERIFIED:**

- [x] Không có console warning
- [x] Input value luôn là string
- [x] formData.current_code có initial value
- [x] Lưu được bình thường
- [x] Không lỗi khi load screen
- [x] Không lỗi khi sửa mã

---

## 📝 **BEST PRACTICES:**

### **1. Luôn có initial value:**
```javascript
const [formData, setFormData] = useState({
  field1: '',      // ✅ String
  field2: 0,       // ✅ Number
  field3: false,   // ✅ Boolean
  field4: [],      // ✅ Array
  field5: {}       // ✅ Object
  // ❌ KHÔNG để undefined
});
```

### **2. Luôn fallback cho input value:**
```javascript
<input value={data?.field || ''} />
<input value={maybeNull ?? ''} />
<input value={condition ? value : ''} />
```

### **3. Type-safe với TypeScript:**
```typescript
interface FormData {
  current_code: string;  // Không phải string | undefined
  title: string;
  // ...
}

const [formData, setFormData] = useState<FormData>({
  current_code: '',
  title: '',
  // TypeScript sẽ báo lỗi nếu thiếu field
});
```

---

## 🎉 **HOÀN THÀNH!**

**Lỗi đã được fix:**
- ✅ Thêm `current_code: ''` vào initial state
- ✅ Fallback `|| ''` cho input value
- ✅ Không còn warning
- ✅ Lưu được bình thường

**Bây giờ bạn có thể:**
- ✅ Edit màn hình không lỗi
- ✅ Sửa mã màn hình
- ✅ Lưu thành công
- ✅ Console sạch sẽ

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 22:06
