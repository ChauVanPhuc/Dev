# SmartFlow ERP - Quality Reporting & Infographic Generator Tool

Hệ thống công cụ báo cáo quản trị chất lượng độc lập (**Standalone Module**) được xây dựng riêng biệt trong thư mục `Report/`. Module này phục vụ công tác điều hành, giám sát chất lượng hàng ngày và hàng tuần, tái hiện chuẩn xác 100% bố cục Infographic Poster theo bản thiết kế mẫu và hỗ trợ xuất bản đa định dạng: **Ảnh Infographic Siêu nét (Ultra-HD PNG)**, **Bảng tính Excel (.xlsx 6 Sheets chuyên sâu)**, và **Văn bản Word (.docx chuẩn ISO/CAPA)**.

---

## 🌟 Tính Năng Nổi Bật

1. **Kiến Trúc Độc Lập Hoàn Toàn (Standalone)**:
   - Toàn bộ mã nguồn, cấu hình, template, tài nguyên ảnh SVG, Chart.js offline nằm trọn trong `Report/`.
   - Kết nối trực tiếp vào cơ sở dữ liệu SmartFlow MSSQL mà không làm thay đổi hay can thiệp vào logic của FrontEnd hay BackEnd chính.
2. **Hai Chế Độ Phân Tích Thông Minh**:
   - **Báo cáo Tuần (`weekly`)**: So sánh đối chiếu kỳ này với kỳ trước (Week-over-Week), biểu đồ Pareto lỗi, ma trận lỗi theo công đoạn, top lô hàng rủi ro cao, năng suất nhân sự QC.
   - **Báo cáo Ngày (`daily`)**: Theo dõi sát sao diễn biến sản xuất hàng ngày (Day-over-Day) so với ngày trước đó.
3. **Infographic Poster Thiết Kế Chuẩn 1:1**:
   - Khung hình chuẩn 16:9 tỷ lệ vàng.
   - 4 Khối Quadrant bố cục trực quan:
     - **Góc trên bên trái**: Header thương hiệu SmartFlow, Banner tổng sản lượng & biểu đồ xu hướng vận hành.
     - **Góc trên bên phải**: 4 KPI Cards (Tỷ lệ đạt, Tỷ lệ lỗi, Phiếu kiểm tra, Trạng thái), Biểu đồ cột ngang Top 5 Lỗi thường gặp nhất.
     - **Góc dưới bên trái**: Biểu đồ cơ cấu sản lượng theo công đoạn kèm các Warning Callout chỉ rõ nguyên nhân gốc rễ, Bảng Top 5 Lô hàng cần lưu ý đặc biệt.
     - **Góc dưới bên phải**: Biểu đồ Tỷ lệ đạt từng công đoạn (Định Hình, Lắp Ráp, Sơn, Đóng Gói, Final), Team QC Avatars & 3 Thẻ hành động ưu tiên (CAPA).
4. **Xuất Bản Đa Kênh Tự Động**:
   - **Ảnh Poster PNG**: Sử dụng Playwright Chromium Headless kết xuất ảnh độ phân giải siêu nét (Scale 2x, ~700KB, sẵn sàng in ấn khổ lớn hoặc gửi Zalo/Email).
   - **Bảng Tính Excel (.xlsx)**: 6 Sheets chuẩn hóa với công thức, định dạng màu sắc (Pass/Fail) và cấu trúc tự động điều chỉnh độ rộng cột.
   - **Văn Bản Word (.docx)**: Báo cáo kỹ thuật chuẩn ISO với tiêu đề, bảng số liệu, phân tích sự cố và khung ký duyệt 3 cấp (Người lập, TP. Kỹ thuật, Ban Giám đốc).
5. **Đa Phương Thức Vận Hành**:
   - **Web Dashboard Trực Quan** (`app.py`) chạy trên FastAPI + Uvicorn.
   - **Giao Diện Dòng Lệnh CLI Tiện Dụng** (`cli.py`) phục vụ tự động hóa và lập lịch cron job.

---

## 📁 Cấu Trúc Thư Mục

```
Report/
├── app.py                      # FastAPI Web Server & Export API
├── cli.py                      # Command Line Interface (CLI Tool)
├── README.md                   # Hướng dẫn sử dụng chi tiết
├── config/
│   ├── __init__.py
│   └── settings.py             # Cấu hình độc lập (đọc .env, chuỗi kết nối DB, paths)
├── core/
│   ├── __init__.py
│   ├── db.py                   # Quản lý kết nối SQLAlchemy với SQL Server
│   ├── weekly_analyzer.py      # Phân tích số liệu Tuần & đối chiếu WoW
│   └── daily_analyzer.py       # Phân tích số liệu Ngày & đối chiếu DoD
├── exporters/
│   ├── __init__.py
│   ├── image_exporter.py       # Render Infographic và chụp ảnh PNG (Playwright)
│   ├── excel_exporter.py       # Lập bảng tính Excel đa sheet (openpyxl)
│   └── word_exporter.py        # Soạn thảo văn bản Word chuẩn ISO (python-docx)
├── templates/
│   ├── infographic.html        # Khung giao diện HTML Infographic
│   └── assets/
│       ├── css/
│       │   └── infographic.css # Toàn bộ stylesheet bố cục poster
│       ├── js/
│       │   ├── chart.umd.min.js# Chart.js offline độc lập (không cần mạng)
│       │   └── infographic.js  # Script vẽ 4 biểu đồ tương tác
│       └── images/             # Vector SVG assets & QC Avatars
└── output/                     # Thư mục lưu trữ các file xuất ra (.png, .xlsx, .docx)
```

---

## 🚀 Hướng Dẫn Sử Dụng

### Cách 1: Sử dụng Giao Diện Dòng Lệnh (CLI)

Chạy trực tiếp từ thư mục `Report/`:

#### 1. Xuất báo cáo tuần (Mặc định xuất cả 3 định dạng: Ảnh + Excel + Word):
```bash
python cli.py --type weekly --week 42 --export all
```

#### 2. Xuất báo cáo ngày cụ thể:
```bash
python cli.py --type daily --date 2026-10-15 --export all
```

#### 3. Chỉ xuất ảnh Poster Infographic và tự động mở Explorer:
```bash
python cli.py --type weekly --week 42 --export image --open
```

#### 4. Chỉ xem trước số liệu tóm tắt trên màn hình Console (không xuất file):
```bash
python cli.py --type weekly --week 42 --preview
```

#### Bảng tham số dòng lệnh CLI:
| Tham số | Viết tắt | Mặc định | Mô tả |
| :--- | :---: | :---: | :--- |
| `--type` | `-t` | `weekly` | Chế độ báo cáo: `weekly` hoặc `daily` |
| `--week` | `-w` | `42` | Số tuần ISO (1 - 52) |
| `--year` | `-y` | Năm hiện tại | Năm báo cáo |
| `--date` | `-d` | Hôm nay | Ngày phân tích `YYYY-MM-DD` (chế độ daily) |
| `--export` | `-e` | `all` | Định dạng xuất: `all`, `image`, `excel`, `word` |
| `--output-dir` | `-o` | `output/` | Thư mục lưu file đầu ra |
| `--open` | | `False` | Tự động mở thư mục trong Windows Explorer |
| `--preview` | | `False` | Chỉ in tóm tắt KPI trên terminal |

---

### Cách 2: Sử dụng Web Dashboard & API

Khởi động Web Server cục bộ:
```bash
python app.py
```
Server sẽ chạy tại địa chỉ: `http://localhost:8099`

#### Các liên kết truy cập chính:
- **Xem Infographic trực quan trên trình duyệt**:
  - Tuần 42: [http://localhost:8099/?type=weekly&param=42](http://localhost:8099/?type=weekly&param=42)
  - Ngày 15/10: [http://localhost:8099/?type=daily&param=2026-10-15](http://localhost:8099/?type=daily&param=2026-10-15)
- **Tải nhanh file trực tiếp từ URL**:
  - Tải ảnh PNG: `http://localhost:8099/export/image?type=weekly&param=42`
  - Tải Excel (.xlsx): `http://localhost:8099/export/excel?type=weekly&param=42`
  - Tải Word (.docx): `http://localhost:8099/export/word?type=weekly&param=42`
- **Lấy dữ liệu thô JSON**:
  - API: `http://localhost:8099/api/data?type=weekly&param=42`

---

## 📊 Cấu Trúc Các File Báo Cáo Xuất Ra

### 1. Bảng Tính Excel (`.xlsx`) gồm 6 Sheets chuyên sâu:
1. `TongQuan_KPI`: Bảng tóm tắt chỉ số vận hành, so sánh kỳ trước, tỷ lệ tăng trưởng.
2. `CongDoan_LoaiPhieu`: Thống kê chi tiết theo 5 công đoạn và cơ cấu loại phiếu (FQC, PQC, IQC, v.v.).
3. `DoiChieu_Loi_Pareto`: Bảng tỷ lệ lỗi Pareto, số lượng phát sinh kỳ này vs kỳ trước.
4. `MaTran_Loi_CongDoan`: Ma trận 2 chiều giao thoa giữa dạng lỗi và công đoạn phát sinh.
5. `DiemNong_LoHang_QC`: Danh sách Top lô hàng có tỷ lệ phế phẩm cao & đánh giá thanh tra QC.
6. `CAPA_HanhDong`: Kế hoạch hành động khắc phục, phòng ngừa, bộ phận phụ trách và deadline.

### 2. Văn Bản Word (`.docx`) chuẩn ISO/CAPA:
- Header & Footer thương hiệu SmartFlow, mã tài liệu kiểm soát phiên bản.
- Khung tóm lược điều hành (Executive Summary Callout Box).
- Các bảng chỉ tiêu chất lượng trọng yếu, phân tích cơ cấu công đoạn và nguyên nhân lỗi.
- Khung khuyến nghị hành động cải tiến CAPA.
- Bảng ký duyệt 3 cấp phân quyền: **Người lập báo cáo**, **Trưởng phòng QA/QC**, **Ban Giám đốc**.
