# PRODUCTION_V2 MODULE — KẾ HOẠCH PHÁT TRIỂN CHI TIẾT

> Phiên bản: 1.0 | Ngày: 05/08/2026  
> Module: `production_v2` | Menu: **Thông tin sản xuất v2**

---

## 1. TỔNG QUAN MODULE

### 1.1 Menu structure (Image 1)
```
Thông tin sản xuất v2
  ├── Lệnh sản xuất          → /production_v2/orders
  ├── Kế hoạch sản xuất      → /production_v2/plans
  └── Lịch sử luân chuyển   → /production_v2/transfer-history
       └── [dẫn sang CL06 tab Lịch sử]
```

### 1.2 Nhóm màn hình chính (CL06–CL09, từ Images 2–4)
| Mã   | Tên màn hình               | Route                             |
|------|----------------------------|------------------------------------|
| CL06 | Danh sách luân chuyển      | `/production_v2/transfer-list`     |
| CL07 | Tạo phiếu luân chuyển      | `/production_v2/transfer/:id?`     |
| CL08 | Danh sách phiếu kiểm tra   | `/production_v2/inspection-list`   |
| CL09 | Tạo phiếu kiểm tra         | `/production_v2/inspection/:id?`   |

### 1.3 Màn hình phụ / Modal
| Mã     | Tên                      | Loại  |
|--------|--------------------------|-------|
| CL07.1 | Xác nhận số lượng giao   | Modal |
| CL09.1 | Xác nhận số lượng lỗi    | Modal |
| CL09.2 | Hoàn thành kiểm tra      | Modal |

---

## 2. CẤU TRÚC THƯ MỤC

```
FrontEnd/Mobile/modules/production_v2/
├── constants.js                    ← routes, permissions, statuses, options
├── Models/
│   └── production_v2Store.js       ← Zustand store
├── services/
│   ├── transferService.js          ← API luân chuyển
│   └── inspectionService.js        ← API kiểm tra
├── Controllers/
│   ├── useTransferController.js    ← logic CL06/CL07
│   └── useInspectionController.js  ← logic CL08/CL09
├── Views/
│   ├── CL06_TransferListView.jsx
│   ├── CL07_TransferCreateView.jsx
│   ├── CL08_InspectionListView.jsx
│   ├── CL09_InspectionCreateView.jsx
│   └── components/
│       ├── TransferCard.jsx        ← card trong CL06
│       ├── TransferItemTable.jsx   ← bảng STT/Chi tiết/Quy cách/SL trong CL07
│       ├── InspectionCard.jsx      ← card trong CL08
│       ├── InspectionStepsTable.jsx← bảng Hướng dẫn kiểm tra CL09
│       ├── ErrorTrendRow.jsx       ← hàng "Theo dõi xu hướng lỗi"
│       ├── FilterPanel.jsx         ← panel bộ lọc CL06
│       ├── ConfirmQtyModal.jsx     ← modal CL07.1
│       ├── ConfirmErrorQtyModal.jsx← modal CL09.1
│       └── FinishInspectionModal.jsx← modal CL09.2
└── styles/
    └── production_v2.css
```

---

## 3. PHÂN TÍCH CHI TIẾT TỪNG MÀN HÌNH

---

### CL06 — Danh sách luân chuyển (Image 2)

**Header:** `Khởi tạo phiếu | CL06: Danh sách luân chuyển`

#### Toolbar
| Thành phần       | Chi tiết                                      |
|------------------|-----------------------------------------------|
| Dropdown Kế hoạch | Chọn tháng (Tháng 7), gọi API filter theo plan |
| Icon Sort/Filter  | Mở `FilterPanel` dạng slide-over              |
| Button "+ Thêm mới" | Điều hướng sang CL07 (tạo mới)             |

#### Tabs
| Tab                        | Mô tả                                        |
|----------------------------|----------------------------------------------|
| Phiếu cần xác nhận (badge) | Danh sách phiếu đang chờ xác nhận            |
| Lịch sử luân chuyển        | Phiếu đã hoàn thành / huỷ                   |

#### Ticket Card (mỗi phiếu)
```
[Mã phiếu] [Badge version V1/V2]      [HH:MM | DD/M/YYYY]
[Công đoạn giao] - [Công đoạn nhận]
                                         [Chờ xác nhận / tag trạng thái]
```
- Click card → navigate sang CL07 (xem chi tiết/xác nhận)

#### FilterPanel (slide-over từ trái, Image 2 bên trái)
| Field                  | Type           | Options                         |
|------------------------|----------------|---------------------------------|
| Lọc theo ngày tạo phiếu | Date range    | From/To date picker             |
| Lọc theo trạng thái    | Dropdown       | Chờ xác nhận / Đang giao / Đã xong |
| Lọc theo nhà máy       | Dropdown       | Danh sách nhà máy từ API        |
| Lọc theo công đoạn     | Dropdown       | Danh sách công đoạn             |
| Lọc theo loại phiếu    | Dropdown       | Tất cả / V1 / V2                |
| Buttons                | —              | Xác nhận / Hủy                  |

#### Pagination
- `Show 1 to 10 of 20 results` với nút `<` `>`
- Client-side hoặc server-side pagination (tham số `page`, `limit`)

---

### CL07 — Tạo phiếu luân chuyển (Image 2 giữa)

**Header:** `Khởi tạo phiếu | CL07: Tạo phiếu luân chuyển`  
**Title:** `Thông Tin Bàn Giao`

#### Header phiếu
```
Phiếu: LC04  (orange bold)
Được tạo bởi: Nguyễn Văn A          [Xem thẻ pallet]
```

#### Form Fields
| Field              | Type                | Bắt buộc | Ghi chú                         |
|--------------------|---------------------|----------|---------------------------------|
| Mã pallet          | Dropdown            | ✓        | Load từ API; option "Không có mã pallet" |
| Tổng số lượng      | Readonly text       | —        | Tự fill khi chọn pallet         |
| Dư (nếu có)        | Number input        | —        | Số lượng dư sau giao            |
| Chi tiết           | Dropdown            | ✓        | Load từ API                     |
| Quy cách           | Dropdown            | ✓        | Load từ API (phụ thuộc Chi tiết)|
| Công đoạn giao     | Readonly text       | —        | Auto fill từ user's stage       |
| Công đoạn nhận     | Dropdown            | ✓        | Load từ API                     |
| Ghi chú            | Textarea            | —        |                                 |
| Thêm ảnh pallet    | File upload button  | —        | Multi-image, preview thumbnail  |

#### Bảng sản phẩm (TransferItemTable)
| Cột        | Mô tả                                           |
|------------|------------------------------------------------|
| STT        | Số thứ tự                                      |
| Chi tiết   | Tên sản phẩm                                   |
| Quy cách   | Quy cách (code)                                |
| Số lượng   | Dạng `x/total` — màu đỏ nếu 0, xanh nếu đủ  |
| Icon ✏     | Click mở modal CL07.1 để nhập SL cụ thể       |

#### Buttons
- **Hủy bỏ** → navigate(-1)
- **Xác nhận** → validate → submit API → success/error toast

---

### CL07.1 — Modal: Xác nhận số lượng giao (Image 2 phải)

**Title:** `CL07.1: Xác nhận số lượng giao`

| Thành phần | Chi tiết                                         |
|------------|--------------------------------------------------|
| Bảng       | Giống TransferItemTable nhưng SL có thể edit inline |
| Hủy bỏ     | Đóng modal, không lưu                           |
| Xác nhận   | Lưu SL → cập nhật bảng trong CL07              |

---

### CL08 — Danh sách phiếu kiểm tra (Image 3 trái)

**Header:** `Khởi tạo phiếu | CL08: Danh sách phiếu kiểm tra`

Cấu trúc tương tự CL06:

#### Toolbar
| Thành phần     | Chi tiết                             |
|----------------|--------------------------------------|
| Dropdown Kế hoạch | Filter theo tháng                 |
| Sort/Filter     | Mở filter panel (tương tự CL06)     |
| "+ Thêm mới"    | Navigate sang CL09 (tạo mới)        |

#### Tabs
| Tab                      | Mô tả                  |
|--------------------------|------------------------|
| Chờ Kiểm Tra (badge)     | Phiếu chờ kiểm tra     |
| Lịch sử lập phiếu        | Phiếu đã kiểm xong     |

#### Inspection Card
```
[Mã phiếu KT01]           [HH:MM | DD/M/YYYY]
PO: APT007
                            [Chờ xác nhận / tag]
```

#### Pagination: giống CL06

---

### CL09 — Tạo phiếu kiểm tra — 5 modes (Images 3 + 4)

**Header:** `Khởi tạo phiếu | CL09: Tạo phiếu kiểm tra`  
**Title:** `Thông Tin Kiểm Tra`

#### Header phiếu
```
Phiếu: KT04  (orange bold)
Được tạo bởi: Nguyễn Văn A
```

#### Selector đầu tiên (common cho mọi mode)
- **Chọn cách kiểm tra** \* → Dropdown chọn mode → re-render form bên dưới
- **Công đoạn** → Dropdown (một số mode có thêm trường phụ bên cạnh)

---

#### MODE 1: Kiểm tra mẫu lần đầu

| Field          | Type         | Bắt buộc |
|----------------|--------------|----------|
| Chọn PO        | Dropdown     | ✓        |
| Kết quả        | Radio: Đạt / Không đạt | — |
| Sản phẩm       | Dropdown     | ✓        |
| Quy cách       | Dropdown     | —        |
| SL Cần Kiểm    | Readonly     | —        |
| SL mẫu         | Number input | ✓        |
| Lỗi (nếu có)   | Number input | —        |

**Hướng dẫn kiểm tra** (InspectionStepsTable):
| Cột       | Mô tả                                     |
|-----------|-------------------------------------------|
| Bước      | Số thứ tự bước                            |
| Mô tả     | Text mô tả bước kiểm                     |
| Tiêu chuẩn| Text tiêu chuẩn                           |
| SL        | Số lượng                                  |
| Kết quả   | Badge: `Đạt` (xanh lá) / `Không đạt` (đỏ)|

**Thêm ảnh kiểm tra** → Multi-image upload

**Ghi chú** → Textarea

**Theo dõi xu hướng lỗi** (ErrorTrendRow):
- Mỗi hàng: `[Tên lỗi input]` `[-] [SL] [+]`
- `+ Ghi nhận lỗi khác` → thêm hàng mới

---

#### MODE 2: Kiểm tra lại

Giống Mode 1, khác biệt:
- Có thêm button `+ Xuất kết quả gần nhất` ngay đầu form

---

#### MODE 3: Kiểm tra thông số

| Field          | Type         | Bắt buộc |
|----------------|--------------|----------|
| Chọn thông số  | Dropdown (Độ ẩm...) | ✓  |
| Công đoạn      | Dropdown     | ✓        |
| PO             | Dropdown     | ✓        |
| Sản phẩm       | Dropdown     | ✓        |
| SL mẫu         | Number input | ✓        |
| SL đạt         | Number input | —        |
| SL không đạt   | Number input | —        |

- Button `Xem hướng dẫn kiểm tra` → expand bảng hướng dẫn
- Thêm ảnh
- Kết quả radio: Đạt / Không đạt
- Ghi chú
- Xu hướng lỗi

---

#### MODE 4: Kiểm tra quy trình

| Field                | Type     | Bắt buộc |
|----------------------|----------|----------|
| Chọn quy trình       | Dropdown | ✓        |
| Chọn khu vực kiểm tra| Dropdown | ✓        |
| Kết quả              | Radio    | —        |

**Các bước của quy trình** → InspectionStepsTable (giống Mode 1)  
Thêm ảnh + Ghi chú

---

#### MODE 5: Vấn đáp

| Field       | Type     | Bắt buộc |
|-------------|----------|----------|
| Tên nhân sự | Dropdown | ✓        |

**Câu hỏi** (3 câu, expandable theo config):
- Header: `Câu hỏi N` + link `Xem đáp án`
- Body: Textarea nhập câu trả lời

**Kết quả** → Radio 3 mức: `Xuất sắc` / `Đạt` / `Không đạt`

---

#### BUTTONS (tất cả modes)
- **Hủy bỏ** → navigate(-1)
- **Xác nhận** → validate → mở modal CL09.1 (nếu mode có SL lỗi) hoặc CL09.2

---

### CL09.1 — Modal: Xác nhận số lượng lỗi (Image 3 phải trên)

| Field               | Type          |
|---------------------|---------------|
| Số lượng lấy mẫu    | Number input  |
| SL không đạt        | Stepper [-][N][+] |
| Hủy bỏ / Xác nhận  | Buttons       |

---

### CL09.2 — Modal: Hoàn thành kiểm tra (Image 3 phải dưới)

| Field                    | Type         |
|--------------------------|--------------|
| PO                       | Readonly     |
| Kết quả                  | Radio: Đạt / Không đạt |
| Sản phẩm                 | Readonly     |
| Quy cách                 | Readonly     |
| SL Cần Kiểm              | Readonly     |
| SL mẫu                   | Readonly     |
| Lỗi (nếu có)             | Readonly     |
| Checkbox hoàn thành      | `☐ Xác nhận hoàn thành kiểm tra cho mã Pallet: [DA7819]` |
| Button "Tạo mã pallet"   | Nếu chưa có mã pallet → tạo mới |
| Hủy bỏ / Xác nhận        | Buttons      |

---

## 4. CONSTANTS CẦN ĐỊNH NGHĨA

```js
// routes
ROUTES.TRANSFER_LIST        = '/production_v2/transfer-list'
ROUTES.TRANSFER_CREATE      = '/production_v2/transfer/:id?'
ROUTES.INSPECTION_LIST      = '/production_v2/inspection-list'
ROUTES.INSPECTION_CREATE    = '/production_v2/inspection/:id?'

// ticket status
STATUS.PENDING    = 'pending'    // Chờ xác nhận
STATUS.DELIVERING = 'delivering' // Đang giao
STATUS.DONE       = 'done'       // Đã xong
STATUS.CANCELLED  = 'cancelled'  // Đã hủy

// ticket version
VERSION.V1 = 'V1'
VERSION.V2 = 'V2'

// inspection modes
INSPECT_MODE.FIRST_SAMPLE   = 'first_sample'   // Kiểm tra mẫu lần đầu
INSPECT_MODE.RE_INSPECT     = 're_inspect'      // Kiểm tra lại
INSPECT_MODE.PARAMETER      = 'parameter'       // Kiểm tra thông số
INSPECT_MODE.PROCESS        = 'process'         // Kiểm tra quy trình
INSPECT_MODE.QA             = 'qa'              // Vấn đáp

// inspection result
INSPECT_RESULT.PASS    = 'pass'     // Đạt
INSPECT_RESULT.FAIL    = 'fail'     // Không đạt
INSPECT_RESULT.EXCELLENT = 'excellent' // Xuất sắc (chỉ mode Vấn đáp)

// permissions
PERMISSION.TRANSFER_LIST      = 'mobile_production_v2_transfer_list'
PERMISSION.TRANSFER_CREATE    = 'mobile_production_v2_transfer_create'
PERMISSION.INSPECTION_LIST    = 'mobile_production_v2_inspection_list'
PERMISSION.INSPECTION_CREATE  = 'mobile_production_v2_inspection_create'
```

---

## 5. ZUSTAND STORE — `production_v2Store.js`

```js
{
  // CL06 state
  transferFilters: {
    month: '',         // kế hoạch/tháng
    dateFrom: '',
    dateTo: '',
    status: '',
    factory: '',
    stage: '',
    type: '',
    tab: 'pending',    // 'pending' | 'history'
  },
  setTransferFilters: (partial) => ...,

  // CL07 state
  currentTransferTicket: null,
  setCurrentTransferTicket: (ticket) => ...,

  // CL08 state
  inspectionFilters: {
    month: '',
    tab: 'pending',    // 'pending' | 'history'
  },
  setInspectionFilters: (partial) => ...,

  // CL09 state
  currentInspectionTicket: null,
  inspectionMode: 'first_sample',
  setInspectionMode: (mode) => ...,
  setCurrentInspectionTicket: (ticket) => ...,
}
```

---

## 6. SERVICES / API

### transferService.js
| Function              | Method | Endpoint                     | Params                   |
|-----------------------|--------|------------------------------|--------------------------|
| `getTransferList`     | GET    | `/deliveries/`               | filters, page, limit     |
| `getTransferById`     | GET    | `/deliveries/:id`            | —                        |
| `createTransfer`      | POST   | `/deliveries/`               | form data                |
| `confirmTransfer`     | PATCH  | `/deliveries/:id/confirm`    | quantities               |
| `uploadPalletImage`   | POST   | `/deliveries/upload-image`   | multipart/form-data      |
| `getPallets`          | GET    | `/pallets/`                  | stageId                  |
| `getStages`           | GET    | `/stages/`                   | —                        |

### inspectionService.js
| Function                 | Method | Endpoint                         | Params             |
|--------------------------|--------|----------------------------------|--------------------|
| `getInspectionList`      | GET    | `/inspections/`                  | filters, page      |
| `getInspectionById`      | GET    | `/inspections/:id`               | —                  |
| `createInspection`       | POST   | `/inspections/`                  | mode + form data   |
| `confirmInspection`      | PATCH  | `/inspections/:id/confirm`       | result data        |
| `uploadInspectionImage`  | POST   | `/inspections/upload-image`      | multipart          |
| `getInspectionGuide`     | GET    | `/inspections/guide`             | mode, productId    |
| `getPOs`                 | GET    | `/production-orders/`            | —                  |
| `getProducts`            | GET    | `/products/`                     | —                  |

---

## 7. COMPONENT LIBRARY TÁI SỬ DỤNG (từ Shared)

| Component          | Path                                            | Dùng ở            |
|--------------------|------------------------------------------------|-------------------|
| `MobileLayout`     | `Shared/Views/components/layout/MobileLayout`  | Tất cả views      |
| `MobilePageHeader` | `Shared/Views/components/layout/MobilePageHeader` | Tất cả views   |
| `Tabs`             | `Shared/Views/components/ui/Tabs`              | CL06, CL08        |
| `CustomSelect`     | `Shared/Views/components/form/CustomSelect`    | Tất cả dropdowns  |

---

## 8. TÍCH HỢP VÀO APP

### 8.1 `vite.config.js` — thêm alias
```js
'@modules/production_v2': path.resolve(__dirname, 'modules/production_v2')
```

### 8.2 `App.jsx` — thêm routes
```jsx
<Route path="/production_v2/transfer-list"   element={<CL06_TransferListView />} />
<Route path="/production_v2/transfer/:id?"   element={<CL07_TransferCreateView />} />
<Route path="/production_v2/inspection-list" element={<CL08_InspectionListView />} />
<Route path="/production_v2/inspection/:id?" element={<CL09_InspectionCreateView />} />
```

### 8.3 `ProtectedRoute.jsx` — thêm permission mapping
```js
'/production_v2/transfer-list':   'mobile_production_v2_transfer_list',
'/production_v2/transfer':        'mobile_production_v2_transfer_create',
'/production_v2/inspection-list': 'mobile_production_v2_inspection_list',
'/production_v2/inspection':      'mobile_production_v2_inspection_create',
```

### 8.4 `MobileSidebar.jsx` — thêm menu group
```js
{
  id: 'production-v2-menu',
  title: 'Thông tin sản xuất v2',
  icon: 'Users',
  children: [
    { id: 'pv2-orders',   title: 'Lệnh sản xuất',       route_path: '/production_v2/orders',           icon: 'FileText' },
    { id: 'pv2-plans',    title: 'Kế hoạch sản xuất',   route_path: '/production_v2/plans',            icon: 'Calendar' },
    { id: 'pv2-transfer', title: 'Lịch sử luân chuyển', route_path: '/production_v2/transfer-list',    icon: 'Truck' },
    { id: 'pv2-inspect',  title: 'Danh sách kiểm tra',  route_path: '/production_v2/inspection-list',  icon: 'ClipboardCheck' },
  ]
}
```

---

## 9. PHÂN CHIA PHASES THỰC HIỆN

### Phase 1 — Khung module + Tích hợp (~ 1 ngày)
- [ ] Tạo toàn bộ thư mục theo cấu trúc mục 2
- [ ] `constants.js` — đầy đủ routes, statuses, modes, permissions
- [ ] `production_v2Store.js` — Zustand store
- [ ] Stub views (placeholder) cho CL06–CL09
- [ ] Tích hợp: `App.jsx`, `vite.config.js`, `ProtectedRoute.jsx`, `MobileSidebar.jsx`
- [ ] `production_v2.css` — base styles (CSS variables, card, toolbar, form)
- [ ] Build thành công, menu hiển thị đúng

### Phase 2 — CL06 + FilterPanel (~ 1 ngày)
- [ ] `transferService.js` — API + mock data
- [ ] `useTransferController.js` — list, pagination, filters
- [ ] `CL06_TransferListView.jsx` — Toolbar, Tabs, Cards, Pagination
- [ ] `TransferCard.jsx` — card component
- [ ] `FilterPanel.jsx` — slide-over với 5 filter fields
- [ ] Test filter + tab switching

### Phase 3 — CL07 + Modal CL07.1 (~ 1.5 ngày)
- [ ] `CL07_TransferCreateView.jsx` — full form
- [ ] `TransferItemTable.jsx` — bảng sản phẩm với icon edit
- [ ] `ConfirmQtyModal.jsx` — modal CL07.1 với editable SL
- [ ] Pallet selection logic (dropdown + "Không có mã pallet")
- [ ] Image upload (Thêm ảnh pallet) — Capacitor Camera hoặc file input
- [ ] Submit + validation + toast

### Phase 4 — CL08 (~ 0.5 ngày)
- [ ] `inspectionService.js` — API + mock
- [ ] `useInspectionController.js`
- [ ] `CL08_InspectionListView.jsx` — tái sử dụng pattern CL06
- [ ] `InspectionCard.jsx`

### Phase 5 — CL09 (5 modes) + Modals (~ 2 ngày)
- [ ] `CL09_InspectionCreateView.jsx` — dynamic render theo mode
- [ ] `InspectionStepsTable.jsx` — bảng hướng dẫn + kết quả badge
- [ ] `ErrorTrendRow.jsx` — input lỗi + stepper
- [ ] Mode 1: Kiểm tra mẫu lần đầu
- [ ] Mode 2: Kiểm tra lại (+ Xuất kết quả gần nhất)
- [ ] Mode 3: Kiểm tra thông số
- [ ] Mode 4: Kiểm tra quy trình
- [ ] Mode 5: Vấn đáp
- [ ] `ConfirmErrorQtyModal.jsx` — CL09.1
- [ ] `FinishInspectionModal.jsx` — CL09.2 (với "Tạo mã pallet")
- [ ] Image upload (Thêm ảnh kiểm tra)

### Phase 6 — Polish + Test (~ 1 ngày)
- [ ] Responsive trên mobile 375px–430px
- [ ] Loading skeleton states
- [ ] Error handling + retry
- [ ] Toast notifications
- [ ] CSS hoàn thiện (màu brand, font, spacing)
- [ ] Test trên Capacitor Android

---

## 10. CSS CONVENTIONS

```css
/* Prefix tất cả class bằng .pv2- */
.pv2-page          /* wrapper toàn trang */
.pv2-toolbar       /* row toolbar */
.pv2-card          /* ticket card */
.pv2-card-header   /* phần đầu card: code + badge + time */
.pv2-card-body     /* phần thân card */
.pv2-badge         /* badge trạng thái */
.pv2-badge--pending    /* màu warning */
.pv2-badge--delivering /* màu info */
.pv2-badge--done       /* màu success */
.pv2-badge--v1     /* badge version V1 */
.pv2-badge--v2     /* badge version V2 */
.pv2-form          /* form wrapper CL07/CL09 */
.pv2-field         /* form field + label */
.pv2-field-row     /* 2-column field row */
.pv2-input         /* text/number input */
.pv2-textarea      /* textarea */
.pv2-table         /* bảng sản phẩm / hướng dẫn */
.pv2-submit        /* nút submit chính */
.pv2-cancel        /* nút hủy */
.pv2-filter-panel  /* slide-over panel */
.pv2-modal         /* modal overlay */
.pv2-stepper       /* [-][N][+] component */
.pv2-result-badge--pass  /* badge Đạt (xanh) */
.pv2-result-badge--fail  /* badge Không đạt (đỏ) */
```

---

## 11. MÀU SẮC & DESIGN TOKENS

| Token                  | Giá trị     | Dùng cho                    |
|------------------------|-------------|-----------------------------|
| `--pv2-primary`        | `#5c3317`   | Header, submit button       |
| `--pv2-primary-light`  | `#f5ede6`   | Card bg, tab active bg      |
| `--pv2-orange`         | `#e07b39`   | Mã phiếu (LC04, KT04)       |
| `--pv2-pass`           | `#16a34a`   | Badge Đạt                   |
| `--pv2-fail`           | `#dc2626`   | Badge Không đạt             |
| `--pv2-pending`        | `#f97316`   | Tag Chờ xác nhận            |
| `--pv2-border`         | `#e2e8f0`   | Border inputs, cards        |
| `--pv2-text-main`      | `#1e293b`   | Text chính                  |
| `--pv2-text-secondary` | `#6b7280`   | Meta text (ngày, creator)   |

---

## 12. CÂU HỎI CẦN XÁC NHẬN TRƯỚC KHI CODE

1. **API backend**: Endpoints đã có chưa? Hay cần mock 100%?
2. **Phân trang**: Server-side hay client-side?
3. **Upload ảnh**: Dùng Capacitor Camera hay `<input type="file">`?
4. **Pallet**: Logic "Không có mã pallet" → điền tay hay tạo mới?
5. **CL07 — Số lượng**: Tổng SL auto-fill từ pallet hay user nhập?
6. **CL09 Mode 5 — Số câu hỏi**: Cố định 3 hay dynamic từ API?
7. **Permission**: Admin bypass hay cần cấu hình từ backend?
