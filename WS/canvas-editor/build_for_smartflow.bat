@echo off
set ROOT_DIR=%~dp0
cd /d %ROOT_DIR%
echo ======================================================
echo  BUILDING CANVAS EDITOR FOR SMARTFLOW
echo ======================================================
echo.
if not exist node_modules (
    echo [*] Installing dependencies in WS/canvas-editor...
    call npm install
)
echo [*] Compiling Canvas Editor application bundle...
call npx vite build --mode app

echo.
echo [*] Syncing build output to FrontEnd/public/canvas-editor...
if not exist "..\..\FrontEnd\public\canvas-editor" mkdir "..\..\FrontEnd\public\canvas-editor"
robocopy dist ..\..\FrontEnd\public\canvas-editor /E /XF *.log >nul

echo.
echo ======================================================
echo  SUCCESS: Canvas Editor built and deployed to FrontEnd!
echo ======================================================
