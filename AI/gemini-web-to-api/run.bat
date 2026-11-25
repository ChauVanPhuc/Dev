@echo off
chcp 65001 >nul
title Gemini Web To API - Port 8081

cd /d "%~dp0"

echo =====================================================================
echo           GEMINI WEB TO API - MÁY CHỦ CỤC BỘ (PORT 8081)
echo =====================================================================
echo.

:: 1. Kiểm tra file .env
if not exist ".env" (
    echo [!] File .env chưa tồn tại. Đang tạo từ .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
    ) else (
        echo PORT=2211 > .env
        echo APP_ENV=production >> .env
        echo GEMINI_COOKIES= >> .env
    )
)

:: 2. Kiểm tra cấu hình Cookie trong .env
findstr /R /C:"^GEMINI_COOKIES=[^ ]" .env >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] GEMINI_COOKIES chưa được cấu hình trong file .env!
    echo ---------------------------------------------------------------------
    echo HƯỚNG DẪN LẤY COOKIE TỪ GOOGLE GEMINI:
    echo  1. Mở trình duyệt và đăng nhập vào: https://gemini.google.com
    echo  2. Bấm phím F12 (hoặc chuột phải chọn Kiểm tra / Inspect)
    echo  3. Chuyển sang tab Network (Mạng), tải lại trang hoặc chat 1 câu
    echo  4. Tìm request: batchexecute?rpcids=otAQ7b
    echo  5. Vào tab Headers, cuộn xuống Request Headers, copy toàn bộ dòng Cookie
    echo  6. Dán vào biến GEMINI_COOKIES= trong file .env
    echo ---------------------------------------------------------------------
    echo [*] Bạn có thể dán cookie vào .env sau. Server vẫn sẽ khởi chạy
    echo     để bạn truy cập Giao diện Web Chat và xem hướng dẫn.
    echo.
)

:: 3. Kiểm tra file thực thi gemini-web-to-api.exe
if not exist "gemini-web-to-api.exe" (
    echo [*] Đang biên dịch mã nguồn Go thành gemini-web-to-api.exe...
    go build -o gemini-web-to-api.exe ./cmd/server
    if errorlevel 1 (
        echo [LOI] Không thể biên dịch. Vui lòng kiểm tra môi trường Go!
        pause
        exit /b 1
    )
    echo [OK] Biên dịch thành công!
    echo.
)

:: 4. Tự động mở trình duyệt sau 2 giây
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8081'"

:: 5. Khởi chạy máy chủ
echo [*] Đang khởi chạy máy chủ tại http://localhost:8081 ...
echo [*] Nhấn Ctrl + C để dừng máy chủ bất cứ lúc nào.
echo.
gemini-web-to-api.exe

pause

