@echo off
chcp 65001 > nul
TITLE ERP G7 - ULTIMATE ONE-CLICK PUBLISHER
set REAL_ROOT=%~dp0

echo ======================================================
echo          ERP G7 - ULTIMATE ONE-CLICK PUBLISHER
echo ======================================================
echo  Cong cu nay se tu dong thuc hien TAT CA cac buoc:
echo  1. Cap nhat Version (Sua code)
echo  2. Build Web (Mobile + Dashboard)
echo  3. Build Android APK (Dung o ao Z:)
echo  4. Phat hanh APK len Server
echo  5. Tu dong khoi dong lai Backend
echo ======================================================
echo.

:: Lay version hien tai tu package.json
for /f "usebackq tokens=*" %%g in (`powershell -ExecutionPolicy Bypass -Command "(Get-Content FrontEnd/Mobile/package.json | ConvertFrom-Json).version"`) do (set CURRENT_VER=%%g)

echo Ban hien tai: %CURRENT_VER%
echo.
set /p V_NUM="[1/2] Nhap version moi: "
set /p V_NOTE="[2/2] Nhap ghi chu: "
if "%V_NOTE%"=="" set V_NOTE=Ban cap nhat %V_NUM%

echo.
echo [1/5] Dang cap nhat Version trong code...
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
    echo [LOI] Khong tim thay Python tren he thong.
    pause
    exit /b
)

"%PYTHON_EXE%" BackEnd\scripts\bump_version.py "%V_NUM%" "%V_NOTE%"
if %errorlevel% neq 0 (
    echo [LOI] Khong the cap nhat version.
    pause
    exit /b
)

echo.
echo [2/5] Dang build Web (Mobile + Dashboard)...
cd /d "%REAL_ROOT%FrontEnd\Mobile"
if not exist node_modules (
    echo [!] node_modules missing in Mobile. Running 'npm install'...
    call npm install
)
call npm run build
cd /d "%REAL_ROOT%FrontEnd"
if not exist node_modules (
    echo [!] node_modules missing in FrontEnd. Running 'npm install'...
    call npm install
)
call npm run build

echo.
echo [3/5] Dang build Android APK (Vui long doi 1-2 phut)...
echo [INFO] Dang tao o dia ao Z: de tranh loi duong dan tieng Viet...

:: Xoa o dia Z neu dang ton tai
subst Z: /D >nul 2>&1
:: Mount thu muc hien tai vao o Z:
subst Z: "%REAL_ROOT:~0,-1%"

if %errorlevel% neq 0 (
    echo [LOI] Khong the tao o dia ao Z:. Vui long thu chay voi quyen Admin hoac tat o dia Z: neu dang dung.
    pause
    exit /b
)

:: Chuyen sang o Z de build
Z:
cd FrontEnd\Mobile
call npx cap sync android
cd android
call gradlew.bat clean assembleDebug

if %errorlevel% neq 0 (
    echo [LOI] Build APK THAT BAI!
    subst Z: /D
    pause
    exit /b
)

:: Quay lai duong dan that
cd /d "%REAL_ROOT%"
subst Z: /D

echo.
echo [4/5] Dang phat hanh APK vao thu muc he thong...
set "SOURCE=FrontEnd\Mobile\android\app\build\outputs\apk\debug\app-debug.apk"
set "DEST=BackEnd\static\apps\SmartFlow_v%V_NUM%.apk"
copy /y "%SOURCE%" "%DEST%"
copy /y "%SOURCE%" "BackEnd\static\apps\SmartFlow_Latest.apk"

echo.
echo [5/5] Dang khoi dong lai Backend de ap dung version moi...
taskkill /F /FI "WINDOWTITLE eq Backend*" /T >nul 2>&1
timeout /t 2 >nul
cd /d "%REAL_ROOT%BackEnd"
start "ERP G7 PRODUCTION SERVER" cmd /k "cd /d %REAL_ROOT% && call start_server.bat"

echo.
echo ======================================================
echo  THANH CONG! He thong da duoc cap nhat len v%V_NUM%
echo  1. Web/Dashboard da duoc build moi.
echo  2. APK v%V_NUM% da san sang de tai ve.
echo  3. Backend da duoc khoi dong lai tu dong.
echo ======================================================
pause
