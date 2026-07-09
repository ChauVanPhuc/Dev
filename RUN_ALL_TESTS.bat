@echo off
setlocal
echo ======================================================
echo   SMARTFLOW - HE THONG KIEM THU TU DONG (FIXED)
echo ======================================================

:: Kiem tra thu muc
if not exist "BackEnd" (
    echo [!] LOI: Khong tim thay thu muc BackEnd. Hay chay file nay tai thu muc goc du an.
    pause
    exit /b
)

echo.
echo [1/2] DANG CHAY BACKEND TESTS...
cd /d "%~dp0BackEnd"
:: Su dung 'call' de ngan chan viec thoat script dot ngot
call pytest tests/
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] CANH BAO: Mot so bai test BackEnd BI LOI hoac ban chua cai dat 'pytest'.
    echo [TIP] Hay chay lenh: pip install pytest pytest-asyncio httpx
) else (
    echo [OK] Backend Tests hoan tat.
)

echo.
echo [2/2] DANG CHAY MOBILE TESTS...
cd /d "%~dp0FrontEnd\Mobile"
if not exist "node_modules" (
    echo [!] CANH BAO: Thu muc node_modules khong ton tai. Dang thu chay voi npx...
)
call npx vitest run
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] CANH BAO: Mot so bai test Mobile BI LOI hoac ban chua cai dat 'vitest'.
    echo [TIP] Hay chay lenh: npm install
) else (
    echo [OK] Mobile Tests hoan tat.
)

echo.
echo ======================================================
echo   KIEM THU KET THUC. KIEM TRA CAC THONG BAO PHIA TREN.
echo ======================================================
pause
