@echo off
TITLE SmartFlow Claim Portal
COLOR 0B

echo ======================================================
echo    SMARTFLOW CLAIM PORTAL
echo    He thong quan ly khieu nai, gia tu va AI OCR
echo ======================================================
echo.

:: 1. Khoi dong Claim Backend API
echo [*] Khoi dong Claim Backend API tai cong 1111...
start "SmartFlow Claim - Backend API (Port 1111)" /d "%~dp0Claim\BackEnd" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 1111 --reload"

:: 2. Kiem tra va khoi dong Claim Frontend
cd /d "%~dp0Claim\FrontEnd"

if not exist node_modules (
    echo [!] node_modules chua ton tai trong Claim/FrontEnd.
    echo [*] Dang cai dat cac goi thu vien can thiet...
    call npm install
) else (
    echo [OK] Cac thu vien phu thuoc da san sang.
)

echo.
echo [*] Dang khoi dong Claim Web Dashboard tai cong 2222...
echo [*] Truy cap: http://localhost:2222/admin/claims
echo.
start http://localhost:2222/admin/claims
call npm run dev

pause
