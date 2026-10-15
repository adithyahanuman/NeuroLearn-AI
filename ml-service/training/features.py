"""
ml-service/training/features.py

Feature engineering and dataset row builder for NeuroLearn AI (Section 6.2 & 17.8):
1. Fixed list of 15 features in exact order.
2. Leakage-free feature computation strictly before prediction time t.
3. Thin data handling for cold start students.
4. Cohort median computation.
5. Weekly grid training row builder with 14-day outcome label.
"""

from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timezone, timedelta
from pathlib import Path
import numpy as np
import pandas as pd

from app.services.graph import KnowledgeGraphService, get_graph_service
from app.services.twin import DigitalLearningTwin, parse_iso_dt
from app.services.features import FEATURES, cohort_median_at, features_for

def build_dataset_rows(
    attempts_df: pd.DataFrame,
    students_df: pd.DataFrame,
    graph_service: KnowledgeGraphService,
    weeks: Optional[List[int]] = None,
) -> pd.DataFrame:
    """
    Builds modeling dataset rows across weekly grid (weeks 2 to 12).
    For each (student, concept, week_t):
    - Compute features strictly using attempts before t.
    - Compute target label y: next attempt on concept within [t, t + 14 days] scores < 0.60.
    - If no attempt occurs on concept in that 14-day window, row is dropped.
    """
    if weeks is None:
        weeks = list(range(2, 13))

    # Pre-parse attempted_dt
    attempts = attempts_df.copy()
    if "attempted_dt" not in attempts.columns:
        attempts["attempted_dt"] = attempts["attempted_at"].apply(parse_iso_dt)

    min_dt = attempts["attempted_dt"].min()

    # Pre-group attempts by student for fast sequential replay
    attempts_by_student = {}
    for s_id, group in attempts.groupby("student_id"):
        attempts_by_student[s_id] = group.sort_values("attempted_dt").to_dict("records")

    students_dict = students_df.set_index("id").to_dict("index")
    concepts_list = graph_service.get_topological_order()

    rows = []

    for week_num in weeks:
        t_week = min_dt + timedelta(days=week_num * 7)

        # Precompute cohort medians at t_week
        cohort_medians = {}
        for cname in ["Cohort A", "Cohort B", "Cohort C"]:
            cohort_medians[cname] = cohort_median_at(attempts, students_df, cname, t_week)

        # 14-day outcome window boundary
        t_window_end = t_week + timedelta(days=14)

        for s_id, s_info in students_dict.items():
            cname = s_info.get("cohort", "Cohort A")
            c_med = cohort_medians.get(cname, 1.0)
            student_attempts = attempts_by_student.get(s_id, [])

            # Split student attempts: strictly before t_week vs in outcome window
            past_attempts = [a for a in student_attempts if a["attempted_dt"] <= t_week]
            future_attempts = [a for a in student_attempts if t_week < a["attempted_dt"] <= t_window_end]

            if not future_attempts:
                continue

            # Group future attempts by concept to find earliest outcome score
            next_score_by_concept = {}
            for fa in future_attempts:
                cid = int(fa["concept_id"])
                if cid not in next_score_by_concept:
                    next_score_by_concept[cid] = float(fa["score"])

            # Replay twin up to t_week
            twin = DigitalLearningTwin(student_id=s_id, graph_service=graph_service)
            twin.apply_attempts(past_attempts)

            for cid in next_score_by_concept:
                next_score = next_score_by_concept[cid]
                label = 1 if next_score < 0.60 else 0

                f_dict = features_for(
                    twin=twin,
                    concept_id=cid,
                    as_of=t_week,
                    cohort_median_7d=c_med,
                )

                row = {
                    "student_id": s_id,
                    "concept_id": cid,
                    "week": week_num,
                    "label": label,
                    **f_dict,
                }
                rows.append(row)

    df_rows = pd.DataFrame(rows)
    return df_rows

