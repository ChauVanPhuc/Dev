$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Dang khoi dong Canvas Editor Dev Server          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[INFO] Kich hoat pnpm qua Corepack..." -ForegroundColor Yellow
    corepack enable
}

Write-Host "[INFO] Dang chay dev server (pnpm dev --open)..." -ForegroundColor Green
pnpm dev --open
