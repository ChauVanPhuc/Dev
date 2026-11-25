# Script khởi chạy Gemini Web To API trên PowerShell (Cổng 8081)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "          GEMINI WEB TO API - MÁY CHỦ CỤC BỘ (PORT 8081)" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra .env
if (-not (Test-Path ".env")) {
    Write-Host "[!] Đang tạo file .env từ .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        Set-Content -Path ".env" -Value "PORT=8081`nAPP_ENV=production`nGEMINI_COOKIES="
    }
}

# 2. Kiểm tra Cookie
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "GEMINI_COOKIES=.+") {
    Write-Host "[CẢNH BÁO] GEMINI_COOKIES chưa được điền trong file .env!" -ForegroundColor Yellow
    Write-Host "Hướng dẫn: Vào gemini.google.com -> F12 -> Network -> batchexecute -> Copy Cookie dán vào .env" -ForegroundColor Gray
    Write-Host ""
}

# 3. Kiểm tra file exe
if (-not (Test-Path "gemini-web-to-api.exe")) {
    Write-Host "[*] Đang biên dịch gemini-web-to-api.exe..." -ForegroundColor Cyan
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    go build -o gemini-web-to-api.exe ./cmd/server
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[LỖI] Biên dịch thất bại!" -ForegroundColor Red
        exit 1
    }
}

# 4. Tự động mở trình duyệt
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8081"
} | Out-Null

# 5. Chạy server
Write-Host "[*] Máy chủ đang chạy tại http://localhost:8081 ..." -ForegroundColor Green
Write-Host "[*] Nhấn Ctrl + C để dừng." -ForegroundColor Gray
Write-Host ""

& .\gemini-web-to-api.exe

