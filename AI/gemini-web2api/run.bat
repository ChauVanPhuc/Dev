@echo off
title Gemini Web2API Server
cd /d "%~dp0"

echo ==========================================================
echo               Gemini Web2API Server Startup
echo ==========================================================
echo.



rem Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment venv...
    call .venv\Scripts\activate.bat
) else (
    echo [WARNING] Virtual environment venv not found.
    echo Running with default system python.
)

rem Find real Python executable (bypass 0-byte Windows Store App execution aliases)
set "PYTHON_EXE="
for /f "delims=" %%i in ('where python 2^>nul') do (
    if %%~zi GTR 0 (
        if not defined PYTHON_EXE (
            set "PYTHON_EXE=%%i"
        )
    )
)

if not defined PYTHON_EXE (
    echo [ERROR] Real Python executable not found in PATH.
    echo Please install Python 3.8 or higher.
    pause
    exit /b 1
)

rem Check for httpx module
"%PYTHON_EXE%" -c "import httpx" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] httpx is not installed. Installing dependencies...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

rem Start the server with any optional arguments passed to the script
echo.
echo [INFO] Starting Gemini Web2API server...
echo.
"%PYTHON_EXE%" gemini_web2api.py %*

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server terminated with exit code %errorlevel%.
    pause
)
