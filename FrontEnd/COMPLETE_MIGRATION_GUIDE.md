# 🎯 HƯỚNG DẪN HOÀN THÀNH MIGRATION - 29 SCREENS CÒN LẠI

**Ngày:** 16/07/2026 22:20  
**Đã hoàn thành:** 8/37 screens (21.6%)  
**Còn lại:** 29 screens (78.4%)

---

## ✅ **ĐÃ MIGRATE (8 screens):**

1. ✅ QualityRecordsListView (AD13)
2. ✅ ScreenManagementView (HD02)
3. ✅ ScreenDetailView (HD03)
4. ✅ KPIReportsView (AD7)
5. ✅ KPIChecklistView (AD7.2)
6. ✅ KPIItemsView (AD7.3)
7. ✅ KPIRulesView (AD7.4)
8. ✅ KPIFeedbackView (AD7.5)

---

## 🚀 **CÁCH MIGRATE NHANH NHẤT - DÙNG SCRIPT TỰ ĐỘNG**

### **Option 1: Migrate TẤT CẢ bằng Python script**

```bash
cd M:\ERP\FrontEnd
python scripts/auto-migrate-all.py
```

**Script sẽ:**
- ✅ Tự động tìm tất cả `.jsx` files
- ✅ Detect hardcoded `setCustomScreenCode`
- ✅ Thêm import `useScreenMetadataCached`
- ✅ Thay thế hardcoded title/subtitle
- ✅ Update mapping JSON
- ✅ Migrate 29 screens trong vài phút!

### **Option 2: Migrate từng module**

```bash
# Auth Module (7 screens)
python scripts/auto-migrate-all.py --module=Auth

# System Module (2 screens)
python scripts/auto-migrate-all.py --module=System

# Equipment Module (12 screens)
python scripts/auto-migrate-all.py --module=Equipment

# ISO Module (4 screens)
python scripts/auto-migrate-all.py --module=ISO

# Plan Module (2 screens)
python scripts/auto-migrate-all.py --module=Plan

# QualityRecords Module (1 screen)
python scripts/auto-migrate-all.py --module=QualityRecords

# Inspection Module (1 screen)
python scripts/auto-migrate-all.py --module=Inspection
```

---

## 📝 **HOẶC MIGRATE THỦ CÔNG (PATTERN CHUẨN)**

### **Template cho mỗi screen:**

#### **Bước 1: Thêm import**
```javascript
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
```

#### **Bước 2: Gọi hook**
```javascript
const MyView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Thêm dòng này
  const { screenCode, title, subtitle } = useScreenMetadataCached('/route/path');
  
  // ...
};
```

#### **Bước 3: Thay thế useEffect**

**TRƯỚC:**
```javascript
useEffect(() => {
  setCustomScreenCode('AD04');
  setCustomTitle('Quản lý người dùng');
  setCustomSubtitle('Danh sách tài khoản người dùng');
  fetchData();
}, []);
```

**SAU:**
```javascript
useEffect(() => {
  if (screenCode && title) {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode);
  }
}, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

useEffect(() => {
  fetchData();
}, []);
```

---

## 📋 **DANH SÁCH 29 SCREENS CẦN MIGRATE**

### **1. Auth Module (7 screens) - HIGH PRIORITY**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| UserManagementView.jsx | AD04 | `/admin/users` | ❌ Pending |
| UserCreateView.jsx | AD04.1 | `/admin/users/create` | ❌ Pending |
| UserEditView.jsx | AD04.2 | `/admin/users/:id/edit` | ❌ Pending |
| UserPermissionView.jsx | AD04.3 | `/admin/users/:id/permissions` | ❌ Pending |
| DepartmentManagementView.jsx | AD05 | `/admin/departments` | ❌ Pending |
| PositionManagementView.jsx | AD06 | `/admin/positions` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=Auth
```

---

### **2. System Module (2 screens)**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| SystemMonitorView.jsx | HD01 | `/admin/system-monitor` | ❌ Pending |
| BackupQRManagementView.jsx | AD11 | `/admin/backup-qr` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=System
```

---

### **3. Equipment Module (12 screens) - LARGEST**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| MachineManagementView.jsx | MC37 | `/admin/machines` | ❌ Pending |
| MachineHistoryView.jsx | MC37.2 | `/admin/machines/history` | ❌ Pending |
| MachineTrainingView.jsx | MC37.3 | `/admin/machines/training` | ❌ Pending |
| MachineDetailView.jsx | MC37.5 | `/admin/machines/:id` | ❌ Pending |
| EquipmentManagementView.jsx | AD37 | `/admin/equipment` | ❌ Pending |
| EquipmentHistoryView.jsx | AD37.2 | `/admin/equipment/history` | ❌ Pending |
| EquipmentTrainingView.jsx | AD37.3 | `/admin/equipment/training` | ❌ Pending |
| EquipmentCategoriesView.jsx | AD37.4 | `/admin/equipment/categories` | ❌ Pending |
| EquipmentDetailView.jsx | AD37.5 | `/admin/equipment/:id` | ❌ Pending |
| EquipmentTrainingDetailView.jsx | AD37.6 | `/admin/equipment/training/:id` | ❌ Pending |
| EquipmentHandoverView.jsx | AD37.7 | `/admin/equipment/handover` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=Equipment
```

---

### **4. ISO Module (4 screens)**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| ISODocumentListView.jsx | AD17 | `/admin/iso/forms` | ❌ Pending |
| ISOFormEditorView.jsx | AD17.1 | `/admin/iso/forms/:id` | ❌ Pending |
| ISODocumentListView.jsx | AD18 | `/admin/iso/processes` | ❌ Pending |
| ISOProcessEditorView.jsx | AD55 | `/admin/iso/processes/:id` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=ISO
```

---

### **5. Plan Module (2 screens)**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| PlanDetailView.jsx | MA2.1 | `/admin/plans/:id` | ❌ Pending |
| ProductionProgressView.jsx | MA5 | `/admin/production-progress/:id` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=Plan
```

---

### **6. QualityRecords Module (1 screen)**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| QualityRecordsDetailView.jsx | AD13.1 | `/admin/quality-records/:id` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=QualityRecords
```

---

### **7. Inspection Module (1 screen)**

| File | Screen Code | Route | Status |
|------|-------------|-------|--------|
| InspectionReportsView.jsx | AD14 | `/admin/inspection-reports` | ❌ Pending |

**Migrate command:**
```bash
python scripts/auto-migrate-all.py --module=Inspection
```

---

## 🎯 **RECOMMENDED MIGRATION ORDER**

### **Phase 1: Critical Modules (9 screens)**
```bash
python scripts/auto-migrate-all.py --module=Auth      # 7 screens
python scripts/auto-migrate-all.py --module=System    # 2 screens
```

### **Phase 2: Large Modules (12 screens)**
```bash
python scripts/auto-migrate-all.py --module=Equipment # 12 screens
```

### **Phase 3: Remaining Modules (8 screens)**
```bash
python scripts/auto-migrate-all.py --module=ISO            # 4 screens
python scripts/auto-migrate-all.py --module=Plan           # 2 screens
python scripts/auto-migrate-all.py --module=QualityRecords # 1 screen
python scripts/auto-migrate-all.py --module=Inspection     # 1 screen
```

---

## ✅ **TESTING CHECKLIST**

Sau khi migrate mỗi module:

### **1. Check Console:**
- [ ] Không có errors
- [ ] Không có warnings về uncontrolled inputs
- [ ] API calls thành công

### **2. Check UI:**
- [ ] Header hiển thị đúng Screen Code
- [ ] Title hiển thị đúng
- [ ] Subtitle hiển thị đúng

### **3. Check Dynamic Update:**
- [ ] Vào `/admin/screens`
- [ ] Sửa tên màn hình
- [ ] Refresh trang
- [ ] Header cập nhật ✅

### **4. Check Cache:**
- [ ] Load lần 1 → Gọi API
- [ ] Load lần 2 → Dùng cache (không gọi API)

---

## 🔧 **TROUBLESHOOTING**

### **Nếu script báo lỗi:**

1. **Check Python version:**
   ```bash
   python --version  # Cần >= 3.7
   ```

2. **Check file paths:**
   - Script tìm files trong `Web/modules/`
   - Đảm bảo structure đúng

3. **Run dry-run trước:**
   ```bash
   python scripts/auto-migrate-all.py --dry-run
   ```

4. **Check mapping JSON:**
   - File: `SCREEN_ROUTE_MAPPING.json`
   - Đảm bảo routes đúng

---

## 📊 **EXPECTED TIMELINE**

### **Nếu dùng script tự động:**
- Auth Module: ~2 phút
- System Module: ~1 phút
- Equipment Module: ~3 phút
- ISO Module: ~2 phút
- Plan Module: ~1 phút
- QualityRecords: ~30 giây
- Inspection: ~30 giây

**Total: ~10 phút để migrate TẤT CẢ 29 screens!** 🚀

### **Nếu migrate thủ công:**
- Mỗi screen: ~5 phút
- 29 screens: ~145 phút (~2.5 giờ)

---

## 🎉 **KẾT QUẢ SAU KHI HOÀN THÀNH**

```
✅ 37/37 screens migrated (100%)
✅ Tất cả screens dùng Dynamic Metadata
✅ Sửa tên tại /admin/screens → Tự động cập nhật toàn bộ
✅ Không cần sửa code khi đổi metadata
✅ Quản lý tập trung 100%
```

---

## 🚀 **BẮT ĐẦU NGAY**

```bash
# Migrate TẤT CẢ trong 1 lệnh
cd M:\ERP\FrontEnd
python scripts/auto-migrate-all.py

# Hoặc từng module
python scripts/auto-migrate-all.py --module=Auth
python scripts/auto-migrate-all.py --module=Equipment
# ...
```

---

**Made with ❤️ by ERP G7 Team**  
**Date:** 16/07/2026 22:20  
**Status:** 🟢 Ready to Complete!
