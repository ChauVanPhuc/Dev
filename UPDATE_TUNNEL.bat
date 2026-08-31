@echo off
chcp 65001 > nul
TITLE CAP NHAT CLOUDFLARE TUNNEL - MOI

:: Tu dong yeu cau quyen Admin bang UAC popup
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Dang yeu cau quyen Administrator...
    powershell -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\" -elevated' -Verb RunAs"
    exit /b
)

echo ========================================================
echo  DANG CAI DAT VA KHOI DONG CLOUDFLARE TUNNEL MOI
echo ========================================================
echo.

echo [1/3] Dang go bo Tunnel cu...
"C:\Users\Administrator\cloudflared.exe" service uninstall

echo [2/3] Dang cai dat Tunnel moi...
"C:\Users\Administrator\cloudflared.exe" service install eyJhIjoiMDRhMGU4YTdkYmQwM2VhYzhiZmE4OTVhOTFlNWUwNjQiLCJ0IjoiMzYyMjkwMmItNTQ5Zi00YjhmLWE1N2YtYWQ3NjMzMWFiYTdjIiwicyI6IllXTXdZelEzTURZdFl6Vm1OUzAwT1dRNExUazVObUl0TldReE5XSmlNR05oWW1KaSJ9

echo [3/3] Dang khoi dong Service...
net start Cloudflared

echo.
echo ========================================================
echo  [THANH CONG] May chu nay da duoc ket noi vao Tunnel moi!
echo ========================================================
pause
