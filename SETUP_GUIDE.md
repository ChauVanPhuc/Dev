# 🚀 Hướng dẫn Thiết lập và Chạy Dự án SmartFlow v2

Tài liệu này hướng dẫn bạn từng bước để cài đặt môi trường và khởi chạy toàn bộ hệ thống SmartFlow v2 (bao gồm Backend, Frontend Web và Mobile) trên máy tính mới.

---

## 📋 Mục lục (Table of Contents)

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống-prerequisites)
2. [Cài đặt phần mềm](#-cài-ặt-phần-mềm-software-installation)
3. [Cấu hình SQL Server](#-cấu-hình-sql-server-sql-server-configuration)
4. [Thiết lập Backend](#-thiết-lập-backend-python--fastapi)
5. [Thiết lập Frontend Web](#-thiết-lập-frontend-web-admin)
6. [Thiết lập Mobile App](#-thiết-lập-mobile-app)
7. [Chạy toàn bộ hệ thống](#-chạy-toàn-bộ-hệ-thống)
8. [Kiểm tra kết nối](#-kiểm-tra-kết-nối-verification)
9. [Giải quyết sự cố](#-giải-quyết-sự-cố-troubleshooting)
10. [Checklist cài đặt](#-checklist-cài-ặt-setup-checklist)

---

## 💻 Yêu cầu hệ thống (Prerequisites)

### 1. Hệ điều hành (Operating System)
- **Windows 10/11** (Recommended)
- **Linux** (Ubuntu 20.04+)
- **macOS** (10.15+)

### 2. Phần cứng (Hardware Requirements)
| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|----------|-------------|
| CPU | Dual-core 2.0 GHz | Quad-core 3.0 GHz+ |
| RAM | 8 GB | 16 GB+ |
| Disk Space | 20 GB | 50 GB+ SSD |
| Network | 100 Mbps | 1 Gbps |

### 3. Phần mềm (Software Requirements)

| Phần mềm | Phiên bản tối thiểu | Phiên bản khuyến nghị | Mô tả |
|----------|-------------------|----------------------|-------|
| **Python** | 3.10+ | 3.13+ | Backend API |
| **Node.js** | 18.0+ | 20.0+ LTS | Frontend & Mobile |
| **SQL Server** | 2019+ | 2022+ | Database |
| **Git** | 2.30+ | Latest | Version control |
| **VS Code** | Latest | Latest | IDE (khuyến nghị) |

---

## 📦 Cài đặt phần mềm (Software Installation)

### 1. Cài đặt Python

**Windows:**
1. Tải Python 3.13 từ [python.org](https://www.python.org/downloads/)
2. Chạy installer và **QUAN TRỌNG**: Check vào "Add Python to PATH"
3. Xác nhận cài đặt:
   ```powershell
   python --version
   pip --version
   ```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install python3.13 python3-pip python3-venv
```

**macOS:**
```bash
brew install python@3.13
```

### 2. Cài đặt Node.js

**Windows:**
1. Tải Node.js 20 LTS từ [nodejs.org](https://nodejs.org/)
2. Chạy installer (nên chọn "Add to PATH")
3. Xác nhận cài đặt:
   ```powershell
   node --version
   npm --version
   ```

**Linux (Ubuntu):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

### 3. Cài đặt SQL Server

**Windows - SQL Server Express (Free):**
1. Tải từ [Microsoft](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Chọn "Express" edition
3. Trong quá trình cài đặt:
   - Chọn "Custom" installation
   - Đặt instance name: `SQLEXPRESS` (hoặc tên bạn muốn)
   - Chọn "Mixed Mode" authentication
   - Đặt password cho `sa` user (nhớ lại!)
   - Enable TCP/IP trong SQL Server Configuration Manager

**Linux - Docker (Recommended):**
```bash
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=YourStrong@Password' \
  -p 1433:1433 --name sqlserver \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### 4. Cài đặt ODBC Driver (BẮT BUỘC)

**Windows:**
1. Tải [ODBC Driver 17 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
2. Chạy installer (x64 version)
3. Xác nhận cài đặt:
   ```powershell
   odbcinst -q -d
   ```

**Linux:**
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt update
sudo ACCEPT_EULA=Y apt install -y msodbcsql17
```

### 5. Cài đặt Git

**Windows:**
1. Tải từ [git-scm.com](https://git-scm.com/downloads)
2. Chạy installer với default settings
3. Xác nhận:
   ```powershell
   git --version
   ```

**Linux:**
```bash
sudo apt install git
```

**macOS:**
```bash
brew install git
```

---

## 🗄️ Cấu hình SQL Server (SQL Server Configuration)

### 1. Tạo Database

**Windows (SQL Server Management Studio):**
```sql
-- Kết nối đến SQL Server với sa user
-- Chạy script sau:

CREATE DATABASE SmartFlowDB;
GO

USE SmartFlowDB;
GO

-- Tạo user (nếu cần)
CREATE LOGIN smartflow_user WITH PASSWORD = 'YourStrong@Password';
CREATE USER smartflow_user FOR LOGIN smartflow_user;
ALTER ROLE db_owner ADD MEMBER smartflow_user;
GO
```

**Linux (Docker):**
```bash
docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Password' \
  -Q "CREATE DATABASE SmartFlowDB"
```

### 2. Cấu hình Remote Connection (Windows)

1. Mở **SQL Server Configuration Manager**
2. Vào **SQL Server Network Configuration** → **Protocols for SQLEXPRESS**
3. Enable **TCP/IP**
4. Click chuột phải vào **TCP/IP** → **Properties**
5. Tab **IP Addresses**:
   - Scroll xuống **IPAll**
   - Set **TCP Port** = `1433`
   - Clear **TCP Dynamic Ports**
6. Restart SQL Server service

### 3. Test Connection

```powershell
# Windows
sqlcmd -S localhost\SQLEXPRESS -U sa -P 'YourPassword' -Q "SELECT @@VERSION"

# Linux Docker
docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourPassword' -Q "SELECT @@VERSION"
```

---

## 🔧 Thiết lập Backend (Python / FastAPI)

### Bước 1: Clone Repository

```bash
git clone https://github.com/mynd02work-bit/SmartFlow.git
cd SmartFlow
git checkout test_v1
```

### Bước 2: Di chuyển vào thư mục Backend

```bash
cd BackEnd
```

### Bước 3: Tạo môi trường ảo (Virtual Environment)

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Bước 4: Cài đặt dependencies

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

**Nếu gặp lỗi với pyodbc:**
```powershell
pip install pyodbc --no-binary :all:
```

### Bước 5: Cấu hình Environment Variables

Tạo file `.env` trong thư mục `BackEnd/`:

```env
# Database Configuration
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=SmartFlowDB
DB_USER=sa
DB_PASSWORD=YourStrong@Password
DB_DRIVER=ODBC Driver 17 for SQL Server

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# File Upload Configuration
UPLOAD_DIR=static/uploads
MAX_UPLOAD_SIZE=10485760

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30
```

**Lưu ý:**
- Thay đổi `DB_SERVER` theo cấu hình SQL Server của bạn
- Thay đổi `DB_PASSWORD` bằng password bạn đã đặt
- **QUAN TRỌNG**: Thay đổi `SECRET_KEY` trong production

### Bước 6: Chạy Database Migration (nếu có)

```powershell
python database/migrations/run_migrations.py
```

Hoặc chạy seeder để tạo dữ liệu mẫu:

```powershell
python database/seeders/seed_data.py
```

### Bước 7: Khởi động Backend

**Development mode:**
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode:**
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Bước 8: Xác nhận Backend đang chạy

- Truy cập: `http://localhost:8000/docs` (Swagger UI)
- Truy cập: `http://localhost:8000/health` (Health check)
- Should see: `{"status": "ok"}`

---

## 🌐 Thiết lập Frontend Web Admin

### Bước 1: Di chuyển vào thư mục FrontEnd

```bash
cd ../FrontEnd
```

### Bước 2: Cài đặt dependencies

```powershell
npm install
```

**Nếu gặp lỗi với node-sass:**
```powershell
npm install --legacy-peer-deps
```

### Bước 3: Cấu hình API URL (nếu cần)

Mở file `shared/services/api.js` và cập nhật:

```javascript
export const getBaseURL = () => {
  // Development
  return 'http://localhost:8000';
  
  // Production (khi deploy)
  // return 'https://smartflowg7.cloud';
};
```

### Bước 4: Chạy Development Server

```powershell
npm run dev
```

### Bước 5: Xác nhận Frontend đang chạy

- Truy cập: `http://localhost:5173` (hoặc port hiển thị trong terminal)
- Should see login page

---

## 📱 Thiết lập Mobile App

### Bước 1: Di chuyển vào thư mục Mobile

```bash
cd Mobile
```

### Bước 2: Cài đặt dependencies

```powershell
npm install
```

### Bước 3: Cấu hình Capacitor (nếu build native app)

```powershell
npm install @capacitor/android @capacitor/ios
npx cap init SmartFlow com.smartflow.app
npx cap add android
npx cap add ios
```

### Bước 4: Chạy Development Server

```powershell
npm run dev
```

### Bước 5: Xác nhận Mobile đang chạy

- Truy cập: `http://localhost:5174` (hoặc port hiển thị)
- Để truy cập từ điện thoại trong cùng mạng:
  - Lấy IP của máy: `ipconfig` (Windows) hoặc `ifconfig` (Linux/Mac)
  - Truy cập: `http://YOUR_IP:5174`

### Bước 6: Build Native App (Optional)

**Android APK:**
```powershell
npm run build
npx cap sync android
npx cap open android
# Trong Android Studio, chọn Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**iOS IPA:**
```powershell
npm run build
npx cap sync ios
npx cap open ios
# Trong Xcode, chọn Product → Archive
```

---

## 🚀 Chạy toàn bộ hệ thống

### Sử dụng script `run_project.bat` (Windows)

```batch
@echo off
echo ========================================
echo   SmartFlow v2 - Project Launcher
echo ========================================
echo.
echo Chọn chế độ chạy:
echo 1. Chạy Backend Server
echo 2. Chạy Web Admin
echo 3. Chạy Mobile App
echo 4. Chạy tất cả (Backend + Web + Mobile)
echo 5. Build tất cả cho production
echo 6. Thoát
echo.

set /p choice="Nhập lựa chọn (1-6): "

if "%choice%"=="1" (
    echo.
    echo Starting Backend Server...
    cd BackEnd
    if exist venv\Scripts\activate.bat (
        call venv\Scripts\activate.bat
    )
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
)

if "%choice%"=="2" (
    echo.
    echo Starting Web Admin...
    cd FrontEnd
    npm run dev
)

if "%choice%"=="3" (
    echo.
    echo Starting Mobile App...
    cd FrontEnd/Mobile
    npm run dev
)

if "%choice%"=="4" (
    echo.
    echo Starting all services...
    start "Backend" cmd /k "cd BackEnd && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    timeout /t 3 /nobreak
    start "Web Admin" cmd /k "cd FrontEnd && npm run dev"
    timeout /t 3 /nobreak
    start "Mobile App" cmd /k "cd FrontEnd/Mobile && npm run dev"
    echo.
    echo All services started!
    echo - Backend: http://localhost:8000
    echo - Web Admin: http://localhost:5173
    echo - Mobile App: http://localhost:5174
)

if "%choice%"=="5" (
    echo.
    echo Building all for production...
    cd FrontEnd
    npm run build
    cd Mobile
    npm run build
    echo.
    echo Build completed!
)

if "%choice%"=="6" (
    exit
)

pause
```

### Chạy thủ công (Linux/macOS)

Tạo file `run_all.sh`:

```bash
#!/bin/bash

echo "Starting SmartFlow v2..."

# Start Backend
cd BackEnd
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Web Admin
cd ../FrontEnd
npm run dev &
WEB_PID=$!

# Start Mobile App
cd Mobile
npm run dev &
MOBILE_PID=$!

echo "All services started!"
echo "Backend PID: $BACKEND_PID"
echo "Web PID: $WEB_PID"
echo "Mobile PID: $MOBILE_PID"

# Wait for all processes
wait $BACKEND_PID $WEB_PID $MOBILE_PID
```

Chạy:
```bash
chmod +x run_all.sh
./run_all.sh
```

---

## ✅ Kiểm tra kết nối (Verification)

### 1. Kiểm tra Backend

```powershell
# Health check
curl http://localhost:8000/health

# Expected output: {"status": "ok"}

# API Documentation
# Truy cập: http://localhost:8000/docs
```

### 2. Kiểm tra Frontend Web

1. Mở trình duyệt: `http://localhost:5173`
2. Đăng nhập với tài khoản test:
   - Username: `admin`
   - Password: `admin123` (hoặc theo seeder)
3. Kiểm tra:
   - Dashboard hiển thị
   - Dữ liệu load được
   - Không có lỗi trong browser console (F12)

### 3. Kiểm tra Mobile App

1. Mở trình duyệt: `http://localhost:5174`
2. Đăng nhập với tài khoản test
3. Kiểm tra:
   - Login screen hiển thị
   - Sau login: Plan tracking screen
   - Có thể quét QR (nếu có camera)

### 4. Kiểm tra WebSocket Connection

1. Mở browser console (F12)
2. Đăng nhập vào Web hoặc Mobile
3. Kiểm tra console:
   - Should see: `WebSocket connection established`
   - Không có lỗi: `WebSocket connection failed`

---

## 🔧 Giải quyết sự cố (Troubleshooting)

### 1. Lỗi: "ModuleNotFoundError: No module named 'fastapi'"

**Nguyên nhân:** Chưa cài đặt dependencies hoặc không activate venv

**Giải pháp:**
```powershell
cd BackEnd
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Lỗi: "ODBC Driver not found"

**Nguyên nhân:** Chưa cài đặt ODBC Driver 17

**Giải pháp:**
- Tải và cài đặt [ODBC Driver 17](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
- Restart máy sau khi cài đặt

### 3. Lỗi: "Cannot connect to SQL Server"

**Nguyên nhân:** SQL Server không chạy, sai connection string, hoặc firewall chặn

**Giải pháp:**
```powershell
# Kiểm tra SQL Server đang chạy
# Windows: Services → SQL Server (SQLEXPRESS)

# Kiểm tra connection string trong .env
# DB_SERVER=localhost\SQLEXPRESS
# DB_PASSWORD=YourPassword

# Kiểm tra firewall cho phép port 1433
# Windows Firewall → Inbound Rules → New Rule → Port 1433

# Test connection
sqlcmd -S localhost\SQLEXPRESS -U sa -P 'YourPassword' -Q "SELECT 1"
```

### 4. Lỗi: "Port already in use"

**Nguyên nhân:** Port 8000, 5173, hoặc 5174 đang bị chiếm

**Giải pháp:**
```powershell
# Tìm process đang dùng port
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F

# Hoặc đổi port trong command
uvicorn app.main:app --port 8001
```

### 5. Lỗi: "npm install failed"

**Nguyên nhân:** Network issue, permission issue, hoặc node version quá cũ

**Giải pháp:**
```powershell
# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Cài lại
npm install

# Nếu vẫn lỗi, thử với --legacy-peer-deps
npm install --legacy-peer-deps
```

### 6. Lỗi: "CORS Error" trong browser

**Nguyên nhân:** Frontend không được phép truy cập Backend

**Giải pháp:**
- Kiểm tra `CORS_ORIGINS` trong `.env`
- Thêm origin của frontend:
  ```env
  CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://YOUR_IP:5174
  ```
- Restart Backend

### 7. Lỗi: "WebSocket connection failed"

**Nguyên nhân:** WebSocket URL sai hoặc backend không chạy

**Giải pháp:**
- Kiểm tra `useWebSocket.js` trong FrontEnd
- Đảm bảo URL không có `/api/v1` prefix
- Kiểm tra Backend đang chạy trên port 8000

### 8. Lỗi: "File upload failed"

**Nguyên nhân:** Thư mục upload không tồn tại hoặc permission

**Giải pháp:**
```powershell
# Tạo thư mục upload
mkdir BackEnd\static\uploads

# Kiểm tra permission
# Windows: Right-click folder → Properties → Security
# Linux: chmod 755 static/uploads
```

---

## ✅ Checklist cài đặt (Setup Checklist)

### Prerequisites
- [ ] Python 3.13+ đã cài đặt
- [ ] Node.js 20+ đã cài đặt
- [ ] SQL Server 2019+ đã cài đặt
- [ ] ODBC Driver 17 đã cài đặt
- [ ] Git đã cài đặt

### Database
- [ ] SQL Server đang chạy
- [ ] Database `SmartFlowDB` đã tạo
- [ ] User `sa` có password
- [ ] TCP/IP đã enable
- [ ] Port 1433 đã mở
- [ ] Test connection thành công

### Backend
- [ ] Repository đã clone
- [ ] Virtual environment đã tạo
- [ ] Dependencies đã cài đặt
- [ ] File `.env` đã cấu hình
- [ ] Migration đã chạy (nếu có)
- [ ] Backend chạy trên port 8000
- [ ] Swagger UI truy cập được: `http://localhost:8000/docs`
- [ ] Health check OK: `http://localhost:8000/health`

### Frontend Web
- [ ] Dependencies đã cài đặt
- [ ] API URL đã cấu hình
- [ ] Web chạy trên port 5173
- [ ] Login page hiển thị
- [ ] Đăng nhập thành công
- [ ] Dashboard hiển thị dữ liệu
- [ ] Không có lỗi trong console

### Mobile App
- [ ] Dependencies đã cài đặt
- [ ] API URL đã cấu hình
- [ ] Mobile chạy trên port 5174
- [ ] Login page hiển thị
- [ ] Đăng nhập thành công
- [ ] Plan tracking hiển thị
- [ ] QR scanner hoạt động (nếu có camera)

### Integration
- [ ] Frontend kết nối được Backend
- [ ] Mobile kết nối được Backend
- [ ] WebSocket kết nối thành công
- [ ] File upload hoạt động
- [ ] Thông báo nhận được (nếu có FCM)

---

## 📞 Hỗ trợ (Support)

Nếu bạn gặp vấn đề không có trong danh sách trên:

1. Kiểm tra **GitHub Issues**: https://github.com/mynd02work-bit/SmartFlow/issues
2. Kiểm tra **Documentation**: https://github.com/mynd02work-bit/SmartFlow/wiki
3. Liên hệ **Email**: support@smartflowg7.cloud

---

## 📚 Tài liệu tham khảo (References)

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
