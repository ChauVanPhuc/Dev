# HƯỚNG DẪN CÀI ĐẶT ONLYOFFICE DOCUMENT SERVER CHO SMARTFLOW ERP V3

Tài liệu này hướng dẫn cài đặt và kết nối **ONLYOFFICE Document Server** để người dùng có thể **soạn thảo trực tiếp trên file Word (.docx) 100% nguyên bản ngay trong trình duyệt web**:
- Giữ 100% định dạng, khổ giấy ngang/dọc, căn lề, font chữ, bảng biểu phức tạp.
- Lưu tự động trực tiếp đè lên file Word gốc trên máy chủ (kèm sao lưu phiên bản cũ tại thư mục `_versions`).
- Khi xuất file: tải về chính file `.docx` đã sửa đó.

---

## CÁCH 1: CÀI ĐẶT BẰNG DOCKER (KHUYÊN DÙNG - CỰC KỲ ĐƠN GIẢN)

Nếu máy chủ Windows đã có hoặc cài đặt **Docker Desktop**:

### Bước 1: Khởi chạy ONLYOFFICE Document Server
Mở **PowerShell** (hoặc CMD) với quyền Administrator và chạy lệnh duy nhất sau:

```powershell
docker run -i -t -d -p 8080:80 --restart=always -e JWT_ENABLED=false onlyoffice/documentserver
```

*Giải thích thông số:*
- `-p 8080:80`: Chạy Document Server trên cổng `8080` (tránh xung đột với cổng 80 của IIS / Web khác).
- `--restart=always`: Tự động khởi động lại khi máy chủ reboot.
- `-e JWT_ENABLED=false`: Tắt bắt buộc token JWT để kết nối nội bộ nhanh chóng và dễ dàng nhất.

### Bước 2: Kiểm tra Document Server đã chạy
Mở trình duyệt trên máy chủ truy cập:
👉 `http://localhost:8080`

Nếu màn hình hiển thị: **"ONLYOFFICE Docs Community Edition installed"** kèm dấu tích xanh là bạn đã cài đặt thành công!

---

## CÁCH 2: CÀI TRỰC TIẾP TRÊN WINDOWS BẰNG BỘ CÀI .EXE (NẾU KHÔNG DÙNG DOCKER)

1. Tải bộ cài chính thức từ trang chủ ONLYOFFICE:
   🔗 [Tải ONLYOFFICE Docs for Windows](https://download.onlyoffice.com/install/desktop/editors/windows/onlyoffice-documentserver.exe)
2. Nhấp đúp chuột vào file `onlyoffice-documentserver.exe` để tiến hành cài đặt.
3. Bộ cài sẽ tự động phát hiện và cài đặt các thành phần phụ trợ cần thiết (PostgreSQL, Erlang, RabbitMQ).
4. Bạn chỉ cần nhấn **Next** theo mặc định cho đến khi hoàn thành.
5. Sau khi cài xong, kiểm tra trên trình duyệt: `http://localhost` (cổng 80) hoặc cổng bạn đã cấu hình trong lúc cài.

---

## BƯỚC 3: CẤU HÌNH KẾT NỐI VÀO SMARTFLOW BACKEND

Mở file `BackEnd/.env` trong thư mục dự án `P:\APP\SmartFlow\SmartFlow_v2_Test\BackEnd\.env` và cập nhật 3 dòng sau:

```env
# URL Document Server mà TRÌNH DUYỆT của người dùng truy cập được
ONLYOFFICE_URL=http://localhost:8080

# Nếu chạy với JWT_ENABLED=false thì để trống
ONLYOFFICE_JWT_SECRET=

# URL Backend mà Document Server gọi tới để nạp và lưu file (chạy Docker thì dùng host.docker.internal)
ONLYOFFICE_BACKEND_URL=http://host.docker.internal:8000
```

> **Lưu ý quan trọng khi triển khai mạng LAN / Production:**
> - Nếu người dùng truy cập SmartFlow từ các máy tính khác trong công ty qua IP (ví dụ `192.168.1.100`), hãy đổi:
>   - `ONLYOFFICE_URL=http://192.168.1.100:8080`
>   - `ONLYOFFICE_BACKEND_URL=http://192.168.1.100:8000`

---

## BƯỚC 4: KHỞI ĐỘNG LẠI BACKEND SMARTFLOW VÀ TRẢI NGHIỆM

1. Khởi động lại dịch vụ Backend FastAPI.
2. Vào màn hình **Quy trình ISO** -> Tab **Nội dung quy trình**.
3. Khi tải file Word lên:
   - Nút **"Sửa trực tiếp Word (100% Gốc)"** màu xanh dương sẽ xuất hiện.
   - Bấm vào nút này để mở trình soạn thảo ONLYOFFICE toàn màn hình: bạn có thể sửa chữ, căn lề, chèn hình, kẻ bảng, xoay ngang/dọc y hệt Microsoft Word.
   - Khi chỉnh sửa, hệ thống sẽ tự động lưu đè lên file Word gốc trên máy chủ.
   - Muốn tải file: bấm nút **"Tải Word gốc (.docx)"** trên thanh tiêu đề để tải về chính xác file đã sửa đó.
