@echo off
echo ======================================================
echo   SMARTFLOW - DANG CAI DAT MOI TRUONG KIEM THU
echo ======================================================

echo.
echo [1/2] DANG CAI DAT THU VIEN BACKEND (PYTHON)...
:: Find real Python executable (bypass 0-byte Windows Store App execution aliases)
set "PYTHON_EXE="
for /f "delims=" %%i in ('where python 2^>nul') do (
    if %%~zi GTR 0 (
        if not defined PYTHON_EXE (
            set "PYTHON_EXE=%%i"
        )
    )
)

if not defined PYTHON_EXE (
    echo [LOI] Khong tim thay Python tren he thong de cai dat thu vien.
    pause
    exit /b
)

"%PYTHON_EXE%" -m pip install pytest pytest-asyncio httpx

echo.
echo [2/2] DANG CAI DAT THU VIEN MOBILE (NODEJS)...
cd /d "%~dp0FrontEnd\Mobile"
:: Cai dat cac thu vien dev can thiet cho Vitest
call npm install -D vitest @testing-library/react jsdom @vitejs/plugin-react

echo.
echo ======================================================
echo   CAI DAT HOAN TAT!
echo   BAY GIO BAN HAY CHAY FILE 'RUN_ALL_TESTS.bat'
echo ======================================================
pause
