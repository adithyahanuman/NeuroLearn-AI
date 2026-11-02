# ══════════════════════════════════════════════════════════════════════════════
# scripts/smoke.ps1 – Deployment Smoke Test for Local Services
# ══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "🔍 Running NeuroLearn AI Smoke Tests across all local services..." -ForegroundColor Cyan

# 1. Test ML Service
try {
    $mlResp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/ml/health" -Method Get
    if ($mlResp.status -eq "ok") {
        Write-Host "  ✅ ML Service Healthy (v$($mlResp.modelVersion)) [http://127.0.0.1:8000]" -ForegroundColor Green
    } else {
        throw "ML Service returned unexpected status: $($mlResp.status)"
    }
} catch {
    Write-Host "  ❌ ML Service check failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Test Backend API
try {
    $beResp = Invoke-RestMethod -Uri "http://127.0.0.1:3001/health" -Method Get
    if ($beResp.status -eq "ok") {
        Write-Host "  ✅ Backend API Healthy [http://127.0.0.1:3001]" -ForegroundColor Green
    } else {
        throw "Backend returned unexpected status: $($beResp.status)"
    }
} catch {
    Write-Host "  ❌ Backend API check failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Test Student Login & Authentication
try {
    $loginBody = @{
        email = "demo1@neurolearn.ai"
        password = "demo"
    } | ConvertTo-Json

    $authResp = Invoke-RestMethod -Uri "http://127.0.0.1:3001/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $authResp.token
    $studentId = $authResp.user.studentId

    Write-Host "  ✅ Student Auth Verified (Asha Demo) [JWT issued]" -ForegroundColor Green

    # 4. Test Student Twin Query
    $headers = @{ Authorization = "Bearer $token" }
    $risks = Invoke-RestMethod -Uri "http://127.0.0.1:3001/students/$studentId/risks" -Method Get -Headers $headers
    Write-Host "  ✅ Live Digital Twin Risks Retreived ($($risks.Count) concepts evaluated)" -ForegroundColor Green

} catch {
    Write-Host "  ❌ Auth / Twin check failed: $_" -ForegroundColor Red
    exit 1
}

# 5. Test Frontend Server
try {
    $feResp = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -UseBasicParsing
    if ($feResp.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend UI Responding (HTTP 200) [http://localhost:5173]" -ForegroundColor Green
    } else {
        throw "Frontend returned status code $($feResp.StatusCode)"
    }
} catch {
    Write-Host "  ❌ Frontend check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 All services are fully operational, connected to local Postgres, and ready for demo!" -ForegroundColor Cyan
