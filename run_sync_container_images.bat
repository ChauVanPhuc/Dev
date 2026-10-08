@echo off
TITLE DONG BO ANH CONTAINER SIEU TOC (RAPID MODE) - SMARTFLOW
CHCP 65001 >nul

echo ================================================================
echo   TIEN TRINH DONG BO ANH CONTAINER SIEU TOC (RAPID TRAVERSAL)
echo   Toc do: ~0.3s/container - Da luong song song (ThreadPool 8 workers)
echo   Thu tu: Uu tien Container MOI NHAT -^> CU NHAT
echo ================================================================
echo.

:: Tim Python executable hop le
set "PYTHON_EXE="
for /f "delims=" %%i in ('where python 2^>nul') do (
    if %%~zi GTR 0 (
        if not defined PYTHON_EXE (
            set "PYTHON_EXE=%%i"
        )
    )
)

if not defined PYTHON_EXE (
    if exist "C:\Python314\python.exe" set "PYTHON_EXE=C:\Python314\python.exe"
)

if not defined PYTHON_EXE (
    echo [ERROR] Khong tim thay Python trong he thong!
    pause
    exit /b 1
)

cd /d %~dp0

echo Cac tuy chon dong bo toc do cao:
echo [1] Dong bo 50 Container moi nhat (Chi mat ~15 giay)
echo [2] Dong bo 200 Container moi nhat (Chi mat ~1 phut)
echo [3] Dong bo TOAN BO Container dang thieu anh
echo [4] Dong bo 1 so Container cu the
echo.
set /p opt="Nhap lua chon (1/2/3/4) [Mac dinh 1]: "

if "%opt%"=="2" (
    "%PYTHON_EXE%" lpn_crawler\tools\sync_missing_container_images.py --limit 200 --workers 10
) else if "%opt%"=="3" (
    "%PYTHON_EXE%" lpn_crawler\tools\sync_missing_container_images.py --workers 10 --stop-after-existing 0
) else if "%opt%"=="4" (
    set /p cont_num="Nhap so Container (VD: FSCU 7273433): "
    "%PYTHON_EXE%" lpn_crawler\tools\sync_missing_container_images.py --container "%cont_num%"
) else (
    "%PYTHON_EXE%" lpn_crawler\tools\sync_missing_container_images.py --limit 50 --workers 8
)

echo.
echo ================================================================
echo   TIEN TRINH DA HOAN TAT!
echo   Hay F5 lai trang Web: /admin/lpn-crawler de kiem tra.
echo ================================================================
pause
