@echo off
TITLE SmartFlow Feedback Portal (HTTPS) - Port 3001
COLOR 0B

echo ======================================================
echo    SMARTFLOW FEEDBACK PORTAL - HTTPS (PORT 3001)
echo    Chay voi giao thuc HTTPS de mo quyen Micro tren LAN
echo ======================================================
echo.

cd /d %~dp0Feedback\FrontEnd

if not exist node_modules (
    echo [!] node_modules chua ton tai trong Feedback/FrontEnd.
    echo [*] Dang cai dat cac goi thu vien can thiet...
    call npm install
) else (
    echo [OK] Cac thu vien phu thuoc da san sang.
)

echo.
echo [*] Dang khoi dong Feedback Portal voi HTTPS tai cong 3001...
echo [*] Truy cap tren trinh duyet: https://192.168.1.222:3001
echo [*] Luu y: Trinh duyet se hien canh bao chung chi, bam 'Nang cao' -^> 'Tiep tuc truy cap'
echo.

set HTTPS=true
call npm run dev

pause
