@echo off
title NeuroLearn AI - Startup Launcher
echo ======================================================================
echo           Starting NeuroLearn AI Multi-Tier Services
echo ======================================================================
echo.

:: 1. Check / Start PostgreSQL
echo [1/4] Checking PostgreSQL status...
netstat -ano | findstr /R /C:":5432 " >nul
if %errorlevel% neq 0 (
    echo Starting PostgreSQL 18 service...
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\18\data" -l "%TEMP%\postgres.log" start
    timeout /t 3 /nobreak >nul
) else (
    echo PostgreSQL is already active on port 5432.
)

:: 2. Start ML Microservice
echo [2/4] Launching ML Microservice (FastAPI on Port 8000)...
start "NeuroLearn - ML Service (8000)" cmd /k "cd /d "%~dp0ml-service" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 3. Start Backend Gateway
echo [3/4] Launching Backend Gateway (Express on Port 3001)...
start "NeuroLearn - Backend Gateway (3001)" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

:: 4. Start Frontend Client
echo [4/4] Launching Frontend Client (Vite on Port 5173)...
start "NeuroLearn - Frontend (5173)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo.
echo ======================================================================
echo All 4 services have been launched in separate windows!
echo - Frontend:  http://localhost:5173
echo - Backend:   http://127.0.0.1:3001/health
echo - ML Engine: http://127.0.0.1:8000/ml/health
echo ======================================================================
echo.
pause
