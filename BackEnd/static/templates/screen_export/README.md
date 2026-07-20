# Screen Export Templates

## Cấu trúc thư mục

```
screen_export/
├── standard/          # Template chuẩn
│   ├── screen_detail.docx
│   ├── screen_detail_base.pdf
│   └── screen_detail.xlsx
├── detailed/          # Template chi tiết
│   ├── screen_detail_full.docx
│   └── screen_detail_full.xlsx
└── minimal/           # Template tối giản
    └── screen_detail_simple.xlsx
```

## Placeholders hỗ trợ

### Thông tin cơ bản
- `{{screen_code}}` - Mã màn hình hiện tại
- `{{default_code}}` - Mã màn hình mặc định
- `{{screen_title}}` - Tên màn hình
- `{{screen_subtitle}}` - Mô tả màn hình
- `{{platform}}` - Nền tảng (Web/Mobile)
- `{{route_path}}` - Đường dẫn route
- `{{status}}` - Trạng thái
- `{{target_date}}` - Ngày hoàn thành dự kiến

### Ảnh mockup
- `{{mockup_image}}` - **Placeholder đặc biệt**: Sẽ được thay thế bằng ảnh mockup thực tế
  - Nếu có `mockup_path` trong context → Nhúng ảnh vào file
  - Nếu không có → Hiển thị "[Không có ảnh mockup]"
  - Nếu file ảnh không tồn tại → Hiển thị "[Không tìm thấy ảnh: ...]"
  - Kích thước mặc định: Width 6 inches (~15cm), height auto

### Thông tin hệ thống
- `{{date}}` - Ngày xuất (dd/mm/yyyy)
- `{{time}}` - Giờ xuất (HH:MM:SS)
- `{{user_name}}` - Người xuất
- `{{system_name}}` - Tên hệ thống

### Danh sách động (cho table)
- `{{components}}` - Danh sách components
  - `{{stt}}` - Số thứ tự
  - `{{name}}` - Tên component
  - `{{type}}` - Loại component
  - `{{description}}` - Mô tả

- `{{guides}}` - Danh sách hướng dẫn
  - `{{stt}}` - Số thứ tự
  - `{{title}}` - Tiêu đề
  - `{{content}}` - Nội dung

- `{{bugs}}` - Danh sách lỗi
  - `{{stt}}` - Số thứ tự
  - `{{description}}` - Mô tả lỗi
  - `{{severity}}` - Mức độ
  - `{{status}}` - Trạng thái
  - `{{reporter}}` - Người báo
  - `{{assignee}}` - Người sửa
  - `{{requested_at}}` - Ngày yêu cầu
  - `{{completed_at}}` - Ngày hoàn thành

### Thống kê
- `{{components_count}}` - Số lượng components
- `{{guides_count}}` - Số lượng hướng dẫn
- `{{bugs_count}}` - Số lượng lỗi

## Hướng dẫn tạo template

### DOCX Template
1. Tạo file Word với layout mong muốn
2. Thêm placeholder `{{tên_trường}}` vào vị trí cần fill
3. Với table động: Tạo 1 row mẫu với placeholder, engine sẽ tự nhân bản
4. Lưu file vào thư mục tương ứng

### Excel Template
1. Tạo file Excel với nhiều sheet
2. Sheet 1: Thông tin tổng quan (key-value)
3. Sheet 2+: Danh sách (table với header row)
4. Thêm placeholder vào cell
5. Lưu file vào thư mục tương ứng

### PDF Template
- PDF chỉ dùng làm base, không khuyến khích vì khó chỉnh sửa
- Nên xuất từ DOCX sang PDF

## Lưu ý
- Template phải tồn tại trước khi API hoạt động
- Tạm thời có thể copy file mẫu từ component_samples
- Cần tạo template thật với design chuyên nghiệp sau
