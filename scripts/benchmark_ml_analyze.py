"""
scripts/benchmark_ml_analyze.py

Benchmark latency of /ml/analyze over 20 sequential calls on realistic student data (Demo 1).
Validates that p95 latency is strictly under 600 ms.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml-service"))

import time
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.security import DEFAULT_API_KEY


def run_benchmark():
    client = TestClient(app)
    headers = {"X-API-Key": DEFAULT_API_KEY}

    # Load Demo 1 attempts
    data_path = Path(__file__).resolve().parent.parent / "data" / "generated" / "attempts.csv"
    df = pd.read_csv(data_path)
    demo1_df = df[df["student_id"] == "00000000-0000-0000-0000-000000000001"]

    attempts_payload = []
    for _, row in demo1_df.iterrows():
        attempts_payload.append({
            "clientAttemptId": str(row.get("client_attempt_id", "")),
            "studentId": "00000000-0000-0000-0000-000000000001",
            "conceptId": int(row["concept_id"]),
            "score": float(row["score"]),
            "timeSpentSeconds": int(row.get("time_spent_seconds", 60)),
            "hintsUsed": int(row.get("hints_used", 0)),
            "assessmentType": str(row.get("assessment_type", "practice")),
            "attemptedAt": str(row["attempted_at"]),
        })

    payload = {
        "studentId": "00000000-0000-0000-0000-000000000001",
        "attempts": attempts_payload,
        "cohortMedianAttempts": 2.0,
    }

    # Warmup
    print("Warming up /ml/analyze...")
    client.post("/ml/analyze", json=payload, headers=headers)

    # 20 benchmark calls
    print("Executing 20 benchmark calls...")
    latencies = []
    server_timings = []

    for i in range(20):
        t0 = time.perf_counter()
        resp = client.post("/ml/analyze", json=payload, headers=headers)
        dt = (time.perf_counter() - t0) * 1000.0
        assert resp.status_code == 200
        latencies.append(dt)
        data = resp.json()
        server_timings.append(data["timings"]["total_ms"])

    latencies = np.array(latencies)
    server_timings = np.array(server_timings)

    p50 = float(np.percentile(latencies, 50))
    p90 = float(np.percentile(latencies, 90))
    p95 = float(np.percentile(latencies, 95))
    p99 = float(np.percentile(latencies, 99))
    mean = float(np.mean(latencies))

    print("\n" + "=" * 55)
    print("BENCHMARK RESULTS: POST /ml/analyze (20 calls, 134 attempts)")
    print("=" * 55)
    print(f"Mean Latency:       {mean:.2f} ms")
    print(f"p50 (Median):       {p50:.2f} ms")
    print(f"p90:                {p90:.2f} ms")
    print(f"p95:                {p95:.2f} ms  (Target: < 600 ms)")
    print(f"p99:                {p99:.2f} ms")
    print(f"Min:                {latencies.min():.2f} ms")
    print(f"Max:                {latencies.max():.2f} ms")
    print(f"Internal total_ms:  {server_timings.mean():.2f} ms")
    print("=" * 55)

    if p95 < 600.0:
        print("[SUCCESS] p95 latency is strictly under 600 ms target!")
    else:
        print("[FAILURE] p95 latency exceeded 600 ms target!")

    return p95 < 600.0


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml-service"))
    success = run_benchmark()
    sys.exit(0 if success else 1)
