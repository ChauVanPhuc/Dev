# 🚀 Hướng Dẫn Sử Dụng: Gemini Web To API & Web Chat UI (Port 8081)

Dự án này giúp biến giao diện Web của **Google Gemini** thành một chuẩn REST API tương thích hoàn toàn với **OpenAI**, **Claude** và **Gemini Native**, kèm theo **Giao diện Chat Web hiện đại** hoạt động trên cổng **`8081`**.

---

## ⚡ 1. Khởi Chạy Nhanh (1-Click)

Bạn chỉ cần nhấp đúp (Double-click) vào file:
👉 **`run.bat`** (hoặc chạy qua PowerShell với `.\run.ps1`)

Hệ thống sẽ:
1. Tự động kiểm tra file cấu hình `.env`.
2. Kiểm tra file chạy `gemini-web-to-api.exe`.
3. Khởi động máy chủ trên cổng **`2211`**.
4. Tự động mở trình duyệt web tới địa chỉ: **`http://localhost:2211`**.

---

## 🔑 2. Cách Lấy Cookie từ Google Gemini (Bắt buộc để Chat)

Để máy chủ có thể trò chuyện với Gemini thay mặt tài khoản của bạn, bạn cần lấy chuỗi Cookie từ trình duyệt theo các bước đơn giản sau:

1. Mở trình duyệt (Chrome, Edge, Brave, Cốc Cốc, v.v.) và đăng nhập vào **[gemini.google.com](https://gemini.google.com)**.
2. Nhấn phím **`F12`** (hoặc nhấp chuột phải trên trang -> chọn **Inspect / Kiểm tra**).
3. Chuyển sang thẻ **Network** (Mạng).
4. Tải lại trang (**F5**) hoặc gửi một tin nhắn ngắn trong Gemini.
5. Trong ô lọc (**Filter**), nhập: `batchexecute`.
6. Nhấp vào request có tên: `batchexecute?rpcids=otAQ7b`.
7. Ở cột bên phải, chọn tab **Headers** -> cuộn xuống mục **Request Headers** -> tìm dòng **`Cookie:`**.
8. **Sao chép (Copy)** toàn bộ chuỗi ký tự phía sau chữ `Cookie:` (chuỗi này bắt đầu chứa `__Secure-1PSID=...` và `__Secure-1PSIDTS=...`).
9. Mở file **`.env`** trong thư mục dự án và dán vào dòng:
   ```env
   GEMINI_COOKIES=dán_toàn_bộ_chuỗi_cookie_vào_đây
   ```
10. *(Tùy chọn)* Nếu đường dẫn trên thanh địa chỉ của bạn có dạng `/u/1/` hoặc `/u/2/` (đang dùng tài khoản phụ), hãy điền số đó vào:
    ```env
    GEMINI_AUTH_USER=1
    ```
11. Lưu file `.env` lại và khởi động lại `run.bat`!

---

## 💬 3. Các Tính Năng Của Giao Diện Web Chat (`http://localhost:2211`)

Giao diện Chat được tích hợp sẵn với đầy đủ tiện ích:
- **Streaming thời gian thực**: Trả lời từng từ xuất hiện mượt mà.
- **Khối suy nghĩ (Thinking Process)**: Hiển thị các bước phân tích, lập luận logic của Gemini (có thể mở rộng / thu gọn).
- **Trình bày Markdown & Code**: Hỗ trợ định dạng bảng, danh sách, khối code có tô màu cú pháp và nút **Copy** 1 chạm.
- **Chọn mô hình (Model Selector)**:
  - `gemini-auto`: Tự động chọn mô hình thông minh nhất (khuyên dùng).
  - `gemini-3.6-flash`: Tốc độ phản hồi cực nhanh.
  - `gemini-3.1-pro`: Dành cho các bài toán phức tạp, suy luận chuyên sâu.
  - `gemini-auto-canvas`: Chuyên dụng cho tạo tài liệu và viết code canvas.
- **Tùy chỉnh Thinking Effort**: Thấp (`low`), Trung bình (`medium`), Cao (`high`).
- **Đính kèm ảnh**: Tải file ảnh hoặc bấm **Ctrl + V** để dán ảnh trực tiếp từ bộ nhớ tạm để Gemini phân tích hình ảnh.

---

## 🔌 4. Sử Dụng API Cho Các Ứng Dụng Khác (OpenAI SDK, Chatbox, Cursor, v.v.)

Bạn có thể kết nối bất kỳ ứng dụng nào hỗ trợ chuẩn OpenAI tới máy chủ này:

- **Base URL**: `http://localhost:2211/openai/v1`
- **API Key**: `not-needed` (hoặc điền bất kỳ chuỗi nào)
- **Model**: `gemini-auto` hoặc `gemini-3.6-flash`

### Ví dụ Python (OpenAI SDK):
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:2211/openai/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="gemini-auto",
    messages=[{"role": "user", "content": "Xin chào Gemini!"}]
)

print(response.choices[0].message.content)
```

### Ví dụ cURL:
```bash
curl -X POST http://localhost:2211/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-auto",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'
```

### Xem Tài Liệu API Tương Tác:
Mở trình duyệt truy cập: **`http://localhost:2211/docs`** (Giao diện Scalar UI tích hợp đầy đủ đặc tả OpenAPI).

