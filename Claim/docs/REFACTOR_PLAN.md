# Kế hoạch Tái cấu trúc Toàn bộ Dự án Claim_v2

## Mục tiêu
Đưa dự án `Quanly_Claim` về cấu trúc đơn giản, rõ ràng, dễ bảo trì. Không thay đổi nghiệp vụ, UI hay API contract.

---

## A. Audit kết quả – File dài cần xử lý

| File | Lines | Responsibilities | Quyết định |
|---|---:|---|---|
| `import_controller.py` | 994 | PDF import orchestration, PDF storage, defect mapping, credit note parse, Excel export, temp cabinet price I/O, temp claim I/O, batch listing | **SPLIT** thành 3 file theo responsibility |
| `pdf_parser_service.py` | 1163 | PDF parsing mechanism 1 & 2, row grouping, penalty calc, Excel save | **KEEP** (đã chuyên biệt cho PDF parsing) |
| `claim_routes.py` | 362 | Claim CRUD endpoints + cabinet price endpoints + static file serving | **SPLIT** thành 2 router: claim + price |
| `inspection_routes.py` | 247 | Defect types CRUD + Client defects CRUD + Glossary + Excel import | **MOVE** (đổi tên module inspection → defect) |
| `ClaimListView.jsx` | 6784 | Toàn bộ Claim UI + 30+ handlers + filter + modals + rendering | **SPLIT** thành view + controller hook + sub-components |
| `PriceListView.jsx` | 2092 | Cabinet price UI + handlers + modals | **SPLIT** thành view + controller hook |
| `DefectManagementView.jsx` | 1844 | Defect management UI + tabs + import + handlers | **SPLIT** thành view + controller hook |
| `PortalLayout.jsx` (Shared) | 2697 | Admin header + notification + sidebar trigger + screen detection | **SPLIT** thành layout + header component |
| `Sidebar.jsx` | 412 | Menu sidebar | **MOVE** (giữ nguyên size, chỉ move) |
| `api.service.js` | 138 | Axios instance + preview mock interceptors | **MOVE + CLEAN** (remove mock data) |

---

## B. File Migration Map – Backend

| Current File | New File | Action | Reason |
|---|---|---|---|
| `BackEnd/app/main.py` | `BackEnd/app/main.py` | **KEEP** | Entry point, giữ nguyên |
| `BackEnd/app/routes.py` | `BackEnd/app/routes.py` | **MODIFY** | Cập nhật import paths |
| `BackEnd/app/models.py` | `BackEnd/app/models.py` | **MODIFY** | Cập nhật import paths |
| `BackEnd/config/database.py` | `BackEnd/app/core/database.py` | **MOVE** | Gom vào core |
| `BackEnd/config/settings.py` | `BackEnd/app/core/config.py` | **MOVE** | Gom vào core |
| `BackEnd/modules/claim/models/claim_models.py` | `BackEnd/app/modules/claim/models.py` | **MOVE** | Chỉ chứa CustomerClaim |
| `BackEnd/modules/claim/schemas/claim_schemas.py` | `BackEnd/app/modules/claim/schemas.py` | **MOVE** | Chỉ chứa Claim schemas |
| `BackEnd/modules/claim/controllers/claim_controller.py` | `BackEnd/app/modules/claim/service.py` | **MOVE+RENAME** | Thực chất là DB CRUD service |
| `BackEnd/modules/claim/controllers/import_controller.py` | **SPLIT** thành 3 file | **SPLIT** | Xem chi tiết bên dưới |
| `BackEnd/modules/claim/routes/claim_routes.py` | `BackEnd/app/modules/claim/router.py` | **MOVE+TRIM** | Chỉ giữ Claim endpoints |
| — (tách từ claim_routes.py) | `BackEnd/app/modules/price/router.py` | **SPLIT** | Cabinet Price endpoints |
| `BackEnd/modules/claim/models/claim_models.py` (CabinetPrice) | `BackEnd/app/modules/price/models.py` | **SPLIT** | Tách CabinetPrice ra module riêng |
| — (tách từ claim_schemas.py) | `BackEnd/app/modules/price/schemas.py` | **SPLIT** | Tách CabinetPrice schemas |
| — (tách từ claim_controller.py) | `BackEnd/app/modules/price/service.py` | **SPLIT** | Tách CabinetPrice CRUD |
| `BackEnd/modules/inspection/models/defect_type.py` | `BackEnd/app/modules/defect/models.py` | **MOVE** | Đổi tên module |
| `BackEnd/modules/inspection/schemas/defect_type.py` | `BackEnd/app/modules/defect/schemas.py` | **MOVE** | Đổi tên module |
| `BackEnd/modules/inspection/routes/inspection_routes.py` | `BackEnd/app/modules/defect/router.py` | **MOVE** | Đổi tên module |
| `BackEnd/shared/services/pdf_parser_service.py` | `BackEnd/app/shared/pdf_parser.py` | **MOVE** | Gom vào app/shared |
| `BackEnd/shared/utils/banner.py` | `BackEnd/app/shared/banner.py` | **MOVE** | Gom vào app/shared |
| `BackEnd/shared/utils/claim_utils.py` | `BackEnd/app/shared/utils.py` | **MERGE** | Gom utilities nhỏ |
| `BackEnd/shared/utils/string_cleaner.py` | `BackEnd/app/shared/utils.py` | **MERGE** | Gom utilities nhỏ |
| `BackEnd/database/migrations/create_claim_tables.py` | `BackEnd/migrations/create_claim_tables.py` | **MOVE** | Đưa lên cấp trực tiếp |
| `BackEnd/scripts/import_defects.py` | `BackEnd/scripts/import_defects.py` | **KEEP** | CLI script, giữ nguyên vị trí |
| `BackEnd/modules/price_imports/temp_cabinet_prices.json` | `BackEnd/data/temp_cabinet_prices.json` | **MOVE** | Runtime data, dùng folder data rõ ràng |

### Chi tiết SPLIT `import_controller.py` (994 lines → 3 files)

| Responsibility | Functions | New File |
|---|---|---|
| **Claim import orchestration** | `process_pdf_import`, `process_folder_import`, `process_folder_import_streaming`, `save_pdf_to_static_storage`, `get_existing_claims_keys`, `generate_unique_claim_code`, `validate_import_files`, `resolve_company_error_codes`, `resolve_company_error_names`, `load_temp_claims` | `BackEnd/app/modules/claim/import_service.py` |
| **Excel export** | `export_claims_to_excel` | `BackEnd/app/modules/claim/excel_export.py` |
| **Price I/O & misc** | `save_temp_cabinet_prices`, `load_temp_cabinet_prices`, `get_cabinet_prices_map`, `sync_temp_cabinet_prices_to_db` | `BackEnd/app/modules/price/sync_service.py` |
| **Dead functions** | `get_imported_pdfs_list`, `delete_imported_pdf`, `list_import_batches`, `parse_credit_note_pdf_content`, `save_temp_defect_catalog`, `load_temp_defect_catalog` | **REMOVE** (verified 0 callers in cleanup) |

---

## C. File Migration Map – Frontend

| Current File | New File | Action | Reason |
|---|---|---|---|
| `FrontEnd/index.html` | `FrontEnd/index.html` | **MODIFY** | Cập nhật path `src/app/bootstrap.jsx` |
| `FrontEnd/vite.config.js` | `FrontEnd/vite.config.js` | **MODIFY** | Cập nhật aliases sang `src/` |
| `FrontEnd/jsconfig.json` | `FrontEnd/jsconfig.json` | **MODIFY** | Cập nhật paths sang `src/`, xóa legacy modules |
| `FrontEnd/Web/Shared/app/bootstrap.jsx` | `FrontEnd/src/app/bootstrap.jsx` | **MOVE** |  |
| `FrontEnd/Web/Shared/app/App.jsx` | `FrontEnd/src/app/App.jsx` | **MOVE** |  |
| `FrontEnd/Web/Shared/Services/api.service.js` | `FrontEnd/src/shared/services/api.service.js` | **MOVE + CLEAN** | Xóa preview mock interceptors |
| `FrontEnd/Web/Shared/Views/components/layout/PortalLayout.jsx` | **SPLIT** | **SPLIT** | Xem chi tiết bên dưới |
| `FrontEnd/Web/Shared/Views/components/layout/Sidebar.jsx` | `FrontEnd/src/shared/layouts/Sidebar.jsx` | **MOVE** |  |
| `FrontEnd/Web/Shared/Views/components/feedback/BeautifulModal.jsx` | `FrontEnd/src/shared/components/BeautifulModal.jsx` | **MOVE** |  |
| `FrontEnd/Web/Shared/styles/*.css` | `FrontEnd/src/shared/styles/*.css` | **MOVE** | 4 CSS files |
| `FrontEnd/Web/Shared/assets/*` | `FrontEnd/src/shared/assets/*` | **MOVE** | Logos, backgrounds, sidebar.css, style.css |
| `FrontEnd/shared/context/ScreenContext.jsx` | `FrontEnd/src/shared/context/ScreenContext.jsx` | **MOVE** |  |
| `FrontEnd/shared/store/uiStore.js` | `FrontEnd/src/shared/store/uiStore.js` | **MOVE** |  |
| `FrontEnd/Web/modules/Claim/services/claim.service.js` | `FrontEnd/src/modules/claim/services/claim.service.js` | **MOVE** |  |
| `FrontEnd/Web/modules/Claim/components/*.jsx` | `FrontEnd/src/modules/claim/components/*.jsx` | **MOVE** | 4 component files |
| `FrontEnd/Web/modules/Claim/styles/claim.css` | `FrontEnd/src/modules/claim/styles/claim.css` | **MOVE** |  |
| `FrontEnd/Web/modules/Claim/utils/claimHelpers.js` | `FrontEnd/src/modules/claim/utils/claimHelpers.js` | **MOVE** |  |
| `FrontEnd/Web/modules/Claim/views/ClaimListView.jsx` | **SPLIT** | **SPLIT** | Xem chi tiết bên dưới |
| `FrontEnd/Web/modules/Claim/views/PortalLayout.jsx` | `FrontEnd/src/modules/claim/views/ClaimLayout.jsx` | **MOVE+RENAME** | Tên rõ ràng hơn |
| `FrontEnd/Web/modules/Claim/views/PriceListView.jsx` | **SPLIT** | **SPLIT** | Xem chi tiết bên dưới |
| `FrontEnd/Web/modules/Inspection/Views/DefectManagementView.jsx` | **SPLIT** | **SPLIT** | Xem chi tiết bên dưới |

### Chi tiết SPLIT PortalLayout.jsx (2697 lines)

| Responsibility | New File |
|---|---|
| Main admin layout shell (sidebar trigger, outlet, screen detection) | `FrontEnd/src/shared/layouts/AdminLayout.jsx` |
| Header bar (title, subtitle, breadcrumb, notification bell) | `FrontEnd/src/shared/layouts/Header.jsx` |

### Chi tiết SPLIT ClaimListView.jsx (6784 lines)

| Responsibility | New File |
|---|---|
| Controller hook (all state, handlers, filters, pagination, API calls) | `FrontEnd/src/modules/claim/hooks/useClaimList.js` |
| Main view (JSX composition only) | `FrontEnd/src/modules/claim/views/ClaimListView.jsx` |
| Import modal/wizard UI | `FrontEnd/src/modules/claim/components/ClaimImportModal.jsx` |
| Claim detail/edit modal | `FrontEnd/src/modules/claim/components/ClaimDetailModal.jsx` |
| Filter panel | `FrontEnd/src/modules/claim/components/ClaimFilterPanel.jsx` |

### Chi tiết SPLIT PriceListView.jsx (2092 lines)

| Responsibility | New File |
|---|---|
| Controller hook | `FrontEnd/src/modules/price/hooks/usePriceList.js` |
| Main view | `FrontEnd/src/modules/price/views/PriceListView.jsx` |

### Chi tiết SPLIT DefectManagementView.jsx (1844 lines)

| Responsibility | New File |
|---|---|
| Controller hook | `FrontEnd/src/modules/defect/hooks/useDefectManagement.js` |
| Main view | `FrontEnd/src/modules/defect/views/DefectManagementView.jsx` |

---

## D. Files & Directories to REMOVE

### Root
| File | Reason |
|---|---|
| `migrate.py` (1346 lines) | Legacy migration script từ hệ thống cũ, zero runtime caller |
| `PUBLISH.sh` | Legacy publish script cho hệ thống cũ |
| `run_project.bat` | Legacy run script, sẽ được thay bằng SETUP.md hướng dẫn |
| `CHANGELOG.md` | Legacy changelog, không còn liên quan |
| `MIGRATION_GUIDE.md` | Hướng dẫn migrate từ V1, không còn cần |
| `CLAIM_V2_PROJECT_OVERVIEW.md` | Sẽ được merge vào `docs/ARCHITECTURE.md` |
| `SETUP_GUIDE.md` | Sẽ được merge vào `docs/SETUP.md` |
| `README.md` (root) | Sẽ được viết lại ngắn gọn |

### BackEnd
| File/Dir | Reason |
|---|---|
| `BackEnd/DEVELOPER_ADVANCED_DOCS.md` | Merge vào docs/ |
| `BackEnd/DEVELOPER_BACKEND.md` | Merge vào docs/ |
| `BackEnd/README.md` | Merge vào docs/ |
| `BackEnd/config/` (entire dir) | Moved to `app/core/` |
| `BackEnd/modules/` (entire old dir) | Moved to `app/modules/` |
| `BackEnd/shared/` (entire old dir) | Moved to `app/shared/` |
| `BackEnd/database/` (entire old dir) | Moved to `BackEnd/migrations/` |
| `BackEnd/database/seeders/` | Empty dir |
| `BackEnd/modules/defect_imports/` | Empty dir |
| `BackEnd/modules/inspection/services/` | Empty dir |
| `BackEnd/modules/claim_imports/excel/` | Empty dir |
| `BackEnd/modules/claim_imports/json/` | Empty dir |
| `BackEnd/static/apps/` | Legacy APK dir |
| `BackEnd/static/uploads/inspections/` | Empty legacy dir |
| `BackEnd/static/uploads/qc_test/` | Empty legacy dir |
| `BackEnd/static/uploads/returns/` | Empty legacy dir |
| `BackEnd/uploads/` | Empty legacy dir |
| `BackEnd/modules/claim/controllers/__init__.py` | Old package init |
| `BackEnd/modules/claim/models/__init__.py` | Old package init |
| `BackEnd/modules/claim/routes/__init__.py` | Old package init |
| `BackEnd/modules/claim/schemas/__init__.py` | Old package init |
| All `__pycache__/` | Build cache |

### FrontEnd
| File/Dir | Reason |
|---|---|
| `FrontEnd/Web/` (entire old dir) | Moved to `FrontEnd/src/` |
| `FrontEnd/shared/` (entire old dir) | Moved to `FrontEnd/src/shared/` |
| `FrontEnd/shared/constants/` | Empty dir |
| `FrontEnd/shared/hooks/` | Empty dir |
| `FrontEnd/shared/services/` | Empty dir |
| `FrontEnd/Web/Shared/assets/react.svg` | Unused Vite default |
| `FrontEnd/Web/Shared/assets/vite.svg` | Unused Vite default |

---

## E. Cấu trúc Mục tiêu Cuối cùng

### Root
```
Quanly_Claim/
├── BackEnd/
├── FrontEnd/
├── Data/                    # Placeholder cho kiến trúc dữ liệu sau này (chỉ chứa README.md)
├── docs/
│   ├── ARCHITECTURE.md
│   └── SETUP.md
├── README.md                # Ngắn gọn: mô tả, stack, quick start
└── .gitignore
```

### BackEnd
```
BackEnd/
├── app/
│   ├── main.py
│   ├── routes.py
│   ├── models.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   │
│   ├── modules/
│   │   ├── claim/
│   │   │   ├── models.py          # CustomerClaim model
│   │   │   ├── schemas.py         # Claim Pydantic schemas
│   │   │   ├── service.py         # Claim CRUD (từ claim_controller)
│   │   │   ├── import_service.py  # PDF import orchestration
│   │   │   ├── excel_export.py    # Excel export builder
│   │   │   └── router.py          # Claim API endpoints
│   │   │
│   │   ├── defect/
│   │   │   ├── models.py          # DefectType, ClientDefect, DefectGlossary
│   │   │   ├── schemas.py         # Defect Pydantic schemas
│   │   │   └── router.py          # Defect API endpoints (CRUD + import)
│   │   │
│   │   └── price/
│   │       ├── models.py          # CabinetPrice model
│   │       ├── schemas.py         # Price Pydantic schemas
│   │       ├── service.py         # Price CRUD
│   │       ├── sync_service.py    # Temp JSON ↔ DB sync
│   │       └── router.py          # Price API endpoints
│   │
│   └── shared/
│       ├── pdf_parser.py          # PDF parsing (mechanism 1 & 2)
│       ├── utils.py               # claim_utils + string_cleaner merged
│       └── banner.py              # Startup banner
│
├── data/
│   └── temp_cabinet_prices.json   # Runtime JSON cho price sync
│
├── migrations/
│   └── create_claim_tables.py
│
├── scripts/
│   └── import_defects.py
│
├── static/                        # Không thay đổi, runtime data nghiệp vụ
│   ├── claim_PDF/
│   └── uploads/
│       └── claim_imports/
│           ├── images/
│           └── pdfs/
│
├── requirements.txt
└── .env.example
```

### FrontEnd
```
FrontEnd/
├── src/
│   ├── app/
│   │   ├── App.jsx
│   │   └── bootstrap.jsx
│   │
│   ├── modules/
│   │   ├── claim/
│   │   │   ├── views/
│   │   │   │   ├── ClaimListView.jsx
│   │   │   │   └── ClaimLayout.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useClaimList.js
│   │   │   ├── components/
│   │   │   │   ├── ClaimImportModal.jsx
│   │   │   │   ├── ClaimDetailModal.jsx
│   │   │   │   ├── ClaimFilterPanel.jsx
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
│   │   ├── defect/
│   │   │   ├── views/
│   │   │   │   └── DefectManagementView.jsx
│   │   │   └── hooks/
│   │   │       └── useDefectManagement.js
│   │   │
│   │   └── price/
│   │       ├── views/
│   │       │   └── PriceListView.jsx
│   │       └── hooks/
│   │           └── usePriceList.js
│   │
│   └── shared/
│       ├── layouts/
│       │   ├── AdminLayout.jsx
│       │   ├── Header.jsx
│       │   └── Sidebar.jsx
│       ├── components/
│       │   └── BeautifulModal.jsx
│       ├── services/
│       │   └── api.service.js
│       ├── context/
│       │   └── ScreenContext.jsx
│       ├── store/
│       │   └── uiStore.js
│       ├── styles/
│       │   ├── index.css
│       │   ├── style.css
│       │   ├── components.css
│       │   └── web.css
│       └── assets/
│           ├── Logo remove bg.png
│           ├── LogoCty.png
│           ├── logo full.png
│           ├── hero.png
│           ├── Background 1.png
│           ├── background 2.png
│           ├── Logo bg trắng.png
│           ├── sidebar.css
│           └── style.css
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── jsconfig.json
└── eslint.config.js
```

---

## F. API Contract – Không thay đổi

Tất cả 27 active endpoints giữ nguyên URL runtime:

| Prefix | Endpoints |
|---|---|
| `/api/v1/claims/claims*` | 11 endpoints (CRUD + import + export + status + static) |
| `/api/v1/claims/cabinet-prices*` | 6 endpoints (CRUD + temp sync) |
| `/api/v1/inspections/*` | 10 endpoints (defect-types + client-defects + glossary + import) |
| `/health` | 1 endpoint |

> [!IMPORTANT]
> API URL paths KHÔNG thay đổi. `inspection` vẫn map tới `/api/v1/inspections/*` trong `routes.py` dù module nội bộ đổi tên thành `defect`.

---

## G. Thứ tự thực hiện

1. **Verify baseline** – Backend startup, Frontend build, 3 routes render
2. **Backend restructure** – Tạo `app/core/`, `app/modules/`, `app/shared/`, move + split files, fix imports
3. **Backend verify** – Startup + API test
4. **Frontend restructure** – Tạo `src/`, move files, split views, fix imports + aliases
5. **Frontend verify** – Build + dev server + 3 routes
6. **Cleanup** – Remove old dirs, empty dirs, legacy files, root docs
7. **Documentation** – Write new README.md, docs/ARCHITECTURE.md, docs/SETUP.md
8. **Final verification** – Full functional test

---

## H. Open Questions

> [!IMPORTANT]
> **Về việc split ClaimListView.jsx (6784 lines)**:
> File này cực kỳ lớn. Việc tách controller hook (`useClaimList`) ra khỏi JSX view là rõ ràng và an toàn. Tuy nhiên, việc tách thêm 3 sub-components (ImportModal, DetailModal, FilterPanel) từ JSX đòi hỏi hiểu rõ cấu trúc JSX bên trong. Đề xuất:
> - **Giai đoạn 1**: Tách `useClaimList` hook + giữ view nguyên khối
> - **Giai đoạn 2** (nếu cần): Tách sub-components sau khi view đã ổn định
>
> Cách tiếp cận này giảm rủi ro gãy UI. Bạn có đồng ý không?

> [!IMPORTANT]
> **Về `BackEnd/static/claim_PDF/`**:
> Thư mục này chứa 13 file PDF gốc (tổng ~120MB). Đây là dữ liệu mẫu/gốc, không phải output của import. Backend code không đọc trực tiếp thư mục này. Đề xuất **KEEP** tại vị trí hiện tại vì không ảnh hưởng kiến trúc và là tài liệu tham khảo nghiệp vụ.

> [!IMPORTANT]
> **Về `BackEnd/modules/claim_imports/uploads/`**:
> Chứa 96 file runtime (JSON output từ PDF import). Backend `import_controller.py` dùng `CLAIM_IMPORTS_DIR` trỏ tới đây. Cần giữ nguyên path hoặc cập nhật biến `CLAIM_IMPORTS_DIR` trong `import_service.py` mới.
