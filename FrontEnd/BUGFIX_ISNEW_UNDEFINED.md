# 🐛 BUG FIX: isNew is not defined

**Ngày:** 16/07/2026 22:09  
**Lỗi:** ReferenceError: isNew is not defined  
**Trạng thái:** ✅ Đã fix

---

## 🔍 **LỖI TRONG CONSOLE:**

```
ReferenceError: isNew is not defined
    at handleSave (ScreenDetailView.jsx:1463)
    at onClick (ScreenDetailView.jsx:2421)
```

---

## 🐛 **NGUYÊN NHÂN:**

### **Scope issue - biến được định nghĩa sai chỗ:**

```javascript
const ScreenDetail = () => {
  const { id } = useParams();
  
  // ❌ isNew KHÔNG được định nghĩa ở đây
  
  const handleSave = async (e) => {
    // ...
    if (id === 'new') {  // ← Dùng id === 'new'
      // Create
    } else {
      // Update
    }
  };
  
  const renderMetadataForm = () => {
    const isNew = id === 'new';  // ← isNew chỉ có trong function này
    const generatedCode = isNew ? generateNextScreenCode(...) : '';
    
    return (
      <input value={isNew ? generatedCode : formData.current_code} />
      //            ↑ OK - isNew có trong scope này
    );
  };
};
```

**Vấn đề:**
1. `isNew` được định nghĩa **BÊN TRONG** `renderMetadataForm()`
2. `handleSave()` cần dùng `isNew` nhưng **KHÔNG có trong scope**
3. Khi click "Lưu đặc tả" → `handleSave()` chạy → `isNew is not defined`

---

## ✅ **GIẢI PHÁP:**

### **Move isNew lên component scope:**

```javascript
const ScreenDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === 'new';  // ✅ Định nghĩa ở component scope
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Bây giờ TẤT CẢ functions đều có thể dùng isNew
  
  const handleSave = async (e) => {
    // ...
    if (isNew) {  // ✅ OK - isNew có trong scope
      // Create
    } else {
      // Update
    }
  };
  
  const renderMetadataForm = () => {
    // ❌ XÓA dòng này vì đã có ở trên
    // const isNew = id === 'new';
    
    const generatedCode = isNew ? generateNextScreenCode(...) : '';
    
    return (
      <input value={isNew ? generatedCode : formData.current_code} />
      //            ↑ OK - isNew có trong scope
    );
  };
};
```

**Cải tiến:**
- ✅ `isNew` được định nghĩa **1 lần duy nhất** ở component scope
- ✅ TẤT CẢ functions đều có thể dùng `isNew`
- ✅ Không duplicate code
- ✅ Dễ maintain

---

## 🎯 **KẾT QUẢ:**

### **Trước fix:**
```
❌ ReferenceError: isNew is not defined
❌ handleSave() không chạy được
❌ Không lưu được
❌ isNew được định nghĩa 2 lần (duplicate)
```

### **Sau fix:**
```
✅ isNew được định nghĩa ở component scope
✅ handleSave() chạy bình thường
✅ Lưu được
✅ Không duplicate code
```

---

## 📋 **JAVASCRIPT SCOPE RULES:**

### **Rule 1: Biến chỉ có trong scope nó được định nghĩa:**

```javascript
function outer() {
  const a = 1;  // ✅ outer scope
  
  function inner() {
    const b = 2;  // ✅ inner scope
    console.log(a);  // ✅ OK - a có trong outer scope
  }
  
  console.log(b);  // ❌ ERROR - b không có trong outer scope
}
```

### **Rule 2: Component scope vs Function scope:**

```javascript
const MyComponent = () => {
  const componentVar = 'component';  // ✅ Component scope
  
  const funcA = () => {
    const funcAVar = 'A';  // ✅ funcA scope only
    console.log(componentVar);  // ✅ OK
  };
  
  const funcB = () => {
    console.log(componentVar);  // ✅ OK
    console.log(funcAVar);  // ❌ ERROR
  };
};
```

### **Rule 3: Nên định nghĩa ở scope cao nhất cần thiết:**

```javascript
const MyComponent = () => {
  // ✅ ĐÚNG - Định nghĩa ở component scope nếu nhiều functions cần dùng
  const sharedValue = computeValue();
  
  const funcA = () => {
    console.log(sharedValue);  // ✅ OK
  };
  
  const funcB = () => {
    console.log(sharedValue);  // ✅ OK
  };
  
  // ❌ SAI - Định nghĩa lại trong mỗi function (duplicate)
  const funcC = () => {
    const sharedValue = computeValue();  // ❌ Duplicate
    console.log(sharedValue);
  };
};
```

---

## 🔧 **DEBUGGING TIPS:**

### **Nếu gặp "X is not defined":**

1. **Check scope:**
   ```javascript
   console.log('Available variables:', Object.keys(this));
   ```

2. **Check định nghĩa:**
   ```javascript
   // Biến được định nghĩa ở đâu?
   // Có trong scope hiện tại không?
   ```

3. **Check typo:**
   ```javascript
   const isNew = ...;
   console.log(isnew);  // ❌ Typo - should be isNew
   ```

4. **Check hoisting:**
   ```javascript
   console.log(x);  // ❌ undefined (var) or ReferenceError (const/let)
   const x = 1;
   ```

---

## ✅ **VERIFIED:**

- [x] isNew được định nghĩa ở component scope
- [x] handleSave() có thể dùng isNew
- [x] renderMetadataForm() có thể dùng isNew
- [x] Không có ReferenceError
- [x] Lưu được bình thường
- [x] Không duplicate code

---

## 📝 **BEST PRACTICES:**

### **1. Định nghĩa biến ở scope phù hợp:**

```javascript
// ✅ ĐÚNG
const MyComponent = () => {
  const sharedVar = 'shared';  // Nhiều functions dùng
  
  const funcA = () => {
    const localVar = 'local';  // Chỉ funcA dùng
    console.log(sharedVar, localVar);
  };
};

// ❌ SAI
const MyComponent = () => {
  const funcA = () => {
    const sharedVar = 'shared';  // Định nghĩa trong function
  };
  
  const funcB = () => {
    const sharedVar = 'shared';  // Duplicate!
  };
};
```

### **2. Derived values nên dùng useMemo:**

```javascript
const MyComponent = () => {
  const { id } = useParams();
  
  // ✅ ĐÚNG - Simple derived value
  const isNew = id === 'new';
  
  // ✅ ĐÚNG - Complex derived value
  const computedValue = useMemo(() => {
    return expensiveComputation(data);
  }, [data]);
};
```

### **3. Tránh duplicate definitions:**

```javascript
// ❌ SAI
const MyComponent = () => {
  const funcA = () => {
    const isNew = id === 'new';  // Duplicate
  };
  
  const funcB = () => {
    const isNew = id === 'new';  // Duplicate
  };
};

// ✅ ĐÚNG
const MyComponent = () => {
  const isNew = id === 'new';  // Define once
  
  const funcA = () => {
    console.log(isNew);  // Use
  };
  
  const funcB = () => {
    console.log(isNew);  // Use
  };
};
```

---

## 🎉 **HOÀN THÀNH!**

**Lỗi đã được fix:**
- ✅ Move `isNew` lên component scope
- ✅ Xóa duplicate definition
- ✅ TẤT CẢ functions có thể dùng `isNew`
- ✅ Lưu được bình thường

**Bây giờ bạn có thể:**
- ✅ Tạo màn hình mới
- ✅ Sửa màn hình existing
- ✅ Lưu thành công
- ✅ Không có ReferenceError

---

**Made with ❤️ by ERP G7 Team**  
**Fixed:** 16/07/2026 22:09
