"""
ml-service/tests/test_features.py

Unit tests for feature engineering, thin data rules, and leakage prevention (Section 17.8 & Section 6.2).
"""

from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
import pytest

from app.services.graph import KnowledgeGraphService, get_graph_service
from app.services.twin import DigitalLearningTwin
from training.features import FEATURES, features_for, cohort_median_at, build_dataset_rows

@pytest.fixture
def graph():
    return get_graph_service()

def test_features_list():
    assert len(FEATURES) == 15
    assert FEATURES == [
        "avg_score_last3",
        "avg_score_all",
        "score_slope_5",
        "attempts_count",
        "days_since_last_attempt",
        "time_ratio",
        "hints_rate",
        "prereq_mean_mastery",
        "prereq_min_mastery",
        "n_weak_prereqs",
        "concept_difficulty",
        "concept_level",
        "student_mean_mastery",
        "student_consistency",
        "student_engagement",
    ]

def test_thin_data_rules_zero_attempts(graph):
    """A cold-start student with 0 attempts must adhere to Section 17.8 thin data defaults."""
    twin = DigitalLearningTwin(student_id="cold-student", graph_service=graph)
    as_of = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    cid = 1  # Big-O Notation

    f = features_for(twin, cid, as_of=as_of, cohort_median_7d=2.0)

    # Thin data assertions
    assert f["attempts_count"] == 0.0
    assert f["days_since_last_attempt"] == 60.0
    assert f["time_ratio"] == 1.0
    assert f["hints_rate"] == 0.0
    assert f["student_consistency"] == 0.5
    assert np.isnan(f["score_slope_5"])

    # Prior defaults
    prior = twin.get_concept_prior(cid)
    assert f["avg_score_last3"] == round(prior, 4)
    assert f["avg_score_all"] == round(prior, 4)

    # Impute missing for linear models returns finite float
    f_linear = features_for(twin, cid, as_of=as_of, cohort_median_7d=2.0, impute_missing_for_linear=True)
    assert f_linear["score_slope_5"] == 0.0
    for name, val in f_linear.items():
        assert np.isfinite(val), f"Feature {name} is not finite: {val}"

def test_thin_data_rules_less_than_three_attempts(graph):
    """Students with < 3 attempts have score_slope_5 = NaN and consistency = 0.5."""
    twin = DigitalLearningTwin(student_id="student-few", graph_service=graph)
    base_dt = datetime(2026, 3, 1, 10, 0, tzinfo=timezone.utc)

    # Add 2 attempts on concept 1
    attempts = [
        {"concept_id": 1, "score": 0.8, "attempted_dt": base_dt + timedelta(hours=1)},
        {"concept_id": 1, "score": 0.85, "attempted_dt": base_dt + timedelta(hours=2)},
    ]
    twin.apply_attempts(attempts)

    as_of = base_dt + timedelta(hours=3)
    f = features_for(twin, concept_id=1, as_of=as_of, cohort_median_7d=2.0)

    assert f["attempts_count"] == 2.0
    assert np.isnan(f["score_slope_5"])
    assert f["student_consistency"] == 0.5

def test_score_slope_with_three_or_more_attempts(graph):
    """With >= 3 attempts, score slope is computed and finite."""
    twin = DigitalLearningTwin(student_id="student-prog", graph_service=graph)
    base_dt = datetime(2026, 3, 1, 10, 0, tzinfo=timezone.utc)

    # Progressively increasing scores: 0.5, 0.7, 0.9
    attempts = [
        {"concept_id": 1, "score": 0.5, "attempted_dt": base_dt + timedelta(hours=1)},
        {"concept_id": 1, "score": 0.7, "attempted_dt": base_dt + timedelta(hours=2)},
        {"concept_id": 1, "score": 0.9, "attempted_dt": base_dt + timedelta(hours=3)},
    ]
    twin.apply_attempts(attempts)

    as_of = base_dt + timedelta(hours=4)
    f = features_for(twin, concept_id=1, as_of=as_of, cohort_median_7d=2.0)

    assert f["attempts_count"] == 3.0
    assert not np.isnan(f["score_slope_5"])
    assert f["score_slope_5"] > 0.1  # Positive slope

def test_cohort_median_at_window_and_floor():
    """cohort_median_at filters strictly to [as_of - 7d, as_of], includes 0-attempt students, floors at 1.0."""
    students_df = pd.DataFrame([
        {"id": "s1", "cohort": "Cohort A"},
        {"id": "s2", "cohort": "Cohort A"},
        {"id": "s3", "cohort": "Cohort A"},
        {"id": "s4", "cohort": "Cohort B"},
    ])

    base_dt = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)
    attempts_df = pd.DataFrame([
        # Within window [March 3, March 10]
        {"student_id": "s1", "attempted_dt": base_dt - timedelta(days=2)},
        {"student_id": "s1", "attempted_dt": base_dt - timedelta(days=1)},
        {"student_id": "s2", "attempted_dt": base_dt - timedelta(days=4)},
        # s3 has 0 attempts in window -> counts: s1=2, s2=1, s3=0. Median = 1.0
        # Outside window (older than 7 days)
        {"student_id": "s3", "attempted_dt": base_dt - timedelta(days=10)},
        # Future attempt (after as_of) - MUST be excluded
        {"student_id": "s1", "attempted_dt": base_dt + timedelta(days=1)},
    ])

    med = cohort_median_at(attempts_df, students_df, cohort_name="Cohort A", as_of=base_dt)
    assert med == 1.0

    # If s2 and s3 have more attempts: s1=2, s2=5, s3=4 -> median = 4.0
    attempts_df2 = pd.concat([
        attempts_df,
        pd.DataFrame([
            {"student_id": "s2", "attempted_dt": base_dt - timedelta(days=3)},
            {"student_id": "s2", "attempted_dt": base_dt - timedelta(days=2)},
            {"student_id": "s2", "attempted_dt": base_dt - timedelta(days=1)},
            {"student_id": "s2", "attempted_dt": base_dt - timedelta(days=1)},
            {"student_id": "s3", "attempted_dt": base_dt - timedelta(days=3)},
            {"student_id": "s3", "attempted_dt": base_dt - timedelta(days=2)},
            {"student_id": "s3", "attempted_dt": base_dt - timedelta(days=2)},
            {"student_id": "s3", "attempted_dt": base_dt - timedelta(days=1)},
        ])
    ], ignore_index=True)

    med2 = cohort_median_at(attempts_df2, students_df, cohort_name="Cohort A", as_of=base_dt)
    assert med2 == 4.0

def test_leakage_future_attempts_do_not_change_past_features(graph):
    """
    Leakage test: appending future attempts to student or cohort MUST NOT alter past feature values.
    """
    students_df = pd.DataFrame([
        {"id": "s1", "cohort": "Cohort A"},
        {"id": "s2", "cohort": "Cohort A"},
    ])

    t_eval = datetime(2026, 3, 15, 0, 0, tzinfo=timezone.utc)

    # Initial attempts before t_eval
    past_attempts = [
        {"student_id": "s1", "concept_id": 1, "score": 0.75, "attempted_dt": t_eval - timedelta(days=5)},
        {"student_id": "s1", "concept_id": 1, "score": 0.80, "attempted_dt": t_eval - timedelta(days=2)},
        {"student_id": "s2", "concept_id": 1, "score": 0.60, "attempted_dt": t_eval - timedelta(days=3)},
    ]
    df_attempts_past = pd.DataFrame(past_attempts)

    # Cohort median and twin features at t_eval
    c_med_1 = cohort_median_at(df_attempts_past, students_df, "Cohort A", t_eval)
    twin1 = DigitalLearningTwin("s1", graph_service=graph)
    twin1.apply_attempts([a for a in past_attempts if a["student_id"] == "s1"])
    f1 = features_for(twin1, concept_id=1, as_of=t_eval, cohort_median_7d=c_med_1)

    # Now add future attempts AFTER t_eval
    future_attempts = [
        {"student_id": "s1", "concept_id": 1, "score": 0.20, "attempted_dt": t_eval + timedelta(days=1)},
        {"student_id": "s1", "concept_id": 2, "score": 0.10, "attempted_dt": t_eval + timedelta(days=3)},
        {"student_id": "s2", "concept_id": 1, "score": 0.99, "attempted_dt": t_eval + timedelta(days=2)},
    ]
    df_attempts_all = pd.concat([df_attempts_past, pd.DataFrame(future_attempts)], ignore_index=True)

    # Recompute at t_eval strictly filtering to <= t_eval
    c_med_2 = cohort_median_at(df_attempts_all, students_df, "Cohort A", t_eval)
    twin2 = DigitalLearningTwin("s1", graph_service=graph)
    s1_past_only = [a for a in df_attempts_all.to_dict("records") if a["student_id"] == "s1" and a["attempted_dt"] <= t_eval]
    twin2.apply_attempts(s1_past_only)
    f2 = features_for(twin2, concept_id=1, as_of=t_eval, cohort_median_7d=c_med_2)

    assert c_med_1 == c_med_2
    for k in FEATURES:
        if np.isnan(f1[k]):
            assert np.isnan(f2[k])
        else:
            assert f1[k] == f2[k], f"Feature {k} changed after future data was introduced!"
