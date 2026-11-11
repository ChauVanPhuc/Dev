@echo off
TITLE ERP G7 PRODUCTION SERVER (NO RELOAD)

:: ============================================================
::  ANTI-FREEZE PRODUCTION STARTUP SCRIPT
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
  "Write-Host '[SHIELD] QuickEdit Mode DISABLED - Production Terminal will not freeze on mouse click.' -ForegroundColor Green"

echo.
echo ======================================================
echo   ERP G7 PRODUCTION SERVER - Ultimate Speed Mode
echo   QuickEdit has been disabled to prevent freezing.
echo ======================================================
echo.

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
"%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000

