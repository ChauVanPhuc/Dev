@echo off
echo ======================================================
echo   SMARTFLOW - DANG CAI DAT MOI TRUONG KIEM THU
echo ======================================================

echo.
echo [1/2] DANG CAI DAT THU VIEN BACKEND (PYTHON)...
pip install pytest pytest-asyncio httpx

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
