# Tài liệu Kỹ thuật Backend ERP G7 (Nâng cao)

Tài liệu này bổ sung các thông tin quan trọng về cơ chế vận hành, quy chuẩn phát triển và chi tiết cấu trúc dữ liệu của hệ thống.

---

## 1. Quy trình Xác thực & Phân quyền (Authentication & Authorization)

Hệ thống sử dụng cơ chế **JWT (JSON Web Token)** kết hợp với **RBAC (Role-Based Access Control)**.

### A. Xác thực (Authentication)
1.  **Đăng nhập**: Người dùng gửi `username` và `password` tới endpoint `/api/v1/auth/login`.
2.  **Kiểm tra**: Backend băm mật khẩu (bcrypt) và so sánh với mật khẩu đã lưu trong DB.
3.  **Cấp Token**: Nếu hợp lệ, hệ thống trả về một `access_token` có thời gian hết hạn (mặc định 60 phút).
4.  **Sử dụng**: Client gửi Token này trong Header `Authorization: Bearer <token>` cho các yêu cầu tiếp theo.

### B. Phân quyền (Authorization)
Hệ thống phân quyền dựa trên 3 thực thể chính: **Account -> Role -> Permission**.
- **Account**: Thông tin người dùng, gắn với 1 `Role`.
- **Role**: Nhóm người dùng (ví dụ: Admin, Manager, Staff). Một Role có nhiều `Permissions`.
- **Permission**: Các hành động cụ thể (ví dụ: `create_order`, `view_report`).

> [!NOTE]
> Việc kiểm tra quyền được thực hiện thông qua **Dependencies** trong FastAPI. Ví dụ: `Depends(check_permission("create_order"))`.

---

## 2. Quy ước lập trình (Coding Conventions & Standards)

Để đảm bảo tính nhất quán và dễ bảo trì, dự án tuân thủ các quy chuẩn sau:

### Quy chuẩn chung
- **Ngôn ngữ**: Python 3.9+.
- **Framework**: FastAPI.
- **ORM**: SQLAlchemy (Core) với SQL Server.
- **Validation**: Pydantic (Schemas).

### Cấu trúc đặt tên (Naming)
- **Files/Variables/Functions**: Sử dụng `snake_case` (ví dụ: `get_account_by_username`).
- **Classes (Models/Schemas)**: Sử dụng `PascalCase` (ví dụ: `OrderCreate`, `MasterProduct`).
- **Constants**: Sử dụng `UPPER_CASE` (ví dụ: `SECRET_KEY`).

### Tài liệu hóa (Documentation)
- **Docstrings**: Mọi hàm public trong Controller và Router phải có chú thích bằng **Tiếng Việt**.
- **API Docs**: Tự động sinh ra bởi FastAPI tại `/docs` (Swagger UI).

---

## 3. Từ điển dữ liệu (Data Dictionary)

Dưới đây là các bảng (Tables) cốt lõi của hệ thống:

### Hệ thống Tài khoản & Quyền
| Bảng | Mô tả | Các trường chính |
| :--- | :--- | :--- |
| `accounts` | Thông tin người dùng | `id`, `username`, `full_name`, `hashed_password`, `role_id` |
| `roles` | Vai trò người dùng | `id`, `name`, `description` |
| `permissions` | Quyền hạn chi tiết | `id`, `name`, `codename` (mã quyền) |
| `role_permissions` | Bảng liên kết quyền-vai trò | `role_id`, `permission_id` |

### Quản lý Sản xuất & Kho
| Bảng | Mô tả | Các trường chính |
| :--- | :--- | :--- |
| `master_products` | Danh mục sản phẩm gốc (BOM) | `id`, `product_code`, `name`, `unit` |
| `master_elements` | Linh kiện cấu thành sản phẩm | `id`, `master_product_id`, `component_name`, `quantity` |
| `products` | Thực thể sản phẩm cụ thể | `id`, `product_code`, `status`, `order_id` |
| `categories` | Phân loại sản phẩm | `id`, `name`, `description` |

### Quản lý Đơn hàng & Giao hàng
| Bảng | Mô tả | Các trường chính |
| :--- | :--- | :--- |
| `orders` | Thông tin đơn hàng | `id`, `order_code`, `customer_name`, `total_amount`, `status` |
| `order_items` | Chi tiết sản phẩm trong đơn | `id`, `order_id`, `master_product_id`, `quantity`, `price` |
| `product_plans` | Kế hoạch sản xuất | `id`, `plan_code`, `start_date`, `end_date`, `status` |
| `deliveries` | Lệnh giao hàng | `id`, `delivery_code`, `order_id`, `delivery_date` |
| `delivery_images` | Ảnh bằng chứng giao hàng | `id`, `delivery_id`, `image_url` |

---

> [!TIP]
> Bạn có thể tham khảo chi tiết Column Type (Kiểu dữ liệu) và Constraints (Ràng buộc) trực tiếp trong các file tại `src/app/models/` đã được chú thích tiếng Việt.
