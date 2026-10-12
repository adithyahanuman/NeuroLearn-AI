#!/usr/bin/env python3
"""
ml-service/training/generate_data.py

Synthetic Data Generator for NeuroLearn AI (Section 6.1 & Section 17.8):
- Seed 42 for perfect determinism.
- 300 students across 3 cohorts (Cohort A, Cohort B, Cohort C).
- 38 concepts, 14 simulated weeks (98 days) leading up to 2026-10-12 12:00 UTC.
  (Ensures all 12 prediction weeks, including weeks 11 and 12, have their complete 14-day outcome window).
- Latent ability theta ~ N(0, 1), engagement style ~ Beta(2, 2).
- Profiles: normal, dropoff, crammer, cold start.
- Mastery dynamics with prerequisite readiness and forgetting (0.5% per day).
- 25% students have a hidden blocked root gap (level 2 or 3), recorded in ground_truth.csv.
- 5 scripted demo students:
  1. Demo 1: Hidden root gap in Arrays (C07), poor scores in Linked Lists (C12) & Trees (C21).
  2. Demo 2: Steady strong student, high mastery across the board.
  3. Demo 3: Strong initially, sudden drop after week 9 (dropoff).
  4. Demo 4: Cramming pattern, irregular bursts, low consistency.
  5. Demo 5: New student with exactly 2 attempts (cold start).
Outputs:
- data/generated/students.csv
- data/generated/attempts.csv
- data/generated/ground_truth.csv
- data/generated/true_mastery.json
"""

import os
import sys
import json
import uuid
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(x, 15.0), -15.0)))

def practice_prob(profile: str, day: int, style: float = 0.5) -> float:
    """Returns probability of practicing on a given day based on profile."""
    if profile in ["demo3_dropoff", "dropoff"]:
        return 0.15 if day >= 63 else (0.50 + 0.35 * style)
    elif profile in ["demo4_crammer", "crammer"]:
        return 0.85 if (day % 7 in [0, 1]) else 0.15
    elif profile == "demo2_strong":
        return 0.85
    elif profile == "demo5_cold_start":
        return 0.0
    else:  # normal
        return 0.40 + 0.45 * style

def pick_concept(
    available_concepts: List[int],
    attempt_counts: Dict[int, int],
    true_mastery: Dict[int, float],
    syllabus_order: List[int],
) -> int:
    """75% syllabus order / unmastered, 25% random, at most 20 attempts per concept."""
    valid_cands = [c for c in available_concepts if attempt_counts.get(c, 0) < 20]
    if not valid_cands:
        valid_cands = available_concepts
        if not valid_cands:
            return syllabus_order[0]

    if random.random() < 0.75:
        # In syllabus order, prefer unmastered concepts (< 0.75)
        for cand in syllabus_order:
            if cand in valid_cands and true_mastery.get(cand, 0.20) < 0.75:
                return cand
        return valid_cands[0]
    else:
        return random.choice(valid_cands)

def simulate_attempt(
    concept_id: int,
    true_mastery_val: float,
    concept_info: Dict[str, Any],
    blocked_concept_id: Optional[int],
    profile: str,
) -> Tuple[float, int, int, str]:
    """Simulates attempt score, time spent, hints used, and assessment type."""
    diff = int(concept_info["difficulty"])
    noise = float(np.random.normal(0.0, 0.07))
    score = float(np.clip(true_mastery_val + noise - 0.02 * (diff - 3) + 0.14, 0.0, 1.0))

    if profile == "demo1_arrays_gap":
        if concept_id in [1, 2, 3, 4, 5, 6]:
            score = max(score, float(np.random.uniform(0.75, 0.95)))
        elif concept_id in [7, 12, 21, 22]:
            score = min(score, float(np.random.uniform(0.20, 0.45)))
    elif blocked_concept_id == 7 and concept_id in [7, 12, 21, 22]:
        score = min(score, float(np.random.uniform(0.20, 0.48)))

    base_time = diff * 45
    time_spent = int(max(20, base_time * (1.6 - true_mastery_val) * np.random.lognormal(0.0, 0.2)))
    hints_used = min(5, int(np.random.poisson(max(0.1, 3.0 * (1.0 - true_mastery_val)))))

    r_type = random.random()
    if r_type < 0.65:
        atype = "practice"
    elif r_type < 0.85:
        atype = "quiz"
    else:
        atype = "assignment"

    return round(score, 3), time_spent, hints_used, atype

def generate_dataset(data_dir: Path, output_dir: Path, seed: int = 42) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    random.seed(seed)
    np.random.seed(seed)

    output_dir.mkdir(parents=True, exist_ok=True)

    with open(data_dir / "concepts.json", "r", encoding="utf-8") as f:
        concepts = json.load(f)
    with open(data_dir / "prerequisites.json", "r", encoding="utf-8") as f:
        prerequisites = json.load(f)

    concepts_by_id = {c["id"]: c for c in concepts}
    parents_by_id = {c["id"]: [] for c in concepts}
    for p in prerequisites:
        parents_by_id[p["concept_id"]].append(p["requires_id"])

    # Syllabus order is concepts sorted by level then id
    syllabus_order = [c["id"] for c in sorted(concepts, key=lambda x: (x["level"], x["id"]))]
    level1_concepts = [c["id"] for c in concepts if c["level"] == 1]

    # 14 simulated weeks (98 days) leading up to 2026-10-12 12:00 UTC
    end_time = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
    start_time = end_time - timedelta(days=98)

    cohort_names = ["Cohort A", "Cohort B", "Cohort C"]

    students = []
    attempts = []
    ground_truth = []
    student_final_mastery: Dict[str, Dict[str, float]] = {}

    demo_specs = [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Asha Demo",
            "email": "demo1@neurolearn.ai",
            "cohort": "Cohort A",
            "is_demo": True,
            "profile": "demo1_arrays_gap",
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "name": "Steady Rahul",
            "email": "demo2@neurolearn.ai",
            "cohort": "Cohort A",
            "is_demo": True,
            "profile": "demo2_strong",
        },
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "Kiran Dropoff",
            "email": "demo3@neurolearn.ai",
            "cohort": "Cohort B",
            "is_demo": True,
            "profile": "demo3_dropoff",
        },
        {
            "id": "00000000-0000-0000-0000-000000000004",
            "name": "Dev Crammer",
            "email": "demo4@neurolearn.ai",
            "cohort": "Cohort B",
            "is_demo": True,
            "profile": "demo4_crammer",
        },
        {
            "id": "00000000-0000-0000-0000-000000000005",
            "name": "Priya Novice",
            "email": "demo5@neurolearn.ai",
            "cohort": "Cohort C",
            "is_demo": True,
            "profile": "demo5_cold_start",
        },
    ]

    for ds in demo_specs:
        students.append({
            "id": ds["id"],
            "name": ds["name"],
            "email": ds["email"],
            "cohort": ds["cohort"],
            "is_demo": True,
            "profile": ds["profile"],
        })

    for i in range(6, 301):
        s_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"neurolearn-student-{i}"))
        cohort = cohort_names[i % 3]
        email = f"student{i:03d}@demo.neurolearn.test"
        name = f"Student {i:03d}"
        prof = "dropoff" if i % 15 == 0 else ("crammer" if i % 12 == 0 else "normal")
        students.append({
            "id": s_uuid,
            "name": name,
            "email": email,
            "cohort": cohort,
            "is_demo": False,
            "profile": prof,
        })

    hidden_gap_candidates = [7, 8, 9, 10, 11, 12, 13, 14, 15]

    for idx, s in enumerate(students):
        s_id = s["id"]
        is_demo = s["is_demo"]
        profile = s.get("profile", "normal")

        blocked_concept_id = None
        if idx == 0:  # Demo 1: Arrays (7)
            blocked_concept_id = 7
            ground_truth.append({
                "student_id": s_id,
                "root_gap_concept_id": 7,
                "root_gap_code": "C07",
                "root_gap_name": "Arrays and Memory Contiguity",
            })
        elif not is_demo and (idx % 4 == 0):
            blocked_concept_id = random.choice(hidden_gap_candidates)
            c_info = concepts_by_id[blocked_concept_id]
            ground_truth.append({
                "student_id": s_id,
                "root_gap_concept_id": blocked_concept_id,
                "root_gap_code": c_info["code"],
                "root_gap_name": c_info["name"],
            })

        # Latent ability theta ~ N(0, 1), style ~ Beta(2, 2)
        theta = float(np.random.normal(0.0, 1.0))
        style = float(np.random.beta(2.0, 2.0))
        if profile == "demo2_strong":
            theta = 1.8
        elif profile == "demo1_arrays_gap":
            theta = 0.2

        learn_rate = 0.12 + 0.25 * sigmoid(theta)

        true_mastery: Dict[int, float] = {}
        last_attempt_day: Dict[int, int] = {}
        attempt_counts: Dict[int, int] = {}
        for cid in syllabus_order:
            parents = parents_by_id[cid]
            true_mastery[cid] = 0.50 if not parents else 0.35
            last_attempt_day[cid] = 0
            attempt_counts[cid] = 0

        if blocked_concept_id is not None:
            true_mastery[blocked_concept_id] = 0.15

        # Demo 5: Exactly two attempts
        if profile == "demo5_cold_start":
            t1 = end_time - timedelta(days=2, hours=4)
            t2 = end_time - timedelta(days=1, hours=2)
            att_id1 = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-att-0"))
            cli_id1 = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-cli-0"))
            att_id2 = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-att-1"))
            cli_id2 = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-cli-1"))
            attempts.append({
                "id": att_id1,
                "student_id": s_id,
                "concept_id": 1,
                "score": 0.750,
                "time_spent_sec": 120,
                "hints_used": 1,
                "assessment_type": "practice",
                "attempted_at": t1.isoformat(),
                "client_attempt_id": cli_id1,
            })
            attempts.append({
                "id": att_id2,
                "student_id": s_id,
                "concept_id": 2,
                "score": 0.700,
                "time_spent_sec": 140,
                "hints_used": 0,
                "assessment_type": "quiz",
                "attempted_at": t2.isoformat(),
                "client_attempt_id": cli_id2,
            })
            student_final_mastery[s_id] = {str(k): round(v, 4) for k, v in true_mastery.items()}
            continue

        # Active concept pool begins with Level 1
        unlocked = list(level1_concepts)
        if profile == "demo1_arrays_gap":
            unlocked = [1, 2, 3, 4, 5, 6, 7, 12, 21, 22]

        att_counter = 0
        for day in range(98):
            # Syllabus unlocking as semester progresses
            if profile != "demo1_arrays_gap":
                prog_idx = min(len(syllabus_order), int((day / 98.0) * len(syllabus_order)) + 4)
                for cand in syllabus_order[:prog_idx]:
                    if cand not in unlocked:
                        parents = parents_by_id[cand]
                        if not parents or all(true_mastery.get(p, 0.2) >= 0.50 or attempt_counts.get(p, 0) >= 3 for p in parents):
                            unlocked.append(cand)

            p_pract = practice_prob(profile, day, style)
            if random.random() > p_pract:
                continue

            n_sessions = random.randint(1, 3)
            for _ in range(n_sessions):
                if profile == "demo1_arrays_gap":
                    r_pick = random.random()
                    if r_pick < 0.35:
                        pick = random.choice([1, 2, 3, 4, 5, 6])
                    elif r_pick < 0.65:
                        pick = 7  # Arrays
                    elif r_pick < 0.85:
                        pick = 12  # Linked Lists
                    else:
                        pick = 21  # Binary Trees
                else:
                    pick = pick_concept(unlocked, attempt_counts, true_mastery, syllabus_order)

                # Forgetting
                days_passed = max(0, day - last_attempt_day[pick])
                if days_passed > 0:
                    true_mastery[pick] *= math.exp(-0.005 * days_passed)
                last_attempt_day[pick] = day

                # Readiness
                parents = parents_by_id[pick]
                if parents:
                    readiness = float(np.clip(np.mean([true_mastery[p] for p in parents]), 0.20, 1.00))
                else:
                    readiness = 1.00

                # Learning step
                if pick == blocked_concept_id:
                    true_mastery[pick] = min(0.20, true_mastery[pick] + 0.005 * readiness * (1.0 - true_mastery[pick]))
                else:
                    if profile == "demo1_arrays_gap" and pick in [1, 2, 3, 4, 5, 6]:
                        true_mastery[pick] = min(0.95, true_mastery[pick] + 0.08 * (1.0 - true_mastery[pick]))
                    else:
                        true_mastery[pick] = float(np.clip(
                            true_mastery[pick] + learn_rate * readiness * (1.0 - true_mastery[pick]),
                            0.05, 0.99
                        ))

                score, time_spent, hints_used, atype = simulate_attempt(
                    pick, true_mastery[pick], concepts_by_id[pick], blocked_concept_id, profile
                )

                attempt_dt = start_time + timedelta(
                    days=day,
                    hours=random.randint(8, 22),
                    minutes=random.randint(0, 59),
                    seconds=random.randint(0, 59),
                )

                attempts.append({
                    "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-att-{att_counter}")),
                    "student_id": s_id,
                    "concept_id": pick,
                    "score": round(score, 3),
                    "time_spent_sec": time_spent,
                    "hints_used": hints_used,
                    "assessment_type": atype,
                    "attempted_at": attempt_dt.isoformat(),
                    "client_attempt_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{s_id}-cli-{att_counter}")),
                })
                attempt_counts[pick] += 1
                att_counter += 1

        student_final_mastery[s_id] = {str(k): round(v, 4) for k, v in true_mastery.items()}

    # Clean student dataframe (drop internal profile column)
    clean_students = [
        {
            "id": s["id"],
            "name": s["name"],
            "email": s["email"],
            "cohort": s["cohort"],
            "is_demo": s["is_demo"],
        }
        for s in students
    ]

    df_students = pd.DataFrame(clean_students)
    df_attempts = pd.DataFrame(attempts)
    df_ground_truth = pd.DataFrame(ground_truth)

    df_students.to_csv(output_dir / "students.csv", index=False)
    df_attempts.to_csv(output_dir / "attempts.csv", index=False)
    df_ground_truth.to_csv(output_dir / "ground_truth.csv", index=False)

    with open(output_dir / "true_mastery.json", "w", encoding="utf-8") as f:
        json.dump(student_final_mastery, f, indent=2)

    return df_students, df_attempts, df_ground_truth

if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    data_dir = repo_root / "data"
    output_dir = data_dir / "generated"

    print("Generating synthetic dataset (seed=42)...")
    students_df, attempts_df, gt_df = generate_dataset(data_dir, output_dir, seed=42)

    print(f"Generated {len(students_df)} students")
    print(f"Generated {len(attempts_df)} attempts")
    print(f"Generated {len(gt_df)} ground truth root gap records")
