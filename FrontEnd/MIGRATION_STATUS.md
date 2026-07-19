# 🚀 MIGRATION STATUS - DYNAMIC SCREEN METADATA

**Ngày bắt đầu:** 16/07/2026  
**Tổng số screens:** 37  
**Đã migrate:** 2  
**Còn lại:** 35  

---

## ✅ ĐÃ MIGRATE (2/37)

### **1. QualityRecordsListView** ✅
- **File:** `QualityRecords/Views/QualityRecordsListView.jsx`
- **Route:** `/admin/quality-records`
- **Screen Code:** AD13
- **Status:** ✅ Hoàn thành
- **Ngày migrate:** 16/07/2026 21:25

### **2. ScreenManagementView** ✅
- **File:** `System/Views/ScreenManagementView.jsx`
- **Route:** `/admin/screens`
- **Screen Code:** HD02
- **Status:** ✅ Hoàn thành
- **Ngày migrate:** 16/07/2026 21:32

---

## 🔄 ĐANG THỰC HIỆN (0/37)

_Chưa có screens đang được migrate_

---

## ⏳ CHỜ MIGRATE (35/37)

### **System Module (3 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| HD01 | System/Views/SystemMonitorView.jsx | /admin/system-monitor | Medium |
| HD03 | System/Views/ScreenDetailView.jsx | /admin/screens/:id | High |
| AD11 | System/Views/BackupQRManagementView.jsx | /admin/backup-qr | Low |

### **QualityRecords Module (1 screen)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| AD13.1 | QualityRecords/Views/QualityRecordsDetailView.jsx | /admin/quality-records/:id | High |

### **Inspection Module (1 screen)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| AD14 | Inspection/Views/InspectionReportsView.jsx | /admin/inspection-reports | Medium |

### **ISO Module (4 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| AD17 | ISO/Views/ISODocumentListView.jsx | /admin/iso/forms | Medium |
| AD17.1 | ISO/Views/ISOFormEditorView.jsx | /admin/iso/forms/:id | Medium |
| AD18 | ISO/Views/ISODocumentListView.jsx | /admin/iso/processes | Medium |
| AD55 | ISO/Views/ISOProcessEditorView.jsx | /admin/iso/processes/:id | Medium |

### **KPI Module (5 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| AD7 | KPI/Views/KPIReportsView.jsx | /admin/kpi/reports | Medium |
| AD7.2 | KPI/Views/KPIChecklistView.jsx | /admin/kpi/checklist | Low |
| AD7.3 | KPI/Views/KPIItemsView.jsx | /admin/kpi/items | Low |
| AD7.4 | KPI/Views/KPIRulesView.jsx | /admin/kpi/rules | Low |
| AD7.5 | KPI/Views/KPIFeedbackView.jsx | /admin/kpi/feedback | Low |

### **Plan Module (2 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| MA2.1 | Plan/Views/PlanDetailView.jsx | /admin/plans/:id | High |
| MA5 | Plan/Views/ProductionProgressView.jsx | /admin/production-progress/:id | Medium |

### **Equipment Module (12 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| MC37 | Equipment/Views/MachineManagementView.jsx | /admin/machines | Medium |
| MC37.2 | Equipment/Views/MachineHistoryView.jsx | /admin/machines/history | Low |
| MC37.3 | Equipment/Views/MachineTrainingView.jsx | /admin/machines/training | Low |
| MC37.5 | Equipment/Views/MachineDetailView.jsx | /admin/machines/:id | Medium |
| AD37 | Equipment/Views/EquipmentManagementView.jsx | /admin/equipment | Medium |
| AD37.2 | Equipment/Views/EquipmentHistoryView.jsx | /admin/equipment/history | Low |
| AD37.3 | Equipment/Views/EquipmentTrainingView.jsx | /admin/equipment/training | Low |
| AD37.4 | Equipment/Views/EquipmentCategoriesView.jsx | /admin/equipment/categories | Low |
| AD37.5 | Equipment/Views/EquipmentDetailView.jsx | /admin/equipment/:id | Medium |
| AD37.6 | Equipment/Views/EquipmentTrainingDetailView.jsx | /admin/equipment/training/:id | Low |
| AD37.7 | Equipment/Views/EquipmentHandoverView.jsx | /admin/equipment/handover | Low |

### **Auth Module (7 screens)**

| Screen Code | File | Route | Priority |
|------------|------|-------|----------|
| AD04 | Auth/Views/UserManagementView.jsx | /admin/users | High |
| AD04.1 | Auth/Views/UserCreateView.jsx | /admin/users/create | High |
| AD04.2 | Auth/Views/UserEditView.jsx | /admin/users/:id/edit | High |
| AD04.3 | Auth/Views/UserPermissionView.jsx | /admin/users/:id/permissions | High |
| AD05 | Auth/Views/DepartmentManagementView.jsx | /admin/departments | Medium |
| AD06 | Auth/Views/PositionManagementView.jsx | /admin/positions | Medium |

---

## 📊 THỐNG KÊ

### **Theo Module:**
```
System:        1/4   (25%)   ████░░░░░░░░░░░░░░░░
QualityRecords: 1/2   (50%)   ██████████░░░░░░░░░░
Inspection:    0/1   (0%)    ░░░░░░░░░░░░░░░░░░░░
ISO:           0/4   (0%)    ░░░░░░░░░░░░░░░░░░░░
KPI:           0/5   (0%)    ░░░░░░░░░░░░░░░░░░░░
Plan:          0/2   (0%)    ░░░░░░░░░░░░░░░░░░░░
Equipment:     0/12  (0%)    ░░░░░░░░░░░░░░░░░░░░
Auth:          0/7   (0%)    ░░░░░░░░░░░░░░░░░░░░
```

### **Theo Priority:**
```
High:     2/12  (17%)
Medium:   0/16  (0%)
Low:      0/9   (0%)
```

### **Tổng tiến độ:**
```
██░░░░░░░░░░░░░░░░░░ 5.4% (2/37)
```

---

## 🎯 KẾ HOẠCH MIGRATION

### **Phase 1: Core Screens (Tuần 1) - Priority: High**
- [ ] HD03 - ScreenDetailView
- [ ] AD13.1 - QualityRecordsDetailView
- [ ] MA2.1 - PlanDetailView
- [ ] AD04 - UserManagementView
- [ ] AD04.1 - UserCreateView
- [ ] AD04.2 - UserEditView
- [ ] AD04.3 - UserPermissionView

**Target:** 7 screens  
**Deadline:** 23/07/2026

### **Phase 2: System & Admin (Tuần 2) - Priority: Medium**
- [ ] HD01 - SystemMonitorView
- [ ] AD14 - InspectionReportsView
- [ ] AD05 - DepartmentManagementView
- [ ] AD06 - PositionManagementView
- [ ] AD17 - ISODocumentListView (forms)
- [ ] AD17.1 - ISOFormEditorView
- [ ] AD18 - ISODocumentListView (processes)
- [ ] AD55 - ISOProcessEditorView
- [ ] AD7 - KPIReportsView
- [ ] MA5 - ProductionProgressView

**Target:** 10 screens  
**Deadline:** 30/07/2026

### **Phase 3: Equipment & Machines (Tuần 3) - Priority: Medium/Low**
- [ ] MC37 - MachineManagementView
- [ ] MC37.5 - MachineDetailView
- [ ] AD37 - EquipmentManagementView
- [ ] AD37.5 - EquipmentDetailView
- [ ] MC37.2 - MachineHistoryView
- [ ] MC37.3 - MachineTrainingView
- [ ] AD37.2 - EquipmentHistoryView
- [ ] AD37.3 - EquipmentTrainingView
- [ ] AD37.4 - EquipmentCategoriesView
- [ ] AD37.6 - EquipmentTrainingDetailView
- [ ] AD37.7 - EquipmentHandoverView

**Target:** 11 screens  
**Deadline:** 06/08/2026

### **Phase 4: Remaining Screens (Tuần 4) - Priority: Low**
- [ ] AD11 - BackupQRManagementView
- [ ] AD7.2 - KPIChecklistView
- [ ] AD7.3 - KPIItemsView
- [ ] AD7.4 - KPIRulesView
- [ ] AD7.5 - KPIFeedbackView

**Target:** 5 screens  
**Deadline:** 13/08/2026

### **Phase 5: Testing & Cleanup (Tuần 5)**
- [ ] Test toàn bộ screens đã migrate
- [ ] Fix bugs phát sinh
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Code review

**Deadline:** 20/08/2026

---

## 🚀 CÁCH CHẠY MIGRATION

### **1. Migration tự động (Khuyến nghị)**

```bash
# Preview changes (dry-run)
node scripts/migrate-all-screens.js --dry-run

# Apply changes cho TẤT CẢ screens
node scripts/migrate-all-screens.js

# Migrate specific file
node scripts/migrate-all-screens.js --file=Auth/Views/UserManagementView.jsx
```

### **2. Migration thủ công**

Xem hướng dẫn chi tiết tại: [HUONG_DAN_DYNAMIC_SCREEN_METADATA.md](./HUONG_DAN_DYNAMIC_SCREEN_METADATA.md)

---

## ✅ CHECKLIST SAU KHI MIGRATE

Sau khi migrate mỗi screen, cần:

- [ ] Test screen hoạt động bình thường
- [ ] Kiểm tra header hiển thị đúng (Screen Code, Title, Subtitle)
- [ ] Test các chức năng chính của screen
- [ ] Kiểm tra console không có lỗi
- [ ] Update status trong file này
- [ ] Update status trong `SCREEN_ROUTE_MAPPING.json`
- [ ] Commit code với message: `feat: migrate [ScreenCode] to dynamic metadata`

---

## 📝 TEMPLATE COMMIT MESSAGE

```
feat: migrate [ScreenCode] to dynamic metadata

- Thêm import useScreenMetadataCached
- Gọi hook để lấy metadata từ database
- Thay thế hardcoded title/subtitle/screenCode
- Test: Screen hiển thị đúng metadata

Screen: [ScreenName]
Route: [RoutePath]
File: [FilePath]
```

**Ví dụ:**
```
feat: migrate AD13 to dynamic metadata

- Thêm import useScreenMetadataCached
- Gọi hook để lấy metadata từ database
- Thay thế hardcoded title/subtitle/screenCode
- Test: Screen hiển thị đúng metadata

Screen: Hồ sơ chất lượng
Route: /admin/quality-records
File: QualityRecords/Views/QualityRecordsListView.jsx
```

---

## 🐛 ISSUES & NOTES

### **Known Issues:**
_Chưa có issues_

### **Notes:**
1. Một số screens có logic đặc biệt (như ScreenDetailView) cần xử lý riêng
2. Screens có dynamic title (như PlanDetailView) cần giữ lại logic dynamic
3. Cần test kỹ trên cả Web và Mobile

---

## 📞 SUPPORT

**Slack:** #erp-frontend  
**Lead:** Phúc (IT)  
**Documentation:** [Confluence](link)

---

**Last updated:** 16/07/2026 21:35  
**Next review:** 17/07/2026
