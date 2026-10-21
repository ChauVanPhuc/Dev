@echo off
TITLE ERP G7 CANVAS EDITOR (PORT 1000)

:: ============================================================
::  ANTI-FREEZE STARTUP SCRIPT
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
  "Write-Host '[SHIELD] QuickEdit Mode DISABLED - Terminal will not freeze on mouse click.' -ForegroundColor Green"

echo.
echo ======================================================
echo   ERP G7 CANVAS EDITOR - Port 1000 Dev Server
echo ======================================================
echo.

if exist "%~dp0WS\canvas-editor" (
    cd /d "%~dp0WS\canvas-editor"
) else (
    cd /d C:\Tool\WS\canvas-editor
)
if not exist node_modules (
    echo [!] node_modules missing in WS/canvas-editor. Running 'npm install'...
    call npm install
)
npm run dev

