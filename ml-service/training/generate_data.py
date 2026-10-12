#!/usr/bin/env python3
"""
ml-service/training/generate_data.py

Synthetic Data Generator for NeuroLearn AI (Section 6.1):
- Seed 42 for perfect determinism.
- 300 students across 3 cohorts (Cohort A, Cohort B, Cohort C).
- 38 concepts, 12 simulated weeks.
- Latent ability theta ~ N(0, 1), engagement style ~ Beta(2, 2).
- Mastery dynamics with prerequisite readiness and forgetting.
- 25% students have a hidden blocked root gap (level 2 or 3).
- 5 scripted demo students:
  1. Demo 1: Hidden root gap in Arrays (C07), poor scores in Linked Lists (C12) & Trees (C21/C22).
  2. Demo 2: Steady strong student, high mastery across the board.
  3. Demo 3: Strong initially, sudden drop in weeks 10-12.
  4. Demo 4: Cramming pattern, irregular bursts, low consistency.
  5. Demo 5: New student with exactly 2 attempts (cold start).
Outputs:
- data/generated/students.csv
- data/generated/attempts.csv
- data/generated/ground_truth.csv
"""

import os
import sys
import json
import uuid
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import pandas as pd

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(x, 15.0), -15.0)))

def generate_dataset(data_dir: Path, output_dir: Path, seed: int = 42):
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

    # Simulation time parameters
    # 12 simulated weeks leading up to 2026-10-12
    end_time = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
    start_time = end_time - timedelta(days=84)

    cohort_names = ["Cohort A", "Cohort B", "Cohort C"]

    students = []
    attempts = []
    ground_truth = []

    # 1. Generate 5 Scripted Demo Students
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
        })

    # 2. Generate remaining 295 synthetic students
    for i in range(6, 301):
        s_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"neurolearn-student-{i}"))
        cohort = cohort_names[i % 3]
        email = f"student{i:03d}@demo.neurolearn.test"
        name = f"Student {i:03d}"
        students.append({
            "id": s_uuid,
            "name": name,
            "email": email,
            "cohort": cohort,
            "is_demo": False,
        })

    # Ground truth mapping for 25% hidden gap
    # Select ~75 students to have hidden gaps
    hidden_gap_candidates = [7, 8, 9, 10, 11, 12, 13, 14, 15]

    for idx, s in enumerate(students):
        s_id = s["id"]
        is_demo = s["is_demo"]

        # Hidden gap assignment
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

        # Ability and engagement parameters
        theta = float(np.random.normal(0.0, 1.0))
        if idx == 1:  # Demo 2 strong
            theta = 1.8
        elif idx == 0:  # Demo 1
            theta = 0.2

        learn_rate = sigmoid(theta) * 0.25

        # Initialize true masteries
        true_mastery = {}
        last_attempt_day = {}
        for cid in syllabus_order:
            parents = parents_by_id[cid]
            if not parents:
                true_mastery[cid] = 0.40
            else:
                true_mastery[cid] = 0.20
            last_attempt_day[cid] = 0

        if blocked_concept_id is not None:
            true_mastery[blocked_concept_id] = 0.15

        # Demo 5: Exactly two attempts
        if idx == 4:
            # 2 practice attempts on Level 1
            t1 = end_time - timedelta(days=2, hours=4)
            t2 = end_time - timedelta(days=1, hours=2)
            attempts.append({
                "id": str(uuid.uuid4()),
                "student_id": s_id,
                "concept_id": 1,
                "score": 0.75,
                "time_spent_sec": 120,
                "hints_used": 1,
                "assessment_type": "practice",
                "attempted_at": t1.isoformat(),
                "client_attempt_id": str(uuid.uuid4()),
            })
            attempts.append({
                "id": str(uuid.uuid4()),
                "student_id": s_id,
                "concept_id": 2,
                "score": 0.70,
                "time_spent_sec": 140,
                "hints_used": 0,
                "assessment_type": "quiz",
                "attempted_at": t2.isoformat(),
                "client_attempt_id": str(uuid.uuid4()),
            })
            continue

        # Simulate 12 weeks of practice
        # Total attempts for normal student: 120 to 280
        total_attempts_target = random.randint(130, 260)
        if idx == 3:  # Crammer
            total_attempts_target = 180

        # Create timeline of days 0 to 83
        current_day = 0
        concepts_touched = syllabus_order[: random.randint(18, 36)]
        if idx == 0: # Demo 1 touches up to Trees (includes Arrays, Linked Lists, Binary Trees)
            concepts_touched = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 21, 22]

        student_attempts_count = 0
        while student_attempts_count < total_attempts_target and current_day < 84:
            # Check dropoff for Demo 3 in last 3 weeks (days >= 63)
            if idx == 2 and current_day >= 63:
                # Sudden dropoff: very few attempts
                if random.random() > 0.10:
                    current_day += 1
                    continue

            # Pick concept
            # 75% pick earliest not fully mastered, 25% random touched
            if random.random() < 0.75:
                pick = None
                for cand in concepts_touched:
                    if true_mastery[cand] < 0.75:
                        pick = cand
                        break
                if pick is None:
                    pick = random.choice(concepts_touched)
            else:
                pick = random.choice(concepts_touched)

            # Apply daily forgetting to touched concepts
            days_passed = max(0, current_day - last_attempt_day[pick])
            if days_passed > 0:
                true_mastery[pick] *= math.exp(-0.005 * days_passed)

            # Compute readiness based on prerequisite mastery
            parents = parents_by_id[pick]
            if parents:
                parent_masteries = [true_mastery[p] for p in parents]
                readiness = float(np.clip(np.mean(parent_masteries), 0.20, 1.00))
            else:
                readiness = 1.00

            # Learning update (unless blocked root gap)
            if pick == blocked_concept_id:
                # Blocked root gap: cannot improve past 0.20
                true_mastery[pick] = min(0.20, true_mastery[pick] + 0.01 * readiness * (1.0 - true_mastery[pick]))
            else:
                true_mastery[pick] = true_mastery[pick] + learn_rate * readiness * (1.0 - true_mastery[pick])
                true_mastery[pick] = float(np.clip(true_mastery[pick], 0.05, 0.99))

            last_attempt_day[pick] = current_day

            # Score calculation
            diff = concepts_by_id[pick]["difficulty"]
            noise = float(np.random.normal(0.0, 0.08))
            score = float(np.clip(true_mastery[pick] + noise - 0.05 * (diff - 3), 0.0, 1.0))

            # If student has blocked root gap in Arrays (7), Linked Lists (12) and Trees (21/22) score poorly
            if blocked_concept_id == 7 and pick in [7, 12, 21, 22]:
                score = min(score, float(np.random.uniform(0.15, 0.48)))

            # Time spent & hints
            base_time = diff * 45
            time_spent = int(max(20, base_time * (1.6 - true_mastery[pick]) * np.random.lognormal(0.0, 0.2)))
            hints_used = int(np.random.poisson(max(0.1, 3.0 * (1.0 - true_mastery[pick]))))
            hints_used = min(hints_used, 5)

            # Assessment type
            r_type = random.random()
            if r_type < 0.60:
                atype = "practice"
            elif r_type < 0.85:
                atype = "quiz"
            else:
                atype = "assignment"

            # Attempt timestamp
            attempt_dt = start_time + timedelta(
                days=current_day,
                hours=random.randint(8, 22),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )

            attempts.append({
                "id": str(uuid.uuid4()),
                "student_id": s_id,
                "concept_id": pick,
                "score": round(score, 3),
                "time_spent_sec": time_spent,
                "hints_used": hints_used,
                "assessment_type": atype,
                "attempted_at": attempt_dt.isoformat(),
                "client_attempt_id": str(uuid.uuid4()),
            })

            student_attempts_count += 1

            # Day progression
            # Crammer has long gaps then bursts
            if idx == 3:
                if random.random() < 0.30:
                    current_day += random.randint(3, 7)  # Long gap
                else:
                    if random.random() < 0.5:
                        current_day += 0  # Multiple same day
                    else:
                        current_day += 1
            else:
                if random.random() < 0.40:
                    current_day += 0
                else:
                    current_day += random.randint(1, 2)

    # Convert to DataFrames and sort
    df_students = pd.DataFrame(students)
    df_attempts = pd.DataFrame(attempts)
    df_attempts.sort_values(by="attempted_at", inplace=True)
    df_ground_truth = pd.DataFrame(ground_truth)

    df_students.to_csv(output_dir / "students.csv", index=False)
    df_attempts.to_csv(output_dir / "attempts.csv", index=False)
    df_ground_truth.to_csv(output_dir / "ground_truth.csv", index=False)

    print(f"Generated {len(df_students)} students.")
    print(f"Generated {len(df_attempts)} attempts across 38 concepts.")
    print(f"Generated {len(df_ground_truth)} ground truth root gap labels.")

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    data_dir = base_dir / "data"
    out_dir = data_dir / "generated"
    generate_dataset(data_dir, out_dir, seed=42)
