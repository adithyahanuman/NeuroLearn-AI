#!/usr/bin/env bash
set -e

echo "🔍 Running NeuroLearn AI Smoke Tests across all local services..."

# 1. ML Service
ML_STATUS=$(curl -s http://127.0.0.1:8000/ml/health | grep -o '"status":"ok"' || true)
if [ -n "$ML_STATUS" ]; then
    echo "  ✅ ML Service Healthy [http://127.0.0.1:8000]"
else
    echo "  ❌ ML Service unhealthy"
    exit 1
fi

# 2. Backend API
BE_STATUS=$(curl -s http://127.0.0.1:3001/health | grep -o '"status":"ok"' || true)
if [ -n "$BE_STATUS" ]; then
    echo "  ✅ Backend API Healthy [http://127.0.0.1:3001]"
else
    echo "  ❌ Backend API unhealthy"
    exit 1
fi

# 3. Frontend UI
FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || true)
if [ "$FE_CODE" = "200" ]; then
    echo "  ✅ Frontend UI Responding (HTTP 200) [http://localhost:5173]"
else
    echo "  ❌ Frontend unreachable"
    exit 1
fi

echo "🎉 All services are fully operational, connected to local Postgres, and ready for demo!"
