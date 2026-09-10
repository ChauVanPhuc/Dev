# Kiến Trúc Hệ Thống SmartFlow Claim_v2 (Quanly_Claim)

## 1. Tổng quan hệ thống
Hệ thống **SmartFlow Claim_v2** là nền tảng chuyên biệt phục vụ công tác quản lý khiếu nại chất lượng sản phẩm (Claim), bảng giá tủ (Cabinet Prices) và danh mục lỗi QC (Defect Catalog - đối chiếu G7 & Atlas Vanity).

---

## 2. Kiến trúc Backend (FastAPI + SQL Server)

```
BackEnd/
├── app/
│   ├── main.py                     # Entry point khởi tạo FastAPI, lifespan & middleware
│   ├── routes.py                   # Central API Router gom các module
│   ├── models.py                   # Central Models registry
│   │
│   ├── core/                       # Cấu hình & kết nối Database
│   │   ├── config.py               # Pydantic Settings từ .env
│   │   └── database.py             # SQLAlchemy Engine, SessionLocal, Base, get_db
│   │
│   ├── modules/                    # Các module nghiệp vụ độc lập
│   │   ├── claim/                  # Quản lý Khiếu nại khách hàng
│   │   │   ├── models.py           # Model CustomerClaim
│   │   │   ├── schemas.py          # Pydantic schemas cho Claim
│   │   │   ├── service.py          # Claim CRUD logic
│   │   │   ├── import_service.py   # PDF Parsing & Ingestion orchestration
│   │   │   ├── excel_export.py     # Xuất file Excel định dạng báo cáo
│   │   │   └── router.py           # Claim API endpoints (/api/v1/claims/claims*)
│   │   │
│   │   ├── defect/                 # Quản lý Danh mục Lỗi (G7 & Khách hàng)
│   │   │   ├── models.py           # DefectType, ClientDefect, DefectGlossary
│   │   │   ├── schemas.py          # Defect schemas
│   │   │   └── router.py           # Defect API endpoints (/api/v1/inspections/*)
│   │   │
│   │   └── price/                  # Quản lý Đơn giá tủ
│   │       ├── models.py           # Model CabinetPrice
│   │       ├── schemas.py          # Price schemas
│   │       ├── service.py          # Price CRUD logic
│   │       ├── sync_service.py     # Đồng bộ JSON tạm ↔ CSDL MSSQL
│   │       └── router.py           # Price API endpoints (/api/v1/claims/cabinet-prices*)
│   │
│   └── shared/                     # Tiện ích dùng chung
│       ├── pdf_parser.py           # Thuật toán bóc tách PDF (Cơ chế 1 & 2)
│       ├── utils.py                # Chuẩn hóa dữ liệu & chuỗi
│       └── banner.py               # Banner CLI khởi động
│
├── data/                           # Dữ liệu runtime tạm (temp_cabinet_prices.json)
├── migrations/                     # Script migration bảng CSDL
├── scripts/                        # Script tiện ích CLI
├── static/                         # Lưu trữ file tĩnh (PDF gốc, ảnh bóc tách)
├── requirements.txt
└── .env.example
```

---

## 3. Kiến trúc Frontend (React 19 + Vite + Zustand)

```
FrontEnd/
├── src/
│   ├── app/
│   │   ├── App.jsx                 # Routing controller chính
│   │   └── bootstrap.jsx           # Entrypoint khởi tạo React Root
│   │
│   ├── modules/
│   │   ├── claim/                  # Module Khiếu nại
│   │   │   ├── views/
│   │   │   │   ├── ClaimListView.jsx
│   │   │   │   └── ClaimLayout.jsx
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   │   ├── DeleteConfirmationModal.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Pagination.jsx
│   │   │   │   └── Table.jsx
│   │   │   ├── services/
│   │   │   │   └── claim.service.js
│   │   │   ├── utils/
│   │   │   │   └── claimHelpers.js
│   │   │   └── styles/
│   │   │       └── claim.css
│   │   │
│   │   ├── defect/                 # Module Danh mục lỗi
│   │   │   ├── views/
│   │   │   │   └── DefectManagementView.jsx
│   │   │   └── hooks/
│   │   │       └── useDefectManagement.js
│   │   │
│   │   └── price/                  # Module Bảng giá
│   │       ├── views/
│   │       │   └── PriceListView.jsx
│   │       └── hooks/
│   │           └── usePriceList.js
│   │
│   └── shared/                     # Thành phần dùng chung
│       ├── layouts/
│       │   ├── AdminLayout.jsx     # Shell Layout admin (Sidebar + Header + Outlet)
│       │   ├── Header.jsx          # Header bar
│       │   └── Sidebar.jsx         # Menu điều hướng
│       ├── components/
│       │   └── BeautifulModal.jsx  # Modal thông báo phản hồi
│       ├── services/
│       │   └── api.service.js      # Axios HTTP Client
│       ├── context/
│       │   └── ScreenContext.jsx   # Cung cấp ngữ cảnh tiêu đề màn hình
│       ├── store/
│       │   └── uiStore.js          # Zustand store cho trạng thái UI & nền
│       ├── styles/                 # CSS Tokens & Component styles
│       └── assets/                 # Logo, hình ảnh & CSS layout
│
├── index.html
├── package.json
├── vite.config.js
└── jsconfig.json
```

---

## 4. API Endpoints Contract (27 active endpoints)

### 4.1 Claim Endpoints (`/api/v1/claims/claims*`)
- `GET /api/v1/claims/claims`: Danh sách khiếu nại (kèm phân trang, lọc, tìm kiếm).
- `POST /api/v1/claims/claims`: Tạo mới khiếu nại.
- `GET /api/v1/claims/claims/{claim_id}`: Chi tiết khiếu nại.
- `PUT /api/v1/claims/claims/{claim_id}`: Cập nhật khiếu nại.
- `DELETE /api/v1/claims/claims/{claim_id}`: Xóa khiếu nại.
- `PATCH /api/v1/claims/claims/{claim_id}/status`: Cập nhật trạng thái khiếu nại.
- `POST /api/v1/claims/claims/import-pdf`: Bóc tách và nhập khiếu nại từ 1 file PDF.
- `POST /api/v1/claims/claims/import-folder`: Nhập hàng loạt file PDF từ thư mục.
- `POST /api/v1/claims/claims/import-folder-stream`: Nhập hàng loạt PDF qua Server-Sent Events (SSE).
- `POST /api/v1/claims/claims/export-excel`: Xuất dữ liệu khiếu nại ra Excel theo mẫu.
- `GET /api/v1/claims/claim_imports/{sub_path:path}`: Truy xuất file đính kèm.

### 4.2 Cabinet Price Endpoints (`/api/v1/claims/cabinet-prices*`)
- `GET /api/v1/claims/cabinet-prices`: Danh sách đơn giá tủ gỗ.
- `POST /api/v1/claims/cabinet-prices`: Thêm mới đơn giá tủ.
- `GET /api/v1/claims/cabinet-prices/{price_id}`: Xem chi tiết đơn giá tủ.
- `PUT /api/v1/claims/cabinet-prices/{price_id}`: Cập nhật đơn giá tủ.
- `DELETE /api/v1/claims/cabinet-prices/{price_id}`: Xóa đơn giá tủ.
- `POST /api/v1/claims/cabinet-prices/temp`: Lưu tạm và đồng bộ danh sách đơn giá vào CSDL.

### 4.3 Defect Catalog Endpoints (`/api/v1/inspections/*`)
- `GET /api/v1/inspections/defect-types`: Danh mục loại lỗi G7 nội bộ.
- `POST /api/v1/inspections/defect-types`: Thêm mới loại lỗi G7.
- `PUT /api/v1/inspections/defect-types/{defect_id}`: Cập nhật loại lỗi G7.
- `DELETE /api/v1/inspections/defect-types/{defect_id}`: Ngưng hoạt động loại lỗi G7.
- `GET /api/v1/inspections/client-defects`: Danh mục lỗi khách hàng (Atlas).
- `POST /api/v1/inspections/client-defects`: Thêm mới lỗi khách hàng.
- `PUT /api/v1/inspections/client-defects/{defect_id}`: Cập nhật lỗi khách hàng.
- `DELETE /api/v1/inspections/client-defects/{defect_id}`: Ngưng hoạt động lỗi khách hàng.
- `GET /api/v1/inspections/defect-glossary`: Bảng giải nghĩa ký tự viết tắt QC.
- `POST /api/v1/inspections/import-excel-data`: Nhập danh mục lỗi và bảng phân loại từ Excel.

### 4.4 Health Check
- `GET /health`: Kiểm tra trạng thái máy chủ (`{"status": "ok", "app": "Claim_v2"}`).
