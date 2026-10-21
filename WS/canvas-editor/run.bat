@echo off
title Canvas Editor Runner
cd /d "%~dp0"

echo ========================================================
echo        Dang khoi dong Canvas Editor Dev Server
echo ========================================================
echo.

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Kich hoat pnpm qua Corepack...
    call corepack enable
)

echo [INFO] Dang chay dev server (pnpm dev --open)...
call pnpm dev --open

pause
