# HƯỚNG DẪN ĐƯA CODE LÊN GITHUB & TỰ ĐỘNG CẬP NHẬT PRODUCTION + DATABASE

Tài liệu này hướng dẫn quy trình chuẩn để đồng bộ mã nguồn từ máy **Dev / Test** lên **GitHub**, kéo về máy chủ **Production (`Product`)**, tự động cập nhật bảng/cột **SQL Server Database**, build lại **Web / Mobile** và khởi chạy lại hệ thống nhanh gọn, không mất dữ liệu.

---

## 1. QUY TRÌNH TRÊN MÁY DEV / TEST (ĐẨY LÊN GITHUB)

### 1.1. Các file cần đảm bảo có trong commit khi thay đổi CSDL
Mỗi khi có thêm bảng mới, thêm cột mới, hoặc thêm cấu hình phân quyền/menu:
1. **Model SQLAlchemy**: `BackEnd/modules/<module>/models/*.py`
2. **Script Migration tự động (Idempotent)**:
   - `BackEnd/database/migrations/create_warehouse_tables.py` (cho phân hệ Kho / ĐVT / Screens / Sidebars)
   - `BackEnd/database/migrations/run_production_v5_migration.py` (file tổng hợp được `run_db_migration.py` gọi trực tiếp)
3. **Tài liệu SQL cho SSMS (nếu cần chạy tay)**: `DATABASE_MIGRATION_V3_TO_V5.md`

> [!NOTE]
> File `.gitignore` đã loại trừ sẵn `BackEnd/.env`, `BackEnd/venv/`, `FrontEnd/node_modules/`, `FrontEnd/Mobile/node_modules/`, `dist/`, `*.log`, `*.apk`. Tuyệt đối không đưa file `.env` (chứa mật khẩu DB Production & `SECRET_KEY`) lên GitHub.

### 1.2. Đẩy code lên GitHub
Mở PowerShell tại thư mục gốc dự án:
```powershell
git status
git add .
git commit -m "feat: mo ta thay doi"
git push origin <ten-nhanh>
```

---

## 2. QUY TRÌNH TRÊN MÁY PRODUCTION (SAU KHI KÉO CODE VỀ)

Thực hiện tuần tự **4 bước** dưới đây mỗi lần cập nhật bản mới về máy `Product`:

### Bước 1: Kiểm tra kết nối `.env` (chỉ cần làm lần đầu hoặc khi đổi Server DB)
Kiểm tra file `BackEnd/.env` đã tồn tại chưa. Nếu máy Production chưa có, sao chép từ file mẫu `BackEnd/.env.example` và điền thông tin SQL Server Production:
```env
DB_SERVER=TEN_SERVER_SQL_HOAC_IP
DB_NAME=TenDatabaseProduction
DB_USER=sa
DB_PASSWORD=MatKhauSQLServer
SECRET_KEY=chuoi_bi_mat_production
```
*(Nếu dùng Windows Authentication, có thể bỏ trống `DB_USER` và `DB_PASSWORD` theo cấu hình trong `BackEnd/config/settings.py`.)*

---

### Bước 2: Kéo code mới & Tự động cập nhật Database (1 lệnh)
Mở PowerShell tại thư mục gốc dự án trên máy Production:

```powershell
# 1. Kéo code mới nhất từ GitHub
git pull origin <ten-nhanh>

# 2. Thiết lập mã hóa UTF-8 cho PowerShell & chạy Script tự động tạo bảng/cột DB
$env:PYTHONIOENCODING="utf-8"
python run_db_migration.py
```
*(Nếu dùng virtualenv riêng của dự án, chạy bằng `BackEnd\venv\Scripts\python.exe run_db_migration.py`.)*

**Script `run_db_migration.py` làm gì?**
- Gọi trực tiếp `BackEnd/database/migrations/run_production_v5_migration.py` (và `create_warehouse_tables.py`).
- Tự động kiểm tra toàn bộ bảng/cột/index theo chuẩn **Idempotent** (`IF NOT EXISTS`):
  - **Tạo mới** các bảng còn thiếu (ví dụ: `units_of_measure`, `warehouses`, `warehouse_materials`, `goods_receipts`, `goods_receipt_items`, `goods_issues`, `goods_issue_items`, `rejected_goods`, `customer_claims`, `cabinet_prices`, `container_shipments`, `defect_categories`, `lpn_ocr_jobs`, ...).
  - **Bổ sung cột & index mới** trên các bảng đang chạy (ví dụ: `factory_id`, `factory_name` cho `goods_issues` và `rejected_goods`; `created_channel`, `confirmed_by`, `confirmed_at`, `images_json`; `is_deleted`, ...).
  - **Seed dữ liệu nền chuẩn** nếu chưa có: 6 Kho chuẩn (`KTP`, `KDG`, `KHH`, `KNLC`, `KVT`, `KSON`), 29 Đơn vị tính chuẩn, danh mục màn hình `system_screens` và menu `system_sidebars` cho Web + Mobile.
  - **An toàn tuyệt đối**: Có `TRANSACTION` + `ROLLBACK` khi lỗi, không bao giờ xóa hoặc ghi đè dữ liệu nghiệp vụ hiện có, có thể chạy lại nhiều lần mà không lỗi.
  - Kết thúc script sẽ in bảng tổng hợp số cột của 17 bảng để kiểm chứng ngay.

> [!TIP]
> **Cách dự phòng (Chạy tay trên SSMS)**: Nếu máy Production không muốn chạy Python migration, mở SQL Server Management Studio (SSMS), chọn đúng Database Production và chạy khối T-SQL trong [DATABASE_MIGRATION_V3_TO_V5.md](DATABASE_MIGRATION_V3_TO_V5.md).

---

### Bước 3: Cập nhật thư viện & Build lại giao diện Web + Mobile

```powershell
# A. Cập nhật thư viện Python (chỉ cần nếu BackEnd/requirements.txt có thay đổi)
cd BackEnd
pip install -r requirements.txt
cd ..

# B. Build lại giao diện Web Admin
cd FrontEnd
npm install
npm run build
cd ..

# C. Build lại giao diện Mobile PWA
cd FrontEnd\Mobile
npm install
npm run build
cd ..\..
```

*(Nếu chỉ sửa Frontend không thêm package mới thì có thể bỏ qua `npm install` và chỉ chạy `npm run build`. Hoặc nếu phát hành luôn cả APK Android, có thể dùng script `ONE_CLICK_PUBLISH.bat` ở thư mục gốc.)*

---

### Bước 4: Khởi động lại Backend Production Server
Tắt cửa sổ CMD/tiến trình `uvicorn` cũ (nếu đang chạy) và chạy lại bằng script Production không reload để đạt hiệu năng cao nhất:
```powershell
.\start_server_prod.bat
```
*(Script này thực thi `uvicorn app.main:app --host 0.0.0.0 --port 8000` ở thư mục `BackEnd/`.)*

---

## 3. HƯỚNG DẪN CHO DEV: CÁCH THÊM BẢNG / CỘT MỚI ĐỂ PRODUCTION TỰ UPDATE

Để mỗi lần `Product` kéo code về chỉ cần chạy **1 lệnh `python run_db_migration.py`** là xong, lập trình viên cần tuân thủ quy tắc 3 bước sau khi sửa DB:

1. **Tạo / cập nhật SQLAlchemy Model** trong `BackEnd/modules/<module>/models/...`.
2. **Thêm DDL Idempotent** vào `BackEnd/database/migrations/run_production_v5_migration.py` (hoặc file con được import vào `DDL_STATEMENTS`, như `create_warehouse_tables.py`):
   - **Tạo bảng mới**: luôn bọc trong `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ten_bang') BEGIN CREATE TABLE ... END`
   - **Thêm cột mới**: luôn bọc trong `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ten_bang') AND name = 'ten_cot') BEGIN ALTER TABLE ... ADD ... END`
   - **Thêm Index**: luôn bọc trong `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_...' AND object_id = OBJECT_ID('ten_bang')) CREATE INDEX ...`
   - **Seed dữ liệu nền**: luôn kiểm tra `WHERE NOT EXISTS (...)` trước khi `INSERT`.
3. **Đồng bộ `DATABASE_MIGRATION_V3_TO_V5.md`** để bản T-SQL thủ công luôn khớp với script Python.

---

## 4. KIỂM TRA NHANH SAU KHI UPDATE & XỬ LÝ LỖI THƯỜNG GẶP

### Checklist kiểm tra sau khi triển khai Production
- [ ] `python run_db_migration.py` báo `[THÀNH CÔNG] Đã hoàn thành 22/22 hạng mục cập nhật!`.
- [ ] Mở trình duyệt kiểm tra API danh mục Kho: `http://<SERVER>:8000/api/v1/warehouses/mobile-meta` trả HTTP `200` (đủ `warehouses`, `factories`, `units`).
- [ ] Trên Web Admin kiểm tra `/admin/warehouse/goods-receipt`, `/admin/warehouse/goods-issue`, `/admin/warehouse/management`, `/admin/warehouse/rejected-goods` tải bảng & KPI bình thường.
- [ ] Trên Mobile PWA kiểm tra `/warehouse/goods-receipt`, `/warehouse/handover/new`, `/warehouse/returns/new` hoạt động bình thường. *(Nhắc người dùng bấm **Ctrl+Shift+R** hoặc tải lại trang để xóa cache JS cũ sau khi build mới).*

### Lỗi thường gặp
| Lỗi gặp phải | Nguyên nhân | Cách khắc phục nhanh |
| :--- | :--- | :--- |
| `Invalid column name '...'` hoặc `Invalid object name '...'` | Kéo code mới nhưng chưa chạy migration DB | Chạy `$env:PYTHONIOENCODING="utf-8"; python run_db_migration.py` rồi khởi động lại server |
| `UnicodeEncodeError: 'charmap' codec can't encode...` | PowerShell mặc định không dùng UTF-8 | Chạy `$env:PYTHONIOENCODING="utf-8"` trước khi chạy lệnh Python |
| Web/Mobile vẫn báo lỗi giao diện cũ sau khi deploy | Trình duyệt hoặc Service Worker cache bản `dist/` cũ | Đảm bảo đã chạy `npm run build` ở cả `FrontEnd` & `FrontEnd\Mobile`, rồi Hard Refresh (`Ctrl + F5`) |
| Không kết nối được SQL Server khi chạy migration | Thiếu `BackEnd/.env` hoặc chưa cài **ODBC Driver 17 for SQL Server** | Kiểm tra `BackEnd/.env` và cài đặt ODBC Driver 17 |

