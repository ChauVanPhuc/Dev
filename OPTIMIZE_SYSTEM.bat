@echo off
title SmartFlow System Performance Optimization Tool

echo ============================================================
echo      SMARTFLOW SYSTEM PERFORMANCE OPTIMIZATION TOOL
echo ============================================================
echo.

:: 1. Check Python
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python and try again.
    echo.
    pause
    exit /b 1
)
echo Python is ready.
echo.

:: 2. Run Index Script
echo [2/3] Executing Database Performance Indexes...
if exist "BackEnd\scripts\run_indexes.py" (
    python BackEnd\scripts\run_indexes.py
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to execute database indexes script.
        echo Please check your database settings in BackEnd\.env.
        echo.
        pause
        exit /b 1
    )
) else (
    echo [ERROR] Script run_indexes.py not found at BackEnd\scripts\
    echo.
    pause
    exit /b 1
)
echo.

:: 3. Performance Advice
echo [3/3] System optimization details:
echo ============================================================
echo   SYSTEM PERFORMANCE CONFIGURATION
echo ============================================================
echo 1. DATABASE CONNECTION POOL:
echo    - Configured pool_size=100 and max_overflow=400 in config/database.py.
echo.
echo 2. IN-MEMORY CACHE ACTIVE:
echo    - Static stages are cached in-memory.
echo    - To clear cache, restart the Backend API.
echo.
echo 3. RUNNING IN PRODUCTION:
echo    - Run with multiple workers to handle high concurrency:
echo      uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
echo ============================================================
echo.
echo SYSTEM OPTIMIZED SUCCESSFULLY!
echo.
pause
