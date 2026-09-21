@echo off
TITLE SmartFlow Feedback Portal - Port 3001
COLOR 0E

echo ======================================================
echo    SMARTFLOW FEEDBACK PORTAL - PORT 3001
echo    Moi truong quan ly bao cao su co va gop y
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
echo [*] Dang khoi dong Feedback Portal tai cong 3001...
echo [*] Truy cap: http://localhost:3001
echo.
call npm run dev

pause
