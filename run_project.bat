@echo off
TITLE ERP G7 - Ultimate Startup Suite
SETLOCAL EnableDelayedExpansion

:: 0A is green on black for a professional dev feel
COLOR 0A

:main_menu
cls
echo ======================================================
echo           ERP G7 - GLOBAL STARTUP SYSTEM
echo ======================================================
echo  [MENU] Please select an action:
echo  1. Start All Systems (Local Development Mode)
echo  2. Start Internet Server (Cloudflare Tunnel Mode - Global Access)
echo  3. Build and Sync Android APK (Mobile)
echo  4. Sync Mobile Code to Android (Capacitor Sync)
echo  5. Build All Apps for Production (One-time only)
echo  6. Run Production Mode (Ultimate Speed - Single Port)
echo  7. Rebuild Database Indexes (Performance Optimization)
echo  8. Exit
echo.
set /p choice="Enter choice (1-8) and press Enter: "

if "%choice%"=="8" exit
if "%choice%"=="7" goto rebuild_indexes
if "%choice%"=="6" goto run_production
if "%choice%"=="5" goto build_all
if "%choice%"=="4" goto sync_android
if "%choice%"=="3" goto build_apk
if "%choice%"=="2" goto start_cloud
if "%choice%"=="1" goto start_all
goto main_menu

:start_all
cls
echo  [SYSTEM CHECK] Initializing development environment...

:: --- CHECK PREREQUISITES ---

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python and add to PATH.
    pause
    goto main_menu
)

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js and add to PATH.
    pause
    goto main_menu
)

echo  [SYSTEM CHECK] Environment validated.
echo.

:: --- 1. BACKEND (FastAPI + SQL Server) ---
echo [1/3] Processing Backend (FastAPI)...
cd /d %~dp0BackEnd
:: Pre-check for core libraries to avoid redundant and error-prone 'pip install'
python -c "import uvicorn, fastapi, pyodbc, pydantic_settings, websockets, firebase_admin" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Backend libraries missing or incomplete. Syncing requirements...
    call pip install -r requirements.txt
) else (
    echo [OK] Backend dependencies - including Realtime/Firebase - are satisfied.
)
:: Open specialized window for Backend
start "Backend - ERP G7" cmd /k "cd /d %~dp0 && call start_server.bat"

:: --- 2. FRONTEND (Vite Web Dashboard) ---
echo [2/3] Processing Frontend (Vite)...
cd /d %~dp0FrontEnd
if not exist node_modules (
    echo [!] node_modules missing in FrontEnd. Running 'npm install'...
    call npm install
) else (
    echo [OK] Frontend dependencies are already satisfied.
)
:: Open specialized window for Frontend
start "Frontend - ERP G7" cmd /k "cd /d %~dp0FrontEnd && npm run dev"

:: --- 3. MOBILE (Vite/Capacitor App) ---
echo [3/3] Processing Mobile (Vite)...
cd /d %~dp0FrontEnd\Mobile
if not exist node_modules (
    echo [!] node_modules missing in Mobile. Running 'npm install'...
    call npm install
) else (
    echo [OK] Mobile dependencies are already satisfied.
)
:: Open specialized window for Mobile
start "Mobile - ERP G7" cmd /k "cd /d %~dp0FrontEnd\Mobile && npm run dev -- --port 1333 --host 0.0.0.0"

echo.
echo ======================================================
echo  SUCCESS: All systems have been signaled to start.
echo  Check the individual windows for status and logs.
echo ======================================================
pause
goto main_menu

:sync_android
cls
echo ======================================================
echo  SYNC: Synchronizing Mobile Code to Android...
echo ======================================================
cd /d %~dp0FrontEnd\Mobile
if not exist node_modules (
    echo [!] node_modules missing in Mobile. Running 'npm install'...
    call npm install
)
echo [1/2] Building Web Assets...
call npm run build
echo [2/2] Running Capacitor Sync...
call npx cap sync android
echo.
echo [DONE] Sync complete. You can now run the app from Android Studio.
pause
goto main_menu

:build_apk
echo ======================================================
echo  EXPORTER: Starting Mobile Android Build Process...
echo ======================================================
:: [FIX] Thiet lap GRADLE_USER_HOME va JAVA_HOME de tranh loi Unicode va thieu Java compiler
set "GRADLE_USER_HOME=M:\.gradle"
set "ANDROID_HOME=P:\Android\Sdk"
set "ANDROID_SDK_ROOT=P:\Android\Sdk"
if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.1.1\jbr" (
        set "JAVA_HOME=C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.1.1\jbr"
        set "PATH=C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.1.1\jbr\bin;%PATH%"
        echo [*] Auto-configured JAVA_HOME to IntelliJ: %JAVA_HOME%
        echo [*] Auto-configured GRADLE_USER_HOME to pure ASCII: %GRADLE_USER_HOME%
    )
)
cd /d %~dp0FrontEnd\Mobile
if not exist node_modules (
    echo [!] node_modules missing in Mobile. Running 'npm install'...
    call npm install
)
echo [1/3] Building Web Assets...
call npm run build
echo [2/3] Syncing with Android Project...
call npx cap sync android
echo [3/3] Compiling APK using Gradle (Please wait)...
cd android
call gradlew.bat assembleDebug
echo.
echo ======================================================
echo  BUILD COMPLETE!
echo  APK Path: FrontEnd\Mobile\android\app\build\outputs\apk\debug\app-debug.apk
echo ======================================================
pause
goto main_menu

:start_cloud
cls
echo  [CLOUD MODE] Preparing system for Internet access...
echo.
echo  [1/2] Starting Backend (FastAPI)...
start "Backend (Cloud) - ERP G7" cmd /k "cd /d %~dp0 && call start_server.bat"

echo  [2/3] Starting Mobile App (Vite)...
start "Mobile Frontend (Cloud) - ERP G7" cmd /k "cd /d %~dp0FrontEnd\Mobile && npm run dev -- --port 1333 --host 0.0.0.0 --no-open"

echo  [3/3] Starting Dashboard (Vite)...
start "Dashboard (Cloud) - ERP G7" cmd /k "cd /d %~dp0FrontEnd && npm run dev -- --host 0.0.0.0 --no-open"

echo.
echo ======================================================
echo  SUCCESS: System is now LIVE on the Internet via Cloudflare.
echo  App: https://smartflowg7.cloud
echo  Dashboard: https://dashboard.smartflowg7.cloud
echo  API: https://api.smartflowg7.cloud
echo ======================================================
pause
goto main_menu

:build_all
cls
echo ======================================================
echo  BUILDER: Compiling all systems for Production...
echo ======================================================
echo.
echo [1/2] Building Mobile App...
cd /d %~dp0FrontEnd\Mobile
if not exist node_modules (
    echo [!] node_modules missing in Mobile. Running 'npm install'...
    call npm install
)
call npm run build
echo.
echo [2/2] Building Dashboard...
cd /d %~dp0FrontEnd
if not exist node_modules (
    echo [!] node_modules missing in FrontEnd. Running 'npm install'...
    call npm install
)
call npm run build
echo.
echo ======================================================
echo  BUILD COMPLETE! Ready to run in Production Mode.
echo ======================================================
pause
goto main_menu

:rebuild_indexes
cls
echo ======================================================
echo  INDEX REBUILD: Database Performance Optimization
echo ======================================================
echo.
echo [INFO] This process rebuilds all database indexes.
echo [INFO] Recommended to run every 6-12 months.
echo [INFO] This may take several minutes depending on database size.
echo.
echo [!] Make sure no users are actively using the system during this process.
echo.
set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" goto main_menu

echo.
echo [1/1] Running index rebuild...
cd /d %~dp0BackEnd
python database\migrations\rebuild_indexes.py

echo.
echo ======================================================
echo  INDEX REBUILD COMPLETE!
echo  Database performance has been optimized.
echo ======================================================
pause
goto main_menu

:run_production
cls
echo ======================================================
echo  PRODUCTION: Running ERP G7 in Ultimate Speed Mode
echo ======================================================
echo.
echo [!] Ensuring only ONE port (8000) is used for everything.
echo [!] Make sure you have run Option 5 (Build) before this.
echo.
cd /d %~dp0BackEnd
:: Start Backend without reload, serving static dist folders
start "ERP G7 PRODUCTION SERVER" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 1111"

echo.
echo ======================================================
echo  SUCCESS: System is now LIVE in PRODUCTION.
echo  Access via Cloudflare:
echo  - App: https://smartflowg7.cloud
echo  - Dashboard: https://smartflowg7.cloud/dashboard
echo  - API: https://smartflowg7.cloud/api/v1
echo ======================================================
pause
goto main_menu
