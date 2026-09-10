# Data/database/

Thư mục quản lý các script SQL, cấu trúc bảng và tài liệu liên quan đến cơ sở dữ liệu của dự án.

## Cơ chế lưu trữ Database SQL:
1. **Database Engine**: Microsoft SQL Server local instance (được cấu hình trong `BackEnd/.env` qua chuỗi kết nối SQLAlchemy).
2. **Persistence**: Mọi thao tác thêm mới, chỉnh sửa, xóa hoặc Import từ giao diện ứng dụng đều thực hiện ghi trực tiếp (`db.commit()`) vào cơ sở dữ liệu SQL Server theo thời gian thực (real-time).
3. **Automatic Table Creation**: Khi backend khởi động, SQLAlchemy ORM sẽ tự động kiểm tra và khởi tạo đầy đủ các bảng dữ liệu nếu chưa có.
4. **Backup Snapshot**: Dữ liệu trong SQL Server sẽ được tự động xuất bản chụp JSON snapshot daily lưu tại `Data/backup/DDMMYYYY/`.

## Các bảng chính trong Database SQL:
- `defect_types`: Danh mục mã lỗi G7 (nội bộ).
- `client_defects`: Danh mục mã lỗi Khách hàng (ánh xạ tới mã G7).
- `defect_glossaries`: Bảng chú thích phân loại ký tự viết tắt.
- `customer_claims`: Danh sách các khiếu nại (Claim) của khách hàng.
- `cabinet_prices`: Bảng đơn giá sản xuất & xuất khẩu tủ gỗ.

## Script khởi tạo Database:
- File `setup_tables.sql`: Script DDL chuẩn T-SQL tạo bảng và index cho SQL Server.
