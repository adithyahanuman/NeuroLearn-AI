"""
ml-service/app/services/features.py

Shared Feature Engineering and Feature Extraction Engine for NeuroLearn AI (Section 6.2 & Section 17.8).
Single source of truth shared by model training, offline evaluation, and live FastAPI serving.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd

from app.services.graph import KnowledgeGraphService
from app.services.twin import DigitalLearningTwin, parse_iso_dt

FEATURES: List[str] = [
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


def cohort_median_at(
    attempts_df: pd.DataFrame,
    students_df: pd.DataFrame,
    cohort_name: str,
    as_of: datetime,
) -> float:
    """
    Computes median of 7-day attempt counts across ALL students in cohort
    (including students with 0 attempts) strictly before as_of.
    Median floored at 1.0 (Section 17.8).
    """
    cohort_students = students_df[students_df["cohort"] == cohort_name]["id"].tolist()
    if not cohort_students:
        return 1.0

    w_start = as_of - timedelta(days=7)

    # Filter attempts strictly before as_of and within 7-day window
    mask = (
        (attempts_df["student_id"].isin(cohort_students))
        & (attempts_df["attempted_dt"] >= w_start)
        & (attempts_df["attempted_dt"] <= as_of)
    )
    counts = attempts_df[mask].groupby("student_id").size().to_dict()

    all_counts = [counts.get(s_id, 0) for s_id in cohort_students]
    med = float(np.median(all_counts)) if all_counts else 1.0
    return max(1.0, med)


def features_for(
    twin: DigitalLearningTwin,
    concept_id: int,
    as_of: datetime,
    cohort_median_7d: float = 1.0,
    concept_info: Optional[Dict[str, Any]] = None,
    impute_missing_for_linear: bool = False,
) -> Dict[str, float]:
    """
    Extracts the 15 features for a given student's twin state and target concept
    strictly evaluated as of `as_of`.

    Follows Section 17.8 Thin Data Rules:
    - consistency: < 3 attempts => 0.5
    - velocity: < 3 attempts => 0.0
    - score_slope_5: < 3 scores => np.nan (or 0.0 if impute_missing_for_linear)
    - avg_score_last3, avg_score_all: no attempts => concept prior
    - time_ratio: no attempts => 1.0, typical time floored at 1s
    - hints_rate: no attempts => 0.0
    - engagement: cohort median floored at 1.0
    - days_since_last_attempt: no attempts => 60.0, attempts_count 0
    """
    as_of = parse_iso_dt(as_of)
    cid = int(concept_id)
    graph = twin.graph

    if concept_info is None:
        concept_info = graph.nodes_by_id.get(cid, {"difficulty": 3, "level": 1})

    difficulty = int(concept_info.get("difficulty", 3))
    level = int(concept_info.get("level", 1))
    prior = twin.get_concept_prior(cid)

    # Historical attempts on this concept
    scores = twin.scores_history.get(cid, [])
    count = twin.attempt_counts.get(cid, 0)

    # 1. avg_score_last3
    if count == 0:
        avg_score_last3 = prior
    else:
        avg_score_last3 = float(np.mean(scores[-3:]))

    # 2. avg_score_all
    if count == 0:
        avg_score_all = prior
    else:
        avg_score_all = float(np.mean(scores))

    # 3. score_slope_5
    if len(scores) < 3:
        score_slope_5 = 0.0 if impute_missing_for_linear else np.nan
    else:
        recent = scores[-5:]
        n = len(recent)
        slope, _ = np.polyfit(np.arange(n), recent, 1)
        score_slope_5 = float(slope)

    # 4. attempts_count
    attempts_count = float(count)

    # 5. days_since_last_attempt
    if count == 0 or cid not in twin.last_attempt_dt:
        days_since_last_attempt = 60.0
    else:
        delta = (as_of - twin.last_attempt_dt[cid]).total_seconds() / 86400.0
        days_since_last_attempt = max(0.0, float(delta))

    # 6. time_ratio (time spent vs base time)
    base_time = max(1.0, float(difficulty * 45))
    if count == 0:
        time_ratio = 1.0
    else:
        m_curr = twin.get_effective_mastery(cid, as_of)
        est_time = base_time * (1.6 - m_curr)
        time_ratio = float(est_time / base_time)

    # 7. hints_rate
    if count == 0:
        hints_rate = 0.0
    else:
        m_curr = twin.get_effective_mastery(cid, as_of)
        hints_rate = float(max(0.0, 3.0 * (1.0 - m_curr)))

    # 8. prereq_mean_mastery
    parents = graph.get_parents(cid)
    if not parents:
        prereq_mean_mastery = prior
    else:
        p_masteries = [twin.get_effective_mastery(p, as_of) for p in parents]
        prereq_mean_mastery = float(np.mean(p_masteries))

    # 9. prereq_min_mastery
    ancestors = graph.get_ancestors(cid)
    if not ancestors:
        prereq_min_mastery = prior
    else:
        anc_masteries = [twin.get_effective_mastery(a, as_of) for a in ancestors]
        prereq_min_mastery = float(np.min(anc_masteries))

    # 10. n_weak_prereqs
    if not ancestors:
        n_weak_prereqs = 0.0
    else:
        n_weak_prereqs = float(sum(1 for a in ancestors if twin.get_effective_mastery(a, as_of) < 0.60))

    # 11 & 12. concept_difficulty & concept_level
    concept_difficulty = float(difficulty)
    concept_level = float(level)

    # 13. student_mean_mastery across all 38 concepts
    all_cids = graph.get_topological_order()
    all_masteries = [twin.get_effective_mastery(c, as_of) for c in all_cids]
    student_mean_mastery = float(np.mean(all_masteries))

    # 14. student_consistency
    student_consistency = twin.compute_consistency()

    # 15. student_engagement
    student_engagement = twin.compute_engagement(as_of, cohort_median_7d)

    return {
        "avg_score_last3": round(avg_score_last3, 4),
        "avg_score_all": round(avg_score_all, 4),
        "score_slope_5": round(score_slope_5, 4) if not np.isnan(score_slope_5) else np.nan,
        "attempts_count": round(attempts_count, 4),
        "days_since_last_attempt": round(days_since_last_attempt, 4),
        "time_ratio": round(time_ratio, 4),
        "hints_rate": round(hints_rate, 4),
        "prereq_mean_mastery": round(prereq_mean_mastery, 4),
        "prereq_min_mastery": round(prereq_min_mastery, 4),
        "n_weak_prereqs": round(n_weak_prereqs, 4),
        "concept_difficulty": round(concept_difficulty, 4),
        "concept_level": round(concept_level, 4),
        "student_mean_mastery": round(student_mean_mastery, 4),
        "student_consistency": round(student_consistency, 4),
        "student_engagement": round(student_engagement, 4),
    }
