# SmartFlow v2 Directory Tree - BE + FrontEnd Mobile/Web MVC

Tài liệu này mô tả cây thư mục chuẩn cho SmartFlow v2.

Mục tiêu kiến trúc:

- Tách rõ `BackEnd` và `FrontEnd`.
- Trong `FrontEnd`, tách rõ `Mobile` và `Web`.
- Cả `Mobile` và `Web` đều đi theo mô hình `MVC`.
- Code dùng chung giữa Mobile/Web đặt tại `FrontEnd/shared`.
- Mỗi module nghiệp vụ có `Models`, `Views`, `Controllers` riêng.
- Component dùng chung theo nền tảng đặt trong `Mobile/Shared` hoặc `Web/Shared`.
- Component dùng chung toàn FrontEnd đặt trong `FrontEnd/shared`.

---

# 1. Tổng quan cây thư mục

```txt
SmartFlow_v2/
├── ARCHITECTURE_FLOW.md
├── SMARTFLOW_V2_DIRECTORY_TREE.md
├── README.md
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── workflows/
│
├── BackEnd/
│   ├── README.md
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── modules/
│   ├── shared/
│   ├── scripts/
│   └── tests/
│
└── FrontEnd/
    ├── README.md
    ├── package.json
    ├── vite.config.js
    ├── shared/
    ├── Mobile/
    └── Web/
```

---

# 2. BackEnd chi tiết

```txt
BackEnd/
├── README.md
├── requirements.txt
├── .env.example
│
├── app/
│   ├── main.py
│   ├── routes.py
│   ├── middleware.py
│   ├── exception_handler.py
│   └── lifecycle.py
│
├── config/
│   ├── settings.py
│   ├── database.py
│   ├── cors.py
│   ├── logging.py
│   └── security.py
│
├── database/
│   ├── migrations/
│   ├── seeders/
│   ├── backups/
│   └── README.md
│
├── shared/
│   ├── constants/
│   │   ├── app_constants.py
│   │   ├── status_constants.py
│   │   └── role_constants.py
│   │
│   ├── exceptions/
│   │   ├── base_exception.py
│   │   ├── auth_exception.py
│   │   └── validation_exception.py
│   │
│   ├── middlewares/
│   │   ├── auth_middleware.py
│   │   ├── logging_middleware.py
│   │   └── error_middleware.py
│   │
│   ├── services/
│   │   ├── file_service.py
│   │   ├── notification_service.py
│   │   ├── websocket_service.py
│   │   └── storage_service.py
│   │
│   ├── utils/
│   │   ├── date_utils.py
│   │   ├── string_utils.py
│   │   ├── response_utils.py
│   │   └── pagination_utils.py
│   │
│   ├── validators/
│   │   ├── common_validator.py
│   │   └── file_validator.py
│   │
│   └── security/
│       ├── password.py
│       ├── token.py
│       └── permissions.py
│
├── modules/
│   ├── auth/
│   ├── delivery/
│   ├── inspection/
│   ├── kpi/
│   ├── capa/
│   ├── equipment/
│   ├── notification/
│   └── report/
│
├── scripts/
│   ├── create_admin.py
│   ├── migrate.py
│   └── seed_data.py
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

# 3. BackEnd module pattern

Mỗi module backend nên theo cấu trúc:

```txt
modules/[module-name]/
├── controllers/
│   └── [module]_controller.py
│
├── models/
│   └── [module]_model.py
│
├── services/
│   └── [module]_service.py
│
├── schemas/
│   ├── [module]_request.py
│   └── [module]_response.py
│
├── repositories/
│   └── [module]_repository.py
│
├── routes/
│   └── [module]_routes.py
│
├── validators/
│   └── [module]_validator.py
│
└── tests/
    └── test_[module].py
```

Ví dụ module `delivery`:

```txt
modules/delivery/
├── controllers/
│   ├── delivery_controller.py
│   ├── delivery_receive_controller.py
│   └── delivery_return_controller.py
│
├── models/
│   ├── delivery_model.py
│   ├── delivery_detail_model.py
│   ├── pallet_model.py
│   └── return_model.py
│
├── services/
│   ├── delivery_service.py
│   ├── delivery_receive_service.py
│   └── return_service.py
│
├── schemas/
│   ├── delivery_request.py
│   ├── delivery_response.py
│   ├── receive_request.py
│   └── return_request.py
│
├── repositories/
│   ├── delivery_repository.py
│   └── pallet_repository.py
│
├── routes/
│   └── delivery_routes.py
│
├── validators/
│   └── delivery_validator.py
│
└── tests/
    └── test_delivery.py
```

---

# 4. FrontEnd tổng quan

```txt
FrontEnd/
├── README.md
├── package.json
├── vite.config.js
├── jsconfig.json
├── index.html
│
├── shared/
│   ├── assets/
│   ├── styles/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   ├── constants/
│   └── types/
│
├── Mobile/
│   ├── app/
│   ├── assets/
│   ├── styles/
│   ├── Shared/
│   ├── Auth/
│   ├── Delivery/
│   ├── Inspection/
│   ├── KPI/
│   ├── CAPA/
│   ├── Equipment/
│   ├── Notification/
│   └── Report/
│
└── Web/
    ├── app/
    ├── assets/
    ├── styles/
    ├── Shared/
    ├── Auth/
    ├── Dashboard/
    ├── Delivery/
    ├── Inspection/
    ├── KPI/
    ├── CAPA/
    ├── Equipment/
    ├── Notification/
    └── Report/
```

---

# 5. FrontEnd/shared chi tiết

`FrontEnd/shared` là nơi dùng chung cho cả Mobile và Web.

```txt
FrontEnd/shared/
├── assets/
│   ├── images/
│   │   ├── logo-no-bg.png
│   │   ├── background-1.png
│   │   └── placeholder.png
│   │
│   ├── icons/
│   └── fonts/
│
├── styles/
│   ├── normalize.css
│   ├── theme.css
│   ├── tokens.css
│   ├── utilities.css
│   └── print.css
│
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── storageService.js
│   ├── pushNotificationService.js
│   ├── websocketService.js
│   └── fileUploadService.js
│
├── hooks/
│   ├── useDebounce.js
│   ├── useClickOutside.js
│   ├── useWebSocket.js
│   ├── useLongPress.js
│   ├── useLocalStorage.js
│   └── useNetworkStatus.js
│
├── store/
│   ├── authStore.js
│   ├── uiStore.js
│   ├── notificationStore.js
│   └── appStore.js
│
├── utils/
│   ├── formatDate.js
│   ├── formatNumber.js
│   ├── validators.js
│   ├── statusColor.js
│   ├── routeGuards.js
│   ├── objectUtils.js
│   └── fileUtils.js
│
├── constants/
│   ├── routes.js
│   ├── apiEndpoints.js
│   ├── appConfig.js
│   ├── roles.js
│   └── statuses.js
│
└── types/
    ├── authTypes.js
    ├── deliveryTypes.js
    ├── inspectionTypes.js
    └── commonTypes.js
```

## 5.1. Quy tắc dùng `FrontEnd/shared`

Đặt file vào đây khi:

- Mobile và Web đều cần dùng.
- Không phụ thuộc layout riêng của Mobile hoặc Web.
- Không chứa UI flow riêng theo nền tảng.
- Không chứa thuật ngữ UI đặc thù như bottom tab, desktop sidebar drawer.

Ví dụ nên dùng chung:

```txt
api.js
storageService.js
authStore.js
useWebSocket.js
formatDate.js
validators.js
theme.css
routes.js
apiEndpoints.js
```

---

# 6. FrontEnd/Mobile theo MVC

```txt
FrontEnd/Mobile/
├── app/
│   ├── App.jsx
│   ├── routes.jsx
│   ├── providers.jsx
│   └── bootstrap.jsx
│
├── assets/
│   ├── images/
│   └── icons/
│
├── styles/
│   ├── mobile.css
│   ├── components.css
│   ├── layout.css
│   └── index.css
│
├── Shared/
│   ├── Models/
│   │   └── mobileUiModel.js
│   │
│   ├── Views/
│   │   └── components/
│   │       ├── ui/
│   │       │   ├── Button.jsx
│   │       │   ├── Input.jsx
│   │       │   ├── Badge.jsx
│   │       │   ├── Tabs.jsx
│   │       │   ├── DataTable.jsx
│   │       │   └── ProgressBar.jsx
│   │       │
│   │       ├── form/
│   │       │   ├── FormInput.jsx
│   │       │   ├── FormSelect.jsx
│   │       │   ├── FormSearchSelect.jsx
│   │       │   └── FormMultiSearchSelect.jsx
│   │       │
│   │       ├── layout/
│   │       │   ├── MobileLayout.jsx
│   │       │   ├── MobileSidebar.jsx
│   │       │   ├── MobilePageHeader.jsx
│   │       │   └── MobileBottomNav.jsx
│   │       │
│   │       ├── feedback/
│   │       │   ├── ConfirmModal.jsx
│   │       │   ├── MessageModal.jsx
│   │       │   ├── LoadingOverlay.jsx
│   │       │   └── Toast.jsx
│   │       │
│   │       ├── media/
│   │       │   ├── ImagePreview.jsx
│   │       │   ├── PhotoPicker.jsx
│   │       │   ├── QRScanner.jsx
│   │       │   └── QRDisplayModal.jsx
│   │       │
│   │       └── user/
│   │           └── UserProfileCard.jsx
│   │
│   └── Controllers/
│       ├── mobileUiController.js
│       └── mobileNavigationController.js
│
├── Auth/
├── Delivery/
├── Inspection/
├── KPI/
├── CAPA/
├── Equipment/
├── Notification/
└── Report/
```

---

# 7. Mobile module MVC pattern

Mỗi module trong `FrontEnd/Mobile` nên theo cấu trúc:

```txt
Mobile/[Module]/
├── Models/
│   ├── [module]Model.js
│   ├── [module]Store.js
│   ├── [module]Mapper.js
│   └── [module]Types.js
│
├── Views/
│   ├── [Module]MainView.jsx
│   ├── [Module]CreateView.jsx
│   ├── [Module]DetailView.jsx
│   ├── components/
│   └── [module].css
│
└── Controllers/
    ├── [module]Controller.js
    └── [module]Actions.js
```

## 7.1. Mobile Auth

```txt
FrontEnd/Mobile/Auth/
├── Models/
│   ├── authModel.js
│   ├── authStore.js
│   └── authTypes.js
│
├── Views/
│   ├── LoginView.jsx
│   ├── components/
│   │   ├── LoginForm.jsx
│   │   ├── LoginHeader.jsx
│   │   └── RememberMeCheckbox.jsx
│   └── auth.css
│
└── Controllers/
    ├── authController.js
    └── loginActions.js
```

## 7.2. Mobile Delivery

```txt
FrontEnd/Mobile/Delivery/
├── Models/
│   ├── deliveryModel.js
│   ├── deliveryStore.js
│   ├── pendingQCStore.js
│   ├── deliveryMapper.js
│   └── deliveryTypes.js
│
├── Views/
│   ├── DeliveryInfoView.jsx
│   ├── DeliveryCreateView.jsx
│   ├── DeliveryReceiveView.jsx
│   ├── components/
│   │   ├── DeliveryFilterBar.jsx
│   │   ├── DeliveryStatusBadge.jsx
│   │   ├── DeliveryPhotoPicker.jsx
│   │   ├── DeliveryFooter.jsx
│   │   ├── HandoverTab.jsx
│   │   ├── InspectionChecklist.jsx
│   │   ├── QCSummarySection.jsx
│   │   ├── PalletCardModal.jsx
│   │   ├── PlanDetailsModal.jsx
│   │   └── ReturnReasonModal.jsx
│   └── delivery.css
│
└── Controllers/
    ├── deliveryController.js
    ├── deliveryCreateController.js
    ├── deliveryReceiveController.js
    └── returnController.js
```

## 7.3. Mobile Inspection

```txt
FrontEnd/Mobile/Inspection/
├── Models/
│   ├── inspectionModel.js
│   ├── inspectionStore.js
│   ├── inspectionMapper.js
│   └── inspectionTypes.js
│
├── Views/
│   ├── DailyInspectionView.jsx
│   ├── StageInspectionView.jsx
│   ├── InspectionLogsView.jsx
│   ├── InputInspectionView.jsx
│   ├── components/
│   │   ├── InspectionChecklist.jsx
│   │   ├── InspectionResultCard.jsx
│   │   ├── InspectionPhotoPicker.jsx
│   │   └── InspectionLogItem.jsx
│   └── inspection.css
│
└── Controllers/
    ├── inspectionController.js
    ├── dailyInspectionController.js
    └── stageInspectionController.js
```

## 7.4. Mobile KPI

```txt
FrontEnd/Mobile/KPI/
├── Models/
│   ├── kpiModel.js
│   ├── kpiStore.js
│   └── kpiTypes.js
│
├── Views/
│   ├── KPITrackingView.jsx
│   ├── KPIStaffListView.jsx
│   ├── components/
│   │   ├── KPIProgressCard.jsx
│   │   ├── KPIStaffCard.jsx
│   │   └── KPIStatusBadge.jsx
│   └── kpi.css
│
└── Controllers/
    ├── kpiController.js
    └── kpiStaffController.js
```

## 7.5. Mobile CAPA

```txt
FrontEnd/Mobile/CAPA/
├── Models/
│   ├── capaModel.js
│   ├── capaStore.js
│   └── capaTypes.js
│
├── Views/
│   ├── CAPAListView.jsx
│   ├── CAPAReportView.jsx
│   ├── CAPADetailView.jsx
│   ├── components/
│   │   ├── CAPACard.jsx
│   │   ├── CAPAStatusBadge.jsx
│   │   └── CAPAAttachmentList.jsx
│   └── capa.css
│
└── Controllers/
    ├── capaController.js
    ├── capaReportController.js
    └── capaDetailController.js
```

---

# 8. FrontEnd/Web theo MVC

```txt
FrontEnd/Web/
├── app/
│   ├── App.jsx
│   ├── routes.jsx
│   ├── providers.jsx
│   └── bootstrap.jsx
│
├── assets/
│   ├── images/
│   └── icons/
│
├── styles/
│   ├── web.css
│   ├── dashboard.css
│   ├── components.css
│   ├── layout.css
│   └── index.css
│
├── Shared/
│   ├── Models/
│   │   └── webUiModel.js
│   │
│   ├── Views/
│   │   └── components/
│   │       ├── ui/
│   │       │   ├── Button.jsx
│   │       │   ├── Input.jsx
│   │       │   ├── Badge.jsx
│   │       │   ├── Table.jsx
│   │       │   ├── Tabs.jsx
│   │       │   └── ChartCard.jsx
│   │       │
│   │       ├── form/
│   │       │   ├── FormInput.jsx
│   │       │   ├── FormSelect.jsx
│   │       │   ├── SearchableSelect.jsx
│   │       │   └── DateRangePicker.jsx
│   │       │
│   │       ├── layout/
│   │       │   ├── WebLayout.jsx
│   │       │   ├── Sidebar.jsx
│   │       │   ├── Topbar.jsx
│   │       │   ├── Breadcrumb.jsx
│   │       │   └── PageContainer.jsx
│   │       │
│   │       ├── feedback/
│   │       │   ├── ConfirmModal.jsx
│   │       │   ├── MessageModal.jsx
│   │       │   ├── LoadingOverlay.jsx
│   │       │   └── Toast.jsx
│   │       │
│   │       └── user/
│   │           └── UserProfileDropdown.jsx
│   │
│   └── Controllers/
│       ├── webUiController.js
│       └── webNavigationController.js
│
├── Auth/
├── Dashboard/
├── Delivery/
├── Inspection/
├── KPI/
├── CAPA/
├── Equipment/
├── Notification/
└── Report/
```

---

# 9. Web module MVC pattern

Mỗi module trong `FrontEnd/Web` nên theo cấu trúc:

```txt
Web/[Module]/
├── Models/
│   ├── [module]Model.js
│   ├── [module]Store.js
│   ├── [module]Mapper.js
│   └── [module]Types.js
│
├── Views/
│   ├── [Module]ListView.jsx
│   ├── [Module]DetailView.jsx
│   ├── [Module]CreateView.jsx
│   ├── components/
│   └── [module].css
│
└── Controllers/
    ├── [module]Controller.js
    └── [module]Actions.js
```

## 9.1. Web Auth

```txt
FrontEnd/Web/Auth/
├── Models/
│   ├── authModel.js
│   ├── authStore.js
│   └── authTypes.js
│
├── Views/
│   ├── LoginView.jsx
│   ├── components/
│   │   ├── LoginPanel.jsx
│   │   └── LoginBackground.jsx
│   └── auth.css
│
└── Controllers/
    ├── authController.js
    └── loginActions.js
```

## 9.2. Web Dashboard

```txt
FrontEnd/Web/Dashboard/
├── Models/
│   ├── dashboardModel.js
│   ├── dashboardStore.js
│   └── dashboardTypes.js
│
├── Views/
│   ├── DashboardView.jsx
│   ├── components/
│   │   ├── KPIWidget.jsx
│   │   ├── ChartPanel.jsx
│   │   ├── RecentActivityTable.jsx
│   │   └── SummaryCard.jsx
│   └── dashboard.css
│
└── Controllers/
    └── dashboardController.js
```

## 9.3. Web Delivery

```txt
FrontEnd/Web/Delivery/
├── Models/
│   ├── deliveryModel.js
│   ├── deliveryStore.js
│   ├── deliveryMapper.js
│   └── deliveryTypes.js
│
├── Views/
│   ├── DeliveryListView.jsx
│   ├── DeliveryDetailView.jsx
│   ├── DeliveryCreateView.jsx
│   ├── DeliveryReceiveView.jsx
│   ├── components/
│   │   ├── DeliveryTable.jsx
│   │   ├── DeliveryFilterPanel.jsx
│   │   ├── DeliveryDetailDrawer.jsx
│   │   ├── DeliveryStatusBadge.jsx
│   │   ├── PalletTable.jsx
│   │   └── ReturnReasonModal.jsx
│   └── delivery.css
│
└── Controllers/
    ├── deliveryController.js
    ├── deliveryCreateController.js
    └── deliveryReceiveController.js
```

## 9.4. Web Inspection

```txt
FrontEnd/Web/Inspection/
├── Models/
│   ├── inspectionModel.js
│   ├── inspectionStore.js
│   └── inspectionTypes.js
│
├── Views/
│   ├── InspectionDashboardView.jsx
│   ├── InspectionLogsView.jsx
│   ├── InspectionDetailView.jsx
│   ├── components/
│   │   ├── InspectionTable.jsx
│   │   ├── InspectionFilterPanel.jsx
│   │   ├── InspectionChart.jsx
│   │   └── InspectionStatusBadge.jsx
│   └── inspection.css
│
└── Controllers/
    ├── inspectionController.js
    └── inspectionReportController.js
```

---

# 10. Quy định MVC trong FrontEnd

## 10.1. Models

`Models` chứa:

- Zustand store hoặc state model.
- Data shape.
- Mapper/transformer.
- Type/constants riêng module.
- Logic liên quan tới dữ liệu, không render UI.

Ví dụ:

```txt
Delivery/Models/deliveryStore.js
Delivery/Models/deliveryMapper.js
Delivery/Models/deliveryTypes.js
```

Không đặt JSX trong `Models`.

## 10.2. Views

`Views` chứa:

- Page/screen.
- Component UI của module.
- CSS riêng module.

Ví dụ:

```txt
Delivery/Views/DeliveryInfoView.jsx
Delivery/Views/components/DeliveryStatusBadge.jsx
Delivery/Views/delivery.css
```

View không nên gọi API trực tiếp nếu có Controller/Service phù hợp.

## 10.3. Controllers

`Controllers` chứa:

- Logic điều phối giữa View và Model.
- Hook/controller cho fetch, submit, validate, action.
- Gọi shared service hoặc module service.

Ví dụ:

```txt
Delivery/Controllers/deliveryController.js
Auth/Controllers/authController.js
```

Controller không render JSX.

---

# 11. Quy định file dùng chung theo cấp

## 11.1. Dùng chung toàn FrontEnd

Đặt tại:

```txt
FrontEnd/shared/
```

Ví dụ:

```txt
api.js
authStore.js
notificationStore.js
useWebSocket.js
formatDate.js
validators.js
routes.js
apiEndpoints.js
theme.css
```

## 11.2. Dùng chung trong Mobile

Đặt tại:

```txt
FrontEnd/Mobile/Shared/
```

Ví dụ:

```txt
MobileLayout.jsx
MobilePageHeader.jsx
MobileBottomNav.jsx
Mobile-specific Button/Input nếu style khác Web
```

## 11.3. Dùng chung trong Web

Đặt tại:

```txt
FrontEnd/Web/Shared/
```

Ví dụ:

```txt
WebLayout.jsx
Topbar.jsx
Breadcrumb.jsx
Desktop Table.jsx
DateRangePicker.jsx
```

## 11.4. Dùng riêng module

Đặt trong module tương ứng:

```txt
FrontEnd/Mobile/Delivery/Views/components/
FrontEnd/Web/Delivery/Views/components/
```

---

# 12. Quy trình quyết định vị trí file mới

```txt
Cần tạo file mới?
│
├── File thuộc BackEnd?
│   ├── Có → BackEnd/modules/[module] hoặc BackEnd/shared
│   └── Không → FrontEnd
│
├── File dùng cả Mobile và Web?
│   ├── Có → FrontEnd/shared
│   └── Không → tiếp tục
│
├── File dùng cho Mobile?
│   ├── Có → FrontEnd/Mobile
│   └── Không → FrontEnd/Web
│
├── File dùng chung trong nền tảng đó?
│   ├── Có → Mobile/Shared hoặc Web/Shared
│   └── Không → Module nghiệp vụ
│
├── File thuộc module nào?
│   ├── Auth
│   ├── Delivery
│   ├── Inspection
│   ├── KPI
│   ├── CAPA
│   ├── Equipment
│   └── Report
│
└── File là M, V hay C?
    ├── State/data/mapper/type → Models
    ├── UI/page/component/css → Views
    └── Action/fetch/submit/orchestration → Controllers
```

---

# 13. Quy tắc import đề xuất

Nên cấu hình alias:

```js
'@shared': './FrontEnd/shared'
'@mobile': './FrontEnd/Mobile'
'@web': './FrontEnd/Web'
```

Ví dụ import:

```js
import apiClient from '@shared/services/api'
import useAuthStore from '@shared/store/authStore'
import MobileLayout from '@mobile/Shared/Views/components/layout/MobileLayout'
import DeliveryInfoView from '@mobile/Delivery/Views/DeliveryInfoView'
import WebLayout from '@web/Shared/Views/components/layout/WebLayout'
```

Tránh import dài như:

```js
import apiClient from '../../../../shared/services/api'
```

---

# 14. Checklist khi thêm/sửa code

Trước khi thêm hoặc sửa code, kiểm tra:

- Đã đọc `ARCHITECTURE_FLOW.md` chưa?
- File thuộc BackEnd hay FrontEnd?
- Nếu FrontEnd, file dùng chung Mobile/Web không?
- Nếu không dùng chung, file thuộc Mobile hay Web?
- File thuộc module nghiệp vụ nào?
- File là Model, View hay Controller?
- Có file tương tự đã tồn tại chưa?
- Có đang tạo duplicate service/store/hook/component không?
- CSS là global, platform-specific hay module-specific?
- Có import xuyên tầng sai không?
- Controller có render JSX không? Nếu có là sai.
- Model có render JSX không? Nếu có là sai.
- View có gọi API trực tiếp không? Nếu có nên xem xét đưa vào Controller/Service.

---

# 15. Kết luận cấu trúc chuẩn

Cấu trúc chuẩn của SmartFlow v2 là:

```txt
SmartFlow_v2/
├── BackEnd/
│   ├── app/
│   ├── config/
│   ├── shared/
│   └── modules/
│
└── FrontEnd/
    ├── shared/
    ├── Mobile/
    │   ├── Shared/
    │   └── [Module]/
    │       ├── Models/
    │       ├── Views/
    │       └── Controllers/
    │
    └── Web/
        ├── Shared/
        └── [Module]/
            ├── Models/
            ├── Views/
            └── Controllers/
```

Đây là tài liệu cây thư mục chính để dựa vào khi build lại SmartFlow v2.
