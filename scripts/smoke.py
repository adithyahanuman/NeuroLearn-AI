#!/usr/bin/env python3
import urllib.request
import json
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_smoke_test():
    print("Running NeuroLearn AI Smoke Tests across all local services...\n")

    # 1. ML Service
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/ml/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            assert data.get("status") == "ok"
            print(f"  [PASS] ML Service Healthy (v{data.get('modelVersion')}) [http://127.0.0.1:8000/ml/health]")
    except Exception as e:
        print(f"  [FAIL] ML Service check failed: {e}")
        sys.exit(1)

    # 2. Backend API
    try:
        req = urllib.request.Request("http://127.0.0.1:3001/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            assert data.get("status") == "ok"
            print("  [PASS] Backend API Healthy [http://127.0.0.1:3001/health]")
    except Exception as e:
        print(f"  [FAIL] Backend API check failed: {e}")
        sys.exit(1)

    # 3. Auth Login & Digital Twin Query from Local PostgreSQL
    try:
        login_req = urllib.request.Request(
            "http://127.0.0.1:3001/auth/login",
            data=json.dumps({"email": "demo1@neurolearn.ai", "password": "demo"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(login_req, timeout=5) as resp:
            auth_data = json.loads(resp.read().decode())
            token = auth_data["token"]
            student_id = auth_data["user"]["studentId"]
            print(f"  [PASS] Student Auth Verified ({auth_data['user']['name']}) [JWT Issued]")

        risks_req = urllib.request.Request(
            f"http://127.0.0.1:3001/students/{student_id}/risks",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(risks_req, timeout=5) as resp:
            risks_data = json.loads(resp.read().decode())
            print(f"  [PASS] Live Digital Twin Evaluated ({len(risks_data)} concepts analyzed from local PostgreSQL)")
    except Exception as e:
        print(f"  [FAIL] Auth / Twin query failed: {e}")
        sys.exit(1)

    # 4. Frontend Web UI
    try:
        fe_req = urllib.request.Request("http://localhost:5173")
        with urllib.request.urlopen(fe_req, timeout=5) as resp:
            assert resp.status == 200
            print("  [PASS] Frontend UI Responding (HTTP 200) [http://localhost:5173]")
    except Exception as e:
        print(f"  [FAIL] Frontend check failed: {e}")
        sys.exit(1)

    print("\n[SUCCESS] All services are fully operational, connected to local Postgres, and verified!")

if __name__ == "__main__":
    run_smoke_test()
