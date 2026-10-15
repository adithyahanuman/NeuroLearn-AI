"""
ml-service/tests/test_api.py

Integration and unit tests for the NeuroLearn AI ML Service API.
Verifies:
1. Public health check (200 without auth).
2. Constant-time API key security (401 without key, 401 with wrong key).
3. Pydantic validation (422 on invalid bodies or out-of-range scores).
4. Demo Student 1: High risk on Linked Lists (C12) & Binary Trees (C21), with Arrays (C07) as root gap.
5. Demo Student 5: Cold-start novice with low confidence ratings.
6. Empty attempts history (handles cold start gracefully).
7. Startup guard failure: Service refuses to start if features.json or graph hash is invalid.
8. Granular inspection endpoints (/ml/twin/update, /ml/predict, /ml/explain, /ml/root-gap, /ml/recommend, /ml/model-info).
"""

from pathlib import Path
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.security import DEFAULT_API_KEY
from app.services.engine import MLServiceEngine

client = TestClient(app)
VALID_HEADERS = {"X-API-Key": DEFAULT_API_KEY}


@pytest.fixture(scope="module")
def attempts_df():
    data_path = Path(__file__).resolve().parent.parent.parent / "data" / "generated" / "attempts.csv"
    if not data_path.exists():
        pytest.skip(f"Data file not found at {data_path}")
    return pd.read_csv(data_path)


def test_health_endpoint_public():
    """GET /ml/health must be public and return status ok without credentials."""
    response = client.get("/ml/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["modelVersion"] == "v1"
    assert "graphHash" in data
    assert len(data["graphHash"]) == 64


def test_auth_missing_api_key():
    """Protected routes must reject requests without X-API-Key with 401 Unauthorized."""
    endpoints = [
        ("post", "/ml/analyze", {"studentId": "test", "attempts": []}),
        ("post", "/ml/twin/update", {"studentId": "test", "attempts": []}),
        ("post", "/ml/predict", {"studentId": "test", "attempts": []}),
        ("post", "/ml/explain", {"studentId": "test", "conceptId": 12, "attempts": []}),
        ("post", "/ml/root-gap", {"conceptId": 12}),
        ("post", "/ml/recommend", {"studentId": "test", "attempts": []}),
        ("get", "/ml/model-info", None),
    ]

    for method, path, body in endpoints:
        if method == "post":
            resp = client.post(path, json=body)
        else:
            resp = client.get(path)
        assert resp.status_code == 401, f"Expected 401 for {path} without key, got {resp.status_code}"


def test_auth_invalid_api_key():
    """Protected routes must reject requests with wrong X-API-Key with 401 Unauthorized."""
    bad_headers = {"X-API-Key": "incorrect-api-key-value"}
    response = client.post(
        "/ml/analyze",
        json={"studentId": "test", "attempts": []},
        headers=bad_headers,
    )
    assert response.status_code == 401
    assert "Invalid or missing X-API-Key" in response.text


def test_validation_error_422_on_bad_body():
    """Malformed request body must trigger 422 Unprocessable Entity."""
    # Invalid attempts type (not a list)
    resp = client.post(
        "/ml/analyze",
        json={"studentId": "test", "attempts": "not-a-list"},
        headers=VALID_HEADERS,
    )
    assert resp.status_code == 422

    # Score > 1.0 (violates le=1.0)
    bad_attempt = {
        "studentId": "test",
        "attempts": [
            {
                "conceptId": 12,
                "score": 1.5,
                "timeSpentSeconds": 100,
            }
        ],
    }
    resp = client.post("/ml/analyze", json=bad_attempt, headers=VALID_HEADERS)
    assert resp.status_code == 422


def test_empty_attempts_works():
    """Calling /ml/analyze with empty attempts works gracefully and provides cold start priors."""
    payload = {
        "studentId": "cold-start-student-uuid",
        "attempts": [],
        "cohortMedianAttempts": 1.0,
    }
    response = client.post("/ml/analyze", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()

    assert data["studentId"] == "cold-start-student-uuid"
    assert len(data["predictions"]) == 38
    assert "twinSummary" in data
    assert data["twinSummary"]["totalAttempts"] == 0
    assert "timings" in data
    assert "total_ms" in data["timings"]
    # Check headers injected by middleware
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time-Ms" in response.headers


def test_demo_student_1_high_risk_with_arrays_root_gap(attempts_df):
    """
    Demo Student 1 (Asha Demo - C07 Arrays bottleneck):
    Must forecast high risk on Singly Linked Lists (C12) & Binary Trees (C21),
    with Arrays and Memory Contiguity (C07) diagnosed in the root gaps and reasons.
    """
    demo1_id = "00000000-0000-0000-0000-000000000001"
    sub_df = attempts_df[attempts_df["student_id"] == demo1_id]
    assert len(sub_df) > 0

    attempts_payload = []
    for _, row in sub_df.iterrows():
        attempts_payload.append({
            "clientAttemptId": str(row.get("client_attempt_id", "")),
            "studentId": demo1_id,
            "conceptId": int(row["concept_id"]),
            "score": float(row["score"]),
            "timeSpentSeconds": int(row.get("time_spent_seconds", 60)),
            "hintsUsed": int(row.get("hints_used", 0)),
            "assessmentType": str(row.get("assessment_type", "practice")),
            "attemptedAt": str(row["attempted_at"]),
        })

    payload = {
        "studentId": demo1_id,
        "attempts": attempts_payload,
        "cohortMedianAttempts": 2.0,
    }

    response = client.post("/ml/analyze", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()

    preds_by_id = {p["conceptId"]: p for p in data["predictions"]}

    # C12: Linked Lists
    assert 12 in preds_by_id
    c12_pred = preds_by_id[12]
    assert c12_pred["band"] == "high"
    assert c12_pred["risk"] >= 0.60
    assert len(c12_pred["reasons"]) > 0

    # C21: Binary Trees
    assert 21 in preds_by_id
    c21_pred = preds_by_id[21]
    assert c21_pred["band"] == "high"
    assert c21_pred["risk"] >= 0.60

    # Check root gaps: Arrays (C07) must be diagnosed
    root_gap_names = [g["name"] for g in data["rootGaps"]]
    assert any("Arrays" in name for name in root_gap_names)

    # Check reasons mention Arrays or prerequisite weakness
    all_reasons = " ".join(c12_pred["reasons"] + c21_pred["reasons"])
    assert "Arrays" in all_reasons or "prerequisite" in all_reasons.lower() or "Prerequisite" in all_reasons


def test_demo_student_5_low_confidence(attempts_df):
    """
    Demo Student 5 (Priya Novice - Cold Start):
    Must reflect 'low' confidence across unpracticed / thin-data concepts (< 3 attempts).
    """
    demo5_id = "00000000-0000-0000-0000-000000000005"
    sub_df = attempts_df[attempts_df["student_id"] == demo5_id]

    attempts_payload = []
    for _, row in sub_df.iterrows():
        attempts_payload.append({
            "conceptId": int(row["concept_id"]),
            "score": float(row["score"]),
            "timeSpentSeconds": int(row.get("time_spent_seconds", 60)),
            "hintsUsed": int(row.get("hints_used", 0)),
            "attemptedAt": str(row["attempted_at"]),
        })

    payload = {
        "studentId": demo5_id,
        "attempts": attempts_payload,
    }

    response = client.post("/ml/analyze", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()

    # Most concepts must have confidence 'low'
    low_conf_count = sum(1 for p in data["predictions"] if p["confidence"] == "low")
    assert low_conf_count >= 30, f"Expected majority of concepts to have low confidence, got {low_conf_count}"


def test_refusal_to_start_on_bad_features_json(tmp_path):
    """Startup guard: Engine must raise RuntimeError if features.json does not match code."""
    bad_features_file = tmp_path / "bad_features.json"
    bad_features_data = {
        "features": ["corrupted_feature_1", "corrupted_feature_2"],
        "graph_hash": "d38f11d2ea416a3ecd5346a4f86d1cbf32d65e449b797c218408c6d369821810",
        "version": "v1",
    }
    bad_features_file.write_text(json.dumps(bad_features_data), encoding="utf-8")

    with pytest.raises(RuntimeError) as exc_info:
        MLServiceEngine(features_path=str(bad_features_file))

    assert "Startup validation failed" in str(exc_info.value)
    assert "features.json feature list does not match code FEATURES" in str(exc_info.value)


def test_refusal_to_start_on_bad_graph_hash(tmp_path):
    """Startup guard: Engine must raise RuntimeError if graph hash diverges."""
    features_file = tmp_path / "mismatched_hash_features.json"
    features_data = {
        "features": [
            "avg_score_last3", "avg_score_all", "score_slope_5", "attempts_count",
            "days_since_last_attempt", "time_ratio", "hints_rate", "prereq_mean_mastery",
            "prereq_min_mastery", "n_weak_prereqs", "concept_difficulty", "concept_level",
            "student_mean_mastery", "student_consistency", "student_engagement"
        ],
        "graph_hash": "0000000000000000000000000000000000000000000000000000000000000000",
        "version": "v1",
    }
    features_file.write_text(json.dumps(features_data), encoding="utf-8")

    with pytest.raises(RuntimeError) as exc_info:
        MLServiceEngine(features_path=str(features_file))

    assert "Startup validation failed" in str(exc_info.value)
    assert "graph SHA-256 mismatch" in str(exc_info.value)


def test_twin_update_endpoint():
    """POST /ml/twin/update returns full twin state summary."""
    payload = {
        "studentId": "twin-test-student",
        "attempts": [
            {"conceptId": 1, "score": 0.85, "timeSpentSeconds": 50, "hintsUsed": 0},
            {"conceptId": 2, "score": 0.90, "timeSpentSeconds": 60, "hintsUsed": 0},
        ],
    }
    response = client.post("/ml/twin/update", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "twinSummary" in data
    assert data["twinSummary"]["studentId"] == "twin-test-student"
    assert data["twinSummary"]["totalAttempts"] == 2
    assert "masteryAll" in data["twinSummary"]


def test_predict_endpoint():
    """POST /ml/predict returns raw and calibrated probabilities."""
    payload = {
        "studentId": "predict-student",
        "conceptIds": [1, 7, 12],
        "attempts": [],
    }
    response = client.post("/ml/predict", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["predictions"]) == 3
    for p in data["predictions"]:
        assert "rawProb" in p
        assert "calibratedRisk" in p
        assert "band" in p
        assert "confidence" in p


def test_explain_endpoint():
    """POST /ml/explain returns SHAP values and reasons for target concept."""
    payload = {
        "studentId": "explain-student",
        "conceptId": 12,
        "attempts": [],
    }
    response = client.post("/ml/explain", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["conceptId"] == 12
    assert "shapValues" in data
    assert len(data["shapValues"]) == 15
    assert "reasons" in data


def test_root_gap_endpoint():
    """POST /ml/root-gap returns diagnosed prerequisite bottlenecks."""
    payload = {
        "conceptId": 12,
        "masteryMap": {
            "1": 0.85, "2": 0.90, "3": 0.88, "4": 0.85, "5": 0.80, "6": 0.82,
            "7": 0.25,  # Weak Arrays
            "12": 0.30, # Target Singly Linked Lists
        },
    }
    response = client.post("/ml/root-gap", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["conceptId"] == 12
    assert len(data["rootGaps"]) > 0
    assert data["rootGaps"][0]["rootGapId"] == 7


def test_recommend_endpoint():
    """POST /ml/recommend returns recommendation structure."""
    payload = {
        "studentId": "recommend-student",
        "attempts": [],
    }
    response = client.post("/ml/recommend", json=payload, headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["studentId"] == "recommend-student"
    assert "generatedAt" in data
    assert isinstance(data["path"], list)


def test_model_info_endpoint():
    """GET /ml/model-info returns features, threshold, and metrics."""
    response = client.get("/ml/model-info", headers=VALID_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["features"]) == 15
    assert data["version"] == "v1"
    assert data["threshold"] == 0.50
    assert "metrics" in data
