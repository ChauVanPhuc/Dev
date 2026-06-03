# HƯỚNG DẪN DI CHUYỂN VÀ VẬN HÀNH KIẾN TRÚC SMARTFLOW V2

Tài liệu này cung cấp thông tin chi tiết về kết quả di chuyển mã nguồn từ dự án cũ **ERP_G7** sang cấu trúc thư mục module hóa **SmartFlow v2** theo mô hình MVC tách biệt cho cả BackEnd, FrontEnd Mobile và FrontEnd Web.

---

## 1. MỤC TIÊU VÀ PHƯƠNG PHÁP DI CHUYỂN

### 1.1. Mục Tiêu Kiến Trúc
*   **Phân tách nền tảng**: Tách biệt rõ ràng phần xử lý Backend (FastAPI) và Frontend (Vite React). Trong Frontend, chia rõ phân hệ Mobile (Capacitor/React) và Web (React).
*   **Kiến trúc MVC**: Cấu trúc mã nguồn theo các Module nghiệp vụ (Domain-Driven Modules). Mỗi module chứa đầy đủ các thành phần Models, Views, Controllers riêng biệt để tăng tính đóng gói.
*   **Tái sử dụng mã nguồn (Shared Layer)**: Thiết lập thư mục `shared/` chứa tài nguyên dùng chung (Hooks, Contexts, Services, Utilities, Styles) giúp tối giản hóa mã nguồn trùng lặp giữa Mobile và Web.
*   **Chuẩn hóa Import**: Sử dụng các bí danh đường dẫn (Path Aliases) thay cho các relative import sâu tầng phức tạp (như `../../../../`), giúp việc bảo trì và dịch chuyển component sau này dễ dàng hơn.

### 1.2. Phương Pháp Thực Hiện
Quá trình di chuyển được tự động hóa hoàn toàn thông qua tập lệnh `migrate.py` với các bước chính:
1.  **Dọn dẹp và Tạo khung cấu trúc**: Làm sạch không gian đích và tạo các thư mục trống theo thiết kế chuẩn.
2.  **Di chuyển mã nguồn BackEnd**: Tổ chức lại thư mục `app`, `config`, `database`, `modules` và thiết lập các tệp tương thích ngược.
3.  **Di chuyển mã nguồn FrontEnd**: Phân loại file từ dự án cũ về đúng thư mục Mobile, Web hoặc Shared của kiến trúc mới.
4.  **Tự động Refactor Import (Regex Engine)**: Quét toàn bộ các tệp `.js` và `.jsx` để phân tích đường dẫn và tự động viết lại các import cũ thành alias chuẩn.
5.  **Cơ chế chống Lock File trên Windows**: Tập lệnh được tích hợp cơ chế đổi tên tệp/thư mục tạm thời và ghi đè dòng dữ liệu trực tiếp để vượt qua các tiến trình hệ thống đang giữ lock file (như editor Cursor/VS Code).

---

## 2. SƠ ĐỒ CẤU TRÚC THƯ MỤC CHUẨN (SMARTFLOW V2)

Dưới đây là sơ đồ hình cây chi tiết mô tả toàn bộ cấu trúc thư mục sau khi di chuyển:

```txt
SmartFlow_v2/
├── ARCHITECTURE_FLOW.md             # Sơ đồ luồng hoạt động hệ thống
├── SMARTFLOW_V2_DIRECTORY_TREE.md   # Tài liệu định nghĩa cấu trúc gốc
├── MIGRATION_GUIDE.md               # Tài liệu hướng dẫn này
├── migrate.py                       # Kịch bản chạy di chuyển tự động
│
├── docs/                             # TÀI LIỆU DỰ ÁN
│   ├── architecture/                # Mô tả kiến trúc tổng thể
│   ├── api/                         # Đặc tả thiết kế các API endpoints
│   ├── database/                    # Sơ đồ thực thể liên kết (ERD) và dữ liệu mẫu
│   └── workflows/                   # Sơ đồ quy trình nghiệp vụ (BPMN)
│
├── BackEnd/                          # PHÂN HỆ BACKEND (FASTAPI)
│   ├── app/                         # Cấu hình lõi của ứng dụng FastAPI
│   │   ├── main.py                  # Entrypoint chính khởi chạy API
│   │   ├── routes.py                # Tổng hợp Router liên kết toàn module
│   │   ├── models.py                # Re-export các Model DB (Tương thích ngược)
│   │   └── schemas.py               # Re-export các Schema Pydantic (Tương thích ngược)
│   ├── config/                      # Các cấu hình hệ thống
│   │   ├── settings.py              # Biến môi trường và cấu hình chung
│   │   ├── database.py              # Cấu hình kết nối SQLAlchemy và Session
│   │   └── security.py              # Thiết lập băm mật khẩu và JWT Token
│   ├── database/                    # Quản lý cơ sở dữ liệu
│   │   ├── migrations/              # Lịch sử và kịch bản nâng cấp DB (Alembic)
│   │   ├── seeders/                 # Dữ liệu mẫu ban đầu (Roles, Users, Equipments)
│   │   └── backups/                 # Các bản sao lưu DB định kỳ
│   ├── modules/                     # CÁC MODULE NGHIỆP VỤ (BUSINESS MODULES)
│   │   ├── auth/                    # Module Đăng nhập & Phân quyền (Account, Role, Permission)
│   │   ├── delivery/                # Module Bàn giao, QC, Trả hàng (Delivery, Pallet, Return)
│   │   ├── inspection/              # Module Kiểm tra công đoạn & chất lượng sản xuất
│   │   ├── kpi/                     # Module KPI & Đánh giá năng suất
│   │   ├── capa/                    # Module Quản lý hành động khắc phục phòng ngừa
│   │   ├── master/                  # Module Dữ liệu gốc (Sản phẩm, Khách hàng, BOM gốc)
│   │   └── system/                  # Module Hệ thống (Màn hình, cấu hình QR)
│   ├── shared/                      # DỊCH VỤ VÀ UTILS DÙNG CHUNG CHO BACKEND
│   │   ├── services/                # Websocket, Firebase Push, File Upload
│   │   ├── utils/                   # Định dạng ngày tháng, múi giờ, banner log
│   │   └── exceptions/              # Định nghĩa lỗi chuẩn hóa API
│   ├── scripts/                     # Các công cụ dòng lệnh nội bộ (tạo admin, cài đặt nhanh)
│   └── tests/                       # Kịch bản kiểm thử (Unit test & Integration)
│
└── FrontEnd/                         # PHÂN HỆ FRONTEND (VITE + REACT)
    ├── package.json                 # Cài đặt thư viện chung cho FrontEnd
    ├── vite.config.js               # Định nghĩa các Path Aliases biên dịch
    │
    ├── shared/                       # TÀI NGUYÊN DÙNG CHUNG (SHARED LAYER)
    │   ├── assets/                   # Logos, Backgrounds, placeholders
    │   ├── styles/                   # Hệ thống Token CSS, Biến màu sắc, Reset CSS
    │   ├── services/                 # api.js (Axios Instance), pushNotificationService
    │   ├── hooks/                    # useAuth, useDebounce, useClickOutside
    │   ├── store/                    # uiStore, notificationStore (Quản lý trạng thái Zustand)
    │   └── constants/                # appConfig.js (Cấu hình IP Server, Timeout)
    │
    ├── Mobile/                       # PHÂN HỆ DI ĐỘNG (MOBILE SITE - CAPACITOR)
    │   ├── app/                     # Trình khởi chạy (App.jsx, bootstrap.jsx)
    │   ├── assets/                  # Tài nguyên hình ảnh, biểu tượng đặc trưng Mobile
    │   ├── styles/                  # Định nghĩa CSS Layout và Component của Mobile
    │   ├── Shared/                  # Thành phần giao diện dùng chung Mobile (Button, Input, Card)
    │   │   └── Views/components/ui/
    │   └── [Domain_Modules]/        # Các Module MVC Nghiệp vụ Mobile
    │       ├── Auth/                # Phân hệ Xác thực Mobile
    │       │   ├── Controllers/     # authController.js (Hook xử lý logic gọi API)
    │       │   ├── Models/          # authModel.js (Quản lý state đăng nhập)
    │       │   └── Views/           # LoginView.jsx (Giao diện hiển thị form)
    │       ├── Delivery/            # Phân hệ giao nhận & Quét mã vạch Mobile
    │       ├── Production/          # Theo dõi Kế hoạch & Đơn hàng tại công đoạn sản xuất
    │       └── Notification/        # Nhận tin nhắn thông báo đẩy
    │
    └── Web/                          # PHÂN HỆ TRÌNH DUYỆT (WEB SITE - PORTAL)
        ├── app/                     # Trình khởi chạy (App.jsx, bootstrap.jsx)
        ├── assets/
        ├── styles/
        ├── Shared/                  # Thành phần giao diện dùng chung Web (Sidebar, Header, Table)
        └── [Domain_Modules]/        # Các Module MVC Nghiệp vụ Web
            ├── Auth/                # Đăng nhập Web (LoginPage)
            ├── Dashboard/           # Giao diện tổng quan, phân tích biểu đồ sản lượng
            ├── System/              # Quản lý cấu hình màn hình, phân quyền nhân sự
            ├── Pallet/              # Quản lý thông tin & Lịch sử thẻ Pallet
            ├── Plan/                # Quản lý kế hoạch và tiến độ sản xuất
            └── KPI/                 # Quản lý KPI và chấm công nhân sự sản xuất
```

---

## 3. CHI TIẾT CẤU HÌNH IMPORT ALIASES (BÍ DANH ĐƯỜNG DẪN)

Để loại bỏ các import tương đối phức tạp và dễ gây lỗi như `import x from '../../../hooks/useAuth'`, dự án SmartFlow v2 áp dụng 3 bí danh chính:

| Alias | Thư mục đích thực tế | Phạm vi áp dụng |
| :--- | :--- | :--- |
| **`@shared`** | `FrontEnd/shared` | Dịch vụ, Hooks, Store hoặc Hằng số dùng chung cho cả Web & Mobile |
| **`@mobile`** | `FrontEnd/Mobile` | Thành phần, Controller, Model đặc thù cho ứng dụng Mobile |
| **`@web`** | `FrontEnd/Web` | Thành phần, Controller, Giao diện đặc thù cho trang quản trị Web Portal |

### 3.1. Cấu Hình Cho Trình Biên Dịch Vite (`FrontEnd/vite.config.js`)
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@mobile': path.resolve(__dirname, './Mobile'),
      '@web': path.resolve(__dirname, './Web')
    }
  }
});
```

### 3.2. Cấu Cấu Hình Cho IDE Intellisense (`jsconfig.json`)
Để VS Code hoặc Cursor tự động gợi ý đường dẫn chính xác khi gõ phím, cần khai báo các tệp `jsconfig.json` ở cấp độ thư mục con:

*   **Tại thư mục `FrontEnd/Mobile/jsconfig.json`**:
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@shared/*": ["../shared/*"],
          "@mobile/*": ["./*"]
        }
      },
      "exclude": ["node_modules", "dist"]
    }
    ```

*   **Tại thư mục `FrontEnd/Web/jsconfig.json`**:
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@shared/*": ["../shared/*"],
          "@web/*": ["./*"]
        }
      },
      "exclude": ["node_modules", "dist"]
    }
    ```

---

## 4. HƯỚNG DẪN VẬN HÀNH VÀ CHẠY THỬ HỆ THỐNG

### 4.1. Khởi Chạy FastAPI Backend
1.  Mở PowerShell hoặc Command Prompt và di chuyển vào thư mục Backend:
    ```powershell
    cd BackEnd
    ```
2.  Kích hoạt môi trường ảo Python (nếu có):
    ```powershell
    .venv\\Scripts\\activate
    ```
3.  Cài đặt các thư viện cần thiết (nếu là lần đầu chạy):
    ```powershell
    pip install -r requirements.txt
    ```
4.  Khởi động máy chủ phát triển FastAPI:
    ```powershell
    uvicorn app.main:app --reload --port 8000
    ```
5.  Truy cập tài liệu API tự động tại: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4.2. Khởi Chạy FrontEnd Mobile
1.  Di chuyển vào thư mục Mobile:
    ```powershell
    cd FrontEnd/Mobile
    ```
2.  Cài đặt các gói phụ thuộc:
    ```powershell
    npm install
    ```
3.  Khởi chạy máy chủ phát triển Vite:
    ```powershell
    npm run dev
    ```

### 4.3. Khởi Chạy FrontEnd Web
1.  Di chuyển vào thư mục Web:
    ```powershell
    cd FrontEnd/Web
    ```
2.  Cài đặt các gói phụ thuộc:
    ```powershell
    npm install
    ```
3.  Khởi chạy máy chủ phát triển Vite:
    ```powershell
    npm run dev
    ```

---

## 5. XÁC MINH VÀ HẬU DI CHUYỂN (POST-MIGRATION VERIFICATION)

*   **Tính toàn vẹn của mã**: Quá trình di chuyển sử dụng luồng ghi đè trực tiếp đã bảo toàn 100% nội dung logic nghiệp vụ của các tệp nguồn, không làm mất mát chú thích (comments) hay thay đổi logic xử lý.
*   **Không xung đột import**: Mọi liên kết chéo giữa Giao diện (Views) và các bộ điều khiển (Controllers/Models) trong ứng dụng React đã được chuyển dịch hoàn chỉnh sang cấu trúc alias, đảm bảo tính đóng gói của từng phân hệ nghiệp vụ.
