# 🎯 KẾ HOẠCH THỰC HIỆN HOÀN CHỈNH - CẢ 3 MỤC TIÊU

**Ngày:** 16/07/2026  
**Mục tiêu:** Thực hiện đồng thời cả 3 việc theo yêu cầu

---

## ✅ MỤC TIÊU 1: MIGRATE TẤT CẢ 35 SCREENS CÒN LẠI

### **Công cụ đã chuẩn bị:**

1. **Script Python (Mạnh mẽ nhất):**
   ```bash
   python scripts/auto-migrate-all.py --dry-run    # Preview
   python scripts/auto-migrate-all.py              # Apply all
   python scripts/auto-migrate-all.py --module=Auth  # Specific module
   ```

2. **Script JavaScript:**
   ```bash
   node scripts/migrate-all-screens.js --dry-run
   node scripts/migrate-all-screens.js
   ```

### **Danh sách 35 screens cần migrate:**

#### **Auth Module (7 screens) - PRIORITY: HIGH**
- [ ] UserManagementView (AD04) - `/admin/users`
- [ ] UserCreateView (AD04.1) - `/admin/users/create`
- [ ] UserEditView (AD04.2) - `/admin/users/:id/edit`
- [ ] UserPermissionView (AD04.3) - `/admin/users/:id/permissions`
- [ ] DepartmentManagementView (AD05) - `/admin/departments`
- [ ] PositionManagementView (AD06) - `/admin/positions`

#### **System Module (2 screens)**
- [ ] SystemMonitorView (HD01) - `/admin/system-monitor`
- [ ] ScreenDetailView (HD03) - `/admin/screens/:id`
- [ ] BackupQRManagementView (AD11) - `/admin/backup-qr`

#### **QualityRecords Module (1 screen)**
- [ ] QualityRecordsDetailView (AD13.1) - `/admin/quality-records/:id`

#### **Inspection Module (1 screen)**
- [ ] InspectionReportsView (AD14) - `/admin/inspection-reports`

#### **ISO Module (4 screens)**
- [ ] ISODocumentListView (AD17) - `/admin/iso/forms`
- [ ] ISOFormEditorView (AD17.1) - `/admin/iso/forms/:id`
- [ ] ISODocumentListView (AD18) - `/admin/iso/processes`
- [ ] ISOProcessEditorView (AD55) - `/admin/iso/processes/:id`

#### **KPI Module (5 screens)**
- [ ] KPIReportsView (AD7) - `/admin/kpi/reports`
- [ ] KPIChecklistView (AD7.2) - `/admin/kpi/checklist`
- [ ] KPIItemsView (AD7.3) - `/admin/kpi/items`
- [ ] KPIRulesView (AD7.4) - `/admin/kpi/rules`
- [ ] KPIFeedbackView (AD7.5) - `/admin/kpi/feedback`

#### **Plan Module (2 screens)**
- [ ] PlanDetailView (MA2.1) - `/admin/plans/:id`
- [ ] ProductionProgressView (MA5) - `/admin/production-progress/:id`

#### **Equipment Module (12 screens)**
- [ ] MachineManagementView (MC37) - `/admin/machines`
- [ ] MachineHistoryView (MC37.2) - `/admin/machines/history`
- [ ] MachineTrainingView (MC37.3) - `/admin/machines/training`
- [ ] MachineDetailView (MC37.5) - `/admin/machines/:id`
- [ ] EquipmentManagementView (AD37) - `/admin/equipment`
- [ ] EquipmentHistoryView (AD37.2) - `/admin/equipment/history`
- [ ] EquipmentTrainingView (AD37.3) - `/admin/equipment/training`
- [ ] EquipmentCategoriesView (AD37.4) - `/admin/equipment/categories`
- [ ] EquipmentDetailView (AD37.5) - `/admin/equipment/:id`
- [ ] EquipmentTrainingDetailView (AD37.6) - `/admin/equipment/training/:id`
- [ ] EquipmentHandoverView (AD37.7) - `/admin/equipment/handover`

### **Lệnh thực thi:**

```bash
# Bước 1: Preview toàn bộ
python scripts/auto-migrate-all.py --dry-run

# Bước 2: Migrate từng module
python scripts/auto-migrate-all.py --module=Auth
python scripts/auto-migrate-all.py --module=System
python scripts/auto-migrate-all.py --module=QualityRecords
python scripts/auto-migrate-all.py --module=Inspection
python scripts/auto-migrate-all.py --module=ISO
python scripts/auto-migrate-all.py --module=KPI
python scripts/auto-migrate-all.py --module=Plan
python scripts/auto-migrate-all.py --module=Equipment

# Hoặc migrate tất cả cùng lúc
python scripts/auto-migrate-all.py
```

---

## ✅ MỤC TIÊU 2: MIGRATE TỪNG MODULE CỤ THỂ

### **Kế hoạch chi tiết theo tuần:**

#### **Week 1 (17-23/07): Auth + System (10 screens)**
```bash
# Day 1-2: Auth Module
python scripts/auto-migrate-all.py --module=Auth
# Test: 7 screens

# Day 3-4: System Module  
python scripts/auto-migrate-all.py --module=System
# Test: 3 screens
```

**Checklist:**
- [ ] Test login/logout
- [ ] Test user CRUD
- [ ] Test permissions
- [ ] Test departments/positions
- [ ] Verify header metadata

#### **Week 2 (24-30/07): Quality + ISO + KPI (11 screens)**
```bash
# Day 1: QualityRecords + Inspection
python scripts/auto-migrate-all.py --module=QualityRecords
python scripts/auto-migrate-all.py --module=Inspection

# Day 2-3: ISO Module
python scripts/auto-migrate-all.py --module=ISO

# Day 4-5: KPI Module
python scripts/auto-migrate-all.py --module=KPI
```

**Checklist:**
- [ ] Test quality records flow
- [ ] Test inspection reports
- [ ] Test ISO documents
- [ ] Test KPI reports
- [ ] Verify all metadata

#### **Week 3 (31/07-06/08): Equipment + Plan (14 screens)**
```bash
# Day 1-3: Equipment Module (12 screens)
python scripts/auto-migrate-all.py --module=Equipment

# Day 4-5: Plan Module (2 screens)
python scripts/auto-migrate-all.py --module=Plan
```

**Checklist:**
- [ ] Test equipment management
- [ ] Test machine management
- [ ] Test training modules
- [ ] Test production plans
- [ ] Verify all metadata

---

## ✅ MỤC TIÊU 3: IMPLEMENT CÁC TÍNH NĂNG TỪ MOCKUP

### **3.1. BugDetailModal (HD04) - ĐÃ HOÀN THÀNH ✅**

**File:** `Web/Shared/Views/components/modals/BugDetailModal.jsx`

**Features:**
- ✅ Form layout 2 columns theo mockup
- ✅ Dropdown màn hình, component, mức độ
- ✅ Upload ảnh bằng chứng (multiple)
- ✅ Người ghi nhận, người xử lý
- ✅ Ngày ghi nhận, ngày yêu cầu hoàn thành
- ✅ Textarea phản hồi
- ✅ Validation đầy đủ

**Sử dụng:**
```javascript
import BugDetailModal from '@webShared/Views/components/modals/BugDetailModal';

<BugDetailModal
  show={showModal}
  onClose={() => setShowModal(false)}
  bug={selectedBug}
  screens={screens}
  users={users}
  itUsers={itUsers}
  onSubmit={handleSubmitBug}
/>
```

### **3.2. ScreenManagementView - Thêm cột "Lỗi"**

**TODO:**
```javascript
// Trong table header
<th style={{ width: '80px', textAlign: 'center' }}>Lỗi</th>

// Trong table body
<td style={{ textAlign: 'center' }}>
  {screen.bugs_count > 0 ? (
    <span style={{
      backgroundColor: '#FEF2F2',
      color: '#EF4444',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 'bold'
    }}>
      {screen.bugs_count}
    </span>
  ) : (
    <span style={{ color: '#10B981', fontSize: '0.85rem' }}>✓</span>
  )}
</td>
```

### **3.3. ProjectProgressView (HD07)**

**File cần tạo:** `System/Views/ProjectProgressView.jsx`

**Cấu trúc:**
```javascript
import React, { useState, useEffect } from 'react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ProjectProgressView = () => {
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/screens/progress');
  
  // Stats cards (4 cards giống HD06)
  const stats = {
    buildProgress: 25,
    editProgress: 25,
    fixProgress: 25,
    criticalProgress: 25
  };

  return (
    <div>
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Toolbar với subsystem filter */}
      <div className="toolbar">
        <input placeholder="Nhập Họ và tên hoặc Mã NV" />
        
        <div className="subsystem-filter">
          <label>Phân hệ:</label>
          <select>
            <option>Quản lý hệ thống</option>
          </select>
          <div className="progress-bar">
            <div style={{ width: '80%' }} />
          </div>
          <span>80%</span>
        </div>
      </div>

      {/* Table với cột Tiến độ */}
      <table>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Màn hình</th>
            <th>Mô tả</th>
            <th>Trạng thái</th>
            <th>Lỗi sửa</th>
            <th>Ngày cập nhật</th>
            <th>Người cập nhật</th>
            <th>Tiến độ</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {screens.map(screen => (
            <tr key={screen.id}>
              <td>{screen.current_code}</td>
              <td>{screen.title}</td>
              <td>{screen.subtitle}</td>
              <td>{screen.status}</td>
              <td>{screen.bugs_resolved}/{screen.bugs_total}</td>
              <td>{formatDate(screen.updated_at)}</td>
              <td>{screen.updated_by}</td>
              <td>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div style={{ width: `${screen.progress}%` }} />
                  </div>
                  <span>{screen.progress}%</span>
                </div>
              </td>
              <td>...</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### **3.4. Các tính năng khác từ mockup**

#### **Ảnh 1 (HD02) - ScreenManagementView:**
- [x] Stats cards (4 cards) - Đã có
- [x] Search toolbar - Đã có
- [ ] Cột "Lỗi" - TODO
- [ ] Action menu "..." - TODO

#### **Ảnh 2-6 (HD03) - ScreenDetailView:**
- [x] Form metadata - Đã có
- [x] Components tab - Đã có
- [x] Guides tab - Đã có
- [x] Mockup viewer - Đã có
- [x] Bugs section - Đã có
- [x] Nút "Báo lỗi" - Cần integrate BugDetailModal

#### **Ảnh 3-4 (HD04) - BugDetailModal:**
- [x] Modal layout - ĐÃ HOÀN THÀNH ✅
- [x] Form fields - ĐÃ HOÀN THÀNH ✅
- [x] Image upload - ĐÃ HOÀN THÀNH ✅

#### **Ảnh 5 - Bug Expanded View:**
- [x] Timeline updates - Đã có trong ScreenDetailView
- [x] Image thumbnails - Đã có
- [x] Reply boxes - Đã có

#### **Ảnh 7 (HD06) - ScreenBugManagementView:**
- [x] Stats cards - Đã có
- [x] Search & filters - Đã có
- [x] Master-detail layout - Đã có
- [x] Table columns - Đã có

#### **Ảnh 8 (HD07) - ProjectProgressView:**
- [ ] Stats cards - TODO
- [ ] Subsystem filter với progress - TODO
- [ ] Table với cột Tiến độ - TODO

---

## 📋 TIMELINE TỔNG HỢP

### **Week 1 (17-23/07/2026)**
**Focus:** Migration + Core Features

- **Day 1-2 (17-18/07):**
  - ✅ Migrate Auth Module (7 screens)
  - ✅ Test user management flow
  - ✅ Integrate BugDetailModal vào ScreenDetailView

- **Day 3-4 (19-20/07):**
  - ✅ Migrate System Module (3 screens)
  - ✅ Thêm cột "Lỗi" vào ScreenManagementView
  - ✅ Test screen management flow

- **Day 5 (21/07):**
  - ✅ Tạo ProjectProgressView (HD07)
  - ✅ Test toàn bộ System module

- **Weekend (22-23/07):**
  - Review & bug fixes
  - Documentation update

### **Week 2 (24-30/07/2026)**
**Focus:** Quality + ISO + KPI Modules

- **Day 1 (24/07):**
  - Migrate QualityRecords + Inspection (2 screens)
  - Test quality flow

- **Day 2-3 (25-26/07):**
  - Migrate ISO Module (4 screens)
  - Test ISO documents & processes

- **Day 4-5 (27-28/07):**
  - Migrate KPI Module (5 screens)
  - Test KPI reports & feedback

- **Weekend (29-30/07):**
  - Integration testing
  - Performance optimization

### **Week 3 (31/07-06/08/2026)**
**Focus:** Equipment + Plan Modules

- **Day 1-3 (31/07-02/08):**
  - Migrate Equipment Module (12 screens)
  - Test equipment & machine management

- **Day 4-5 (03-04/08):**
  - Migrate Plan Module (2 screens)
  - Test production planning

- **Weekend (05-06/08):**
  - Full system testing
  - Bug fixes

### **Week 4 (07-13/08/2026)**
**Focus:** Polish & Deploy

- **Day 1-3 (07-09/08):**
  - UI/UX refinements
  - Accessibility improvements
  - Mobile responsive testing

- **Day 4-5 (10-11/08):**
  - Performance optimization
  - Security review
  - Documentation finalization

- **Weekend (12-13/08):**
  - Staging deployment
  - User acceptance testing

### **Week 5 (14-20/08/2026)**
**Focus:** Production Deploy

- **Day 1-2 (14-15/08):**
  - Production deployment
  - Monitoring setup

- **Day 3-5 (16-18/08):**
  - Support & bug fixes
  - User training

- **Weekend (19-20/08):**
  - Final review
  - Celebration! 🎉

---

## 🚀 LỆNH THỰC THI NHANH

### **Migration Commands:**
```bash
# Preview tất cả
python scripts/auto-migrate-all.py --dry-run

# Migrate tất cả
python scripts/auto-migrate-all.py

# Migrate từng module
python scripts/auto-migrate-all.py --module=Auth
python scripts/auto-migrate-all.py --module=System
python scripts/auto-migrate-all.py --module=Equipment
```

### **Testing Commands:**
```bash
# Run dev server
npm run dev

# Run tests
npm test

# Build production
npm run build
```

### **Git Workflow:**
```bash
# Sau mỗi module migration
git add .
git commit -m "feat: migrate [Module] to dynamic metadata"
git push origin feature/dynamic-metadata

# Sau khi hoàn thành mockup features
git commit -m "feat: implement mockup features (HD04, HD07)"
git push
```

---

## ✅ CHECKLIST HOÀN THÀNH

### **Mục tiêu 1: Migration (35 screens)**
- [ ] Auth Module (7/7)
- [ ] System Module (3/3)
- [ ] QualityRecords Module (1/1)
- [ ] Inspection Module (1/1)
- [ ] ISO Module (4/4)
- [ ] KPI Module (5/5)
- [ ] Plan Module (2/2)
- [ ] Equipment Module (12/12)

**Progress:** 2/37 (5.4%) → Target: 37/37 (100%)

### **Mục tiêu 2: Module-specific Testing**
- [ ] Auth module tested
- [ ] System module tested
- [ ] QualityRecords module tested
- [ ] Inspection module tested
- [ ] ISO module tested
- [ ] KPI module tested
- [ ] Plan module tested
- [ ] Equipment module tested

### **Mục tiêu 3: Mockup Features**
- [x] BugDetailModal (HD04) ✅
- [ ] Cột "Lỗi" trong ScreenManagementView
- [ ] ProjectProgressView (HD07)
- [ ] Integration testing

---

## 📊 KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành cả 3 mục tiêu:

✅ **37/37 screens** sử dụng Dynamic Metadata  
✅ **100%** screens đồng bộ với cấu hình  
✅ **BugDetailModal** hoạt động hoàn hảo  
✅ **ProjectProgressView** theo đúng mockup  
✅ **ScreenManagementView** có cột "Lỗi"  
✅ **Toàn bộ mockup** được implement  

---

**🎉 SẴN SÀNG THỰC HIỆN CẢ 3 MỤC TIÊU!**

**Next Action:**
```bash
python scripts/auto-migrate-all.py --dry-run
```
