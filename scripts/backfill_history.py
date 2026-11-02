#!/usr/bin/env python3
"""
scripts/backfill_history.py

History backfill engine for NeuroLearn AI (Section 17.2 & Phase 5):
1. Directly imports ML code (twin, features, graph, reasons, and model) without HTTP overhead.
2. Replays student attempt histories across weekly grid (weeks 1 to 12).
3. Batches feature matrix generation and XGBoost model inferences.
4. Generates SHAP natural language reasons only for the latest week and for risk risers (delta >= 0.20).
5. Fast-loads twin_snapshots and predictions using PostgreSQL COPY.
6. Execution target: under 5 minutes.
"""

import os
import sys
import json
import time
import io
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
import psycopg2
from psycopg2 import sql
import joblib
import numpy as np
import pandas as pd

# Add repository root and ml-service to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "ml-service"))
sys.path.insert(0, str(BASE_DIR))

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.services.graph import KnowledgeGraphService, get_graph_service
from app.services.twin import DigitalLearningTwin, parse_iso_dt
from app.services.features import FEATURES, features_for, cohort_median_at
from app.services.reasons import build_template_context, top_reasons, GROUPS, TEMPLATES
import shap


def load_env_file():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    if k not in os.environ:
                        os.environ[k] = v


def get_db_connection():
    load_env_file()
    user = os.environ.get("POSTGRES_USER", "neurolearn")
    password = os.environ.get("POSTGRES_PASSWORD", "changeme")
    db = os.environ.get("POSTGRES_DB", "neurolearn")
    host = os.environ.get("POSTGRES_HOST", "127.0.0.1")
    if host == "db":
        host = "127.0.0.1"
    port = os.environ.get("POSTGRES_PORT", "5433")

    return psycopg2.connect(
        dbname=db,
        user=user,
        password=password,
        host=host,
        port=port,
    )


def run_backfill():
    start_time = time.time()
    print("=" * 70)
    print("NeuroLearn AI – Historical Twin & Prediction Backfill (Section 17.2)")
    print("=" * 70)

    # 1. Load artifacts
    graph_path = BASE_DIR / "data" / "graph.json"
    model_path = BASE_DIR / "ml-service" / "models" / "model_v1.joblib"

    print(f"Loading knowledge graph from {graph_path}...")
    graph_service = KnowledgeGraphService(graph_path)

    print(f"Loading model bundle from {model_path}...")
    artifact = joblib.load(model_path)
    model = artifact["model"]
    calibrator = artifact["calibrator"]
    threshold = artifact.get("threshold", 0.50)
    print(f"Model loaded: threshold={threshold:.3f}")

    # Initialize SHAP explainer
    print("Initializing TreeExplainer...")
    explainer = shap.TreeExplainer(model)

    # 2. Load generated data
    students_csv = BASE_DIR / "data" / "generated" / "students.csv"
    attempts_csv = BASE_DIR / "data" / "generated" / "attempts.csv"

    if not students_csv.exists() or not attempts_csv.exists():
        print("Generated data not found. Please run generator first.")
        return

    print("Loading students and attempts CSVs...")
    students_df = pd.read_csv(students_csv)
    attempts_df = pd.read_csv(attempts_csv)
    attempts_df["attempted_dt"] = attempts_df["attempted_at"].apply(parse_iso_dt)

    min_dt = attempts_df["attempted_dt"].min()
    max_dt = attempts_df["attempted_dt"].max()
    print(f"Loaded {len(students_df)} students and {len(attempts_df)} attempts.")
    print(f"Date range: {min_dt.date()} to {max_dt.date()}")

    # Pre-index attempts by student for fast sequential replay
    attempts_by_student = {}
    for s_id, group in attempts_df.groupby("student_id"):
        attempts_by_student[s_id] = group.sort_values("attempted_dt").to_dict("records")

    students_list = students_df.to_dict("records")
    concepts_list = graph_service.get_topological_order()

    weeks = list(range(1, 13))
    print(f"Backfilling across {len(weeks)} weekly intervals (Weeks 1 to 12)...")

    twin_snapshots_rows = []
    predictions_rows = []

    # Store previous week's risk per (student_id, concept_id) to detect risers (delta >= 0.20)
    prev_risks = {}

    for week_num in weeks:
        t_week = min_dt + timedelta(days=week_num * 7)
        is_latest_week = (week_num == weeks[-1])
        print(f"Processing Week {week_num:02d} (as of {t_week.strftime('%Y-%m-%d %H:%M:%S')})...")

        # Precompute cohort medians at t_week
        cohort_medians = {}
        for cname in ["Cohort A", "Cohort B", "Cohort C"]:
            cohort_medians[cname] = cohort_median_at(attempts_df, students_df, cname, t_week)

        # Replay twins & build batch features
        batch_features = []
        batch_meta = []  # (student_id, concept_id, twin_obj, f_dict)

        for s_info in students_list:
            s_id = s_info["id"]
            cname = s_info.get("cohort", "Cohort A")
            c_med = cohort_medians.get(cname, 1.0)

            student_attempts = attempts_by_student.get(s_id, [])
            past_attempts = [a for a in student_attempts if a["attempted_dt"] <= t_week]

            twin = DigitalLearningTwin(student_id=s_id, graph_service=graph_service)
            twin.apply_attempts(past_attempts)

            # Record twin snapshot
            snap_id = str(uuid.uuid4())
            twin_state = twin.to_summary(as_of=t_week, cohort_median_7d=c_med)
            twin_snapshots_rows.append((
                snap_id,
                s_id,
                t_week.isoformat(),
                json.dumps(twin_state),
            ))

            for cid in concepts_list:
                f_dict = features_for(twin=twin, concept_id=cid, as_of=t_week, cohort_median_7d=c_med)
                f_vec = [f_dict[fname] for fname in FEATURES]
                batch_features.append(f_vec)
                batch_meta.append((s_id, cid, twin, f_dict))

        # Batch prediction
        X_batch = np.array(batch_features)
        raw_probs = model.predict_proba(X_batch)[:, 1]
        calibrated_risks = calibrator.predict_proba(raw_probs)[:, 1]

        # Calculate SHAP only if needed (latest week or risk risers)
        # For efficiency, compute TreeExplainer values for the latest week in bulk
        shap_values_matrix = None
        if is_latest_week:
            print(f"  Computing SHAP values for all {len(batch_meta)} rows in latest week...")
            shap_values_matrix = explainer.shap_values(X_batch)

        for i, (s_id, cid, twin, f_dict) in enumerate(batch_meta):
            cal_risk = float(calibrated_risks[i])
            if cal_risk >= 0.70:
                band = "high"
            elif cal_risk >= threshold:
                band = "medium"
            else:
                band = "low"

            key = (s_id, cid)
            old_risk = prev_risks.get(key, cal_risk)
            risk_rose = (cal_risk - old_risk) >= 0.20
            prev_risks[key] = cal_risk

            reasons_json = "[]"
            root_gaps_json = "[]"

            should_explain = is_latest_week or risk_rose

            if should_explain and band in ("medium", "high"):
                # Compute SHAP if not already computed
                if shap_values_matrix is not None:
                    s_vals = shap_values_matrix[i]
                else:
                    s_vals = explainer.shap_values(X_batch[i : i + 1])[0]

                shap_dict = {FEATURES[j]: float(s_vals[j]) for j in range(len(FEATURES))}
                ctx = build_template_context(f_dict, cid, graph_service, twin)
                concept_reasons = top_reasons(shap_dict, f_dict, ctx, max_reasons=3)
                reasons_json = json.dumps(concept_reasons)

                # Compute root gaps
                mastery_map = twin.get_effective_mastery_all()
                gaps = graph_service.get_root_gaps(cid, mastery_map, gap_threshold=0.60)
                root_gaps_json = json.dumps(gaps)

            pred_id = str(uuid.uuid4())
            predictions_rows.append((
                pred_id,
                s_id,
                cid,
                round(cal_risk, 3),
                band,
                "v1",
                reasons_json,
                root_gaps_json,
                t_week.isoformat(),
            ))

    elapsed_gen = time.time() - start_time
    print(f"\nGenerated {len(twin_snapshots_rows)} twin snapshots and {len(predictions_rows)} predictions in {elapsed_gen:.2f}s.")

    # 3. Write into PostgreSQL using COPY
    print("Connecting to database for bulk loading via COPY...")
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Clean existing predictions and snapshots
        print("Clearing existing twin_snapshots and predictions...")
        cur.execute("TRUNCATE TABLE twin_snapshots, predictions CASCADE;")

        # COPY twin_snapshots
        print(f"Loading {len(twin_snapshots_rows)} twin snapshots via COPY...")
        buf_snaps = io.StringIO()
        for r in twin_snapshots_rows:
            # Format as TSV/CSV: id \t student_id \t taken_at \t state
            # Escape newlines and tabs in state
            state_escaped = r[3].replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
            buf_snaps.write(f"{r[0]}\t{r[1]}\t{r[2]}\t{state_escaped}\n")
        buf_snaps.seek(0)
        cur.copy_from(buf_snaps, "twin_snapshots", columns=("id", "student_id", "taken_at", "state"))

        # COPY predictions
        print(f"Loading {len(predictions_rows)} predictions via COPY...")
        buf_preds = io.StringIO()
        for r in predictions_rows:
            reasons_esc = r[6].replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
            gaps_esc = r[7].replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
            buf_preds.write(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]}\t{r[4]}\t{r[5]}\t{reasons_esc}\t{gaps_esc}\t{r[8]}\n")
        buf_preds.seek(0)
        cur.copy_from(
            buf_preds,
            "predictions",
            columns=(
                "id",
                "student_id",
                "concept_id",
                "risk",
                "band",
                "model_version",
                "reasons",
                "root_gaps",
                "created_at",
            ),
        )

        conn.commit()
        cur.close()
        conn.close()
        print("Database commit successful.")
    except Exception as e:
        print(f"Database bulk load skipped or failed: {e}")
        print("Saving backfill data to local backup files...")
        out_dir = BASE_DIR / "data" / "generated"
        with open(out_dir / "backfill_snapshots.json", "w", encoding="utf-8") as f:
            json.dump([{"id": r[0], "studentId": r[1], "takenAt": r[2]} for r in twin_snapshots_rows[:50]], f)

    total_time = time.time() - start_time
    print(f"\nBackfill completed in {total_time:.2f} seconds ({total_time / 60:.2f} minutes).")
    print("=" * 70)


if __name__ == "__main__":
    run_backfill()
