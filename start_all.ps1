# NeuroLearn AI - Startup Script (PowerShell)
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          Starting NeuroLearn AI Multi-Tier Services                  " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. PostgreSQL Check
Write-Host "[1/4] Checking PostgreSQL status..." -ForegroundColor Yellow
$pgListening = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if (-not $pgListening) {
    Write-Host "Starting PostgreSQL 18 server..." -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\18\data" -l "$env:TEMP\postgres.log" start
    Start-Sleep -Seconds 3
} else {
    Write-Host "PostgreSQL is already running on port 5432." -ForegroundColor Green
}

# 2. ML Service
Write-Host "[2/4] Starting ML Microservice (FastAPI - Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\ml-service'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 3. Backend Gateway
Write-Host "[3/4] Starting Backend Gateway (Express - Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\backend'; npm.cmd run dev"

# 4. Frontend Client
Write-Host "[4/4] Starting Frontend Client (Vite - Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\frontend'; npm.cmd run dev"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "All services launched in separate windows!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://127.0.0.1:3001/health" -ForegroundColor White
Write-Host "  ML Engine: http://127.0.0.1:8000/ml/health" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
