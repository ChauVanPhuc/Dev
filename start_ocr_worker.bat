@echo off
TITLE ERP G7 AI OCR WORKER (ISOLATED PROCESS)

:: ============================================================
::  ANTI-FREEZE STARTUP SCRIPT FOR AI OCR WORKER
::  Tat QuickEdit Mode de tranh terminal bi dong bang khi
::  nguoi dung vo tinh click chuot vao cua so CMD.
:: ============================================================

powershell -NoProfile -Command ^
  "Add-Type -MemberDefinition '" ^
  "[DllImport(\"kernel32.dll\", SetLastError = true)] public static extern IntPtr GetStdHandle(int nStdHandle);" ^
  "[DllImport(\"kernel32.dll\", SetLastError = true)] public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);" ^
  "[DllImport(\"kernel32.dll\", SetLastError = true)] public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);" ^
  "' -Name WinAPI -Namespace ConsoleUtils -PassThru | Out-Null;" ^
  "$h = [ConsoleUtils.WinAPI]::GetStdHandle(-10);" ^
  "[uint32]$m = 0;" ^
  "[ConsoleUtils.WinAPI]::GetConsoleMode($h, [ref]$m) | Out-Null;" ^
  "$m = $m -band (-bnot 0x0040);" ^
  "[ConsoleUtils.WinAPI]::SetConsoleMode($h, $m) | Out-Null;" ^
  "Write-Host '[SHIELD] QuickEdit Mode DISABLED - OCR Worker Terminal will not freeze on mouse click.' -ForegroundColor Green"

echo.
echo ======================================================
echo   ERP G7 AI OCR WORKER - Isolated Process Queue
echo   QuickEdit has been disabled to prevent freezing.
echo ======================================================
echo.

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
    echo [ERROR] Python not found or not in PATH.
    pause
    exit /b 1
)

set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
cd /d %~dp0BackEnd
"%PYTHON_EXE%" "%~dp0lpn_crawler\backend\worker\ocr_worker.py"

