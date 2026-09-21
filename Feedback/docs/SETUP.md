# Hướng Dẫn Cài Đặt & Khởi Chạy SmartFlow Feedback (Cổng 3001)

Tài liệu này hướng dẫn cài đặt và vận hành phân hệ **SmartFlow Feedback**.

---

## ⚡ 1. Khởi chạy Nhanh Nhất (1-Click)

### Cách 1: Chạy cùng toàn bộ hệ thống
Chạy file tại thư mục gốc:
```cmd
run_project.bat
```
Nhấn phím **`1`** (Start All Systems). Hệ thống sẽ tự động khởi động đồng loạt:
- Backend FastAPI: `http://localhost:8000`
- Web ERP G7: `http://localhost:5173`
- Mobile App: `http://localhost:3000`
- **Feedback Portal: `http://localhost:3001`**

### Cách 2: Chạy riêng biệt phân hệ Feedback
Chạy file tại thư mục gốc:
```cmd
run_feedback.bat
```

---

## 2. Cài đặt thủ công
1. Di chuyển vào thư mục `Feedback/FrontEnd`:
   ```bash
   cd Feedback/FrontEnd
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển (Dev Server):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt truy cập:
   ```
   http://localhost:3001
   ```
