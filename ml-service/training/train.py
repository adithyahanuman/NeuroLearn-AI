"""
ml-service/training/train.py

Training pipeline for NeuroLearn AI Risk Model (Section 6.4, 6.5 & Section 17.8):
1. Prepares or loads weekly dataset rows (weeks 2 to 12).
2. Splits dataset temporally:
   - Train: weeks 2 to 6
   - Validation: weeks 8 to 9
   - Test: weeks 11 to 12 (held out until evaluate.py)
   (Weeks 7 and 10 skipped as temporal buffers)
3. Trains baseline Logistic Regression pipeline with StandardScaler.
4. Fits XGBoost with scale_pos_weight and 40 random search trials via GroupKFold (grouped by student).
5. Fits Isotonic Calibrator on validation set.
6. Chooses highest threshold keeping validation recall >= 0.75.
7. Saves artifacts:
   - ml-service/models/model_v1.joblib
   - ml-service/models/features.json
8. Inserts entry into PostgreSQL table model_registry.
"""

import os
import sys
import json
import hashlib
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, recall_score, precision_score, brier_score_loss
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import GroupKFold
import xgboost as xgb

repo_dir = Path(__file__).resolve().parent.parent
if str(repo_dir) not in sys.path:
    sys.path.insert(0, str(repo_dir))

from app.services.graph import get_graph_service
from training.features import FEATURES, build_dataset_rows

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def get_graph_hash(graph_path: Path) -> str:
    """Computes SHA-256 hash of graph.json."""
    if not graph_path.exists():
        return ""
    h = hashlib.sha256()
    with open(graph_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def get_db_connection():
    """Returns a psycopg2 connection to PostgreSQL using environment settings."""
    import psycopg2
    # Try loading .env if not set
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = v.strip()

    db_host = os.environ.get("POSTGRES_HOST_LOCAL", "localhost")
    db_port = os.environ.get("POSTGRES_PORT", "5433")
    db_name = os.environ.get("POSTGRES_DB", "neurolearn")
    db_user = os.environ.get("POSTGRES_USER", "neurolearn")
    db_pass = os.environ.get("POSTGRES_PASSWORD", "changeme")

    return psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=db_user,
        password=db_pass,
    )

def load_or_build_dataset(data_dir: Path) -> pd.DataFrame:
    """Loads cached dataset_rows.csv or builds it from attempts and students."""
    cache_path = data_dir / "generated" / "dataset_rows.csv"
    if cache_path.exists():
        print(f"Loading cached dataset rows from {cache_path}...")
        return pd.read_csv(cache_path)

    print("Building dataset rows across weeks 2 to 12...")
    attempts = pd.read_csv(data_dir / "generated" / "attempts.csv")
    students = pd.read_csv(data_dir / "generated" / "students.csv")
    graph_service = get_graph_service()

    df = build_dataset_rows(attempts, students, graph_service, weeks=list(range(2, 13)))
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(cache_path, index=False)
    print(f"Built and cached {len(df)} rows to {cache_path}.")
    return df

def train_pipeline(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)

    repo_root = Path(__file__).resolve().parent.parent.parent
    data_dir = repo_root / "data"
    models_dir = repo_root / "ml-service" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    df = load_or_build_dataset(data_dir)

    # 1. Temporal Splits
    df_train = df[df["week"].isin([2, 3, 4, 5, 6])].copy()
    df_val = df[df["week"].isin([8, 9])].copy()
    df_test = df[df["week"].isin([11, 12])].copy()

    print(f"\n--- Temporal Splits ---")
    print(f"Train rows (weeks 2-6):      {len(df_train)} (Label 1: {df_train['label'].mean():.2%})")
    print(f"Validation rows (weeks 8-9): {len(df_val)} (Label 1: {df_val['label'].mean():.2%})")
    print(f"Test rows (weeks 11-12):     {len(df_test)} (Label 1: {df_test['label'].mean():.2%})")

    X_train = df_train[FEATURES]
    y_train = df_train["label"].values
    groups_train = df_train["student_id"].values

    X_val = df_val[FEATURES]
    y_val = df_val["label"].values

    # 2. Baseline Model: Logistic Regression
    print("\n--- Training Baseline Logistic Regression ---")
    lr_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value=0.0)),
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=seed)),
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_val_probs = lr_pipeline.predict_proba(X_val)[:, 1]
    lr_val_auc = roc_auc_score(y_val, lr_val_probs)
    print(f"Logistic Regression Validation AUC: {lr_val_auc:.4f}")

    # 3. XGBoost: scale_pos_weight & Random Search
    print("\n--- XGBoost Random Search with GroupKFold ---")
    n_neg = int(np.sum(y_train == 0))
    n_pos = int(np.sum(y_train == 1))
    scale_pos_weight = float(n_neg / max(1, n_pos))
    print(f"Class imbalance: {n_neg} negatives, {n_pos} positives -> scale_pos_weight = {scale_pos_weight:.3f}")

    gkf = GroupKFold(n_splits=5)
    best_score = -1.0
    best_params = {}
    best_tree_counts = []

    n_trials = 40
    print(f"Running {n_trials} random search trials...")

    for trial in range(n_trials):
        params = {
            "max_depth": random.choice([3, 4, 5, 6]),
            "learning_rate": round(random.uniform(0.03, 0.10), 4),
            "min_child_weight": random.randint(3, 10),
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "scale_pos_weight": scale_pos_weight,
            "random_state": seed + trial,
            "n_estimators": 600,
            "eval_metric": "logloss",
        }

        fold_aucs = []
        fold_trees = []

        for train_idx, fold_val_idx in gkf.split(X_train, y_train, groups=groups_train):
            X_tr_f, y_tr_f = X_train.iloc[train_idx], y_train[train_idx]
            X_va_f, y_va_f = X_train.iloc[fold_val_idx], y_train[fold_val_idx]

            clf = xgb.XGBClassifier(**params, early_stopping_rounds=30)
            clf.fit(
                X_tr_f,
                y_tr_f,
                eval_set=[(X_va_f, y_va_f)],
                verbose=False,
            )

            val_preds = clf.predict_proba(X_va_f)[:, 1]
            auc_val = roc_auc_score(y_va_f, val_preds)
            fold_aucs.append(auc_val)
            fold_trees.append(clf.best_iteration + 1)

        mean_auc = float(np.mean(fold_aucs))
        mean_trees = int(np.mean(fold_trees))

        if mean_auc > best_score:
            best_score = mean_auc
            best_params = params.copy()
            best_tree_counts = fold_trees
            print(f"  Trial {trial+1:02d}: New best CV AUC = {best_score:.4f} (depth={params['max_depth']}, lr={params['learning_rate']}, trees={mean_trees})")

    avg_best_trees = int(np.mean(best_tree_counts)) if best_tree_counts else 200
    print(f"\nBest CV AUC: {best_score:.4f}")
    print(f"Best parameters: {best_params}")
    print(f"Average best tree count: {avg_best_trees}")

    # 4. Refit XGBoost on full training rows
    print("\n--- Refitting Final XGBoost on Full Train Set ---")
    final_params = best_params.copy()
    final_params["n_estimators"] = avg_best_trees
    final_params.pop("random_state", None)

    final_model = xgb.XGBClassifier(**final_params, random_state=seed)
    final_model.fit(X_train, y_train)

    raw_val_probs = final_model.predict_proba(X_val)[:, 1]
    raw_val_auc = roc_auc_score(y_val, raw_val_probs)
    print(f"Uncalibrated XGBoost Validation AUC: {raw_val_auc:.4f}")

    # 5. Isotonic Calibration on Validation Set
    print("\n--- Fitting Isotonic Calibrator ---")
    calibrator = CalibratedClassifierCV(estimator=final_model, method="isotonic", cv="prefit")
    calibrator.fit(X_val, y_val)
    cal_val_probs = calibrator.predict_proba(X_val)[:, 1]
    cal_val_auc = roc_auc_score(y_val, cal_val_probs)
    cal_val_brier = brier_score_loss(y_val, cal_val_probs)
    print(f"Calibrated Validation AUC: {cal_val_auc:.4f}")
    print(f"Calibrated Validation Brier: {cal_val_brier:.4f}")

    # 6. Threshold Selection on Validation Set (Highest threshold keeping recall >= 0.75)
    print("\n--- Selecting Decision Threshold on Validation Set ---")
    thresholds = np.linspace(0.10, 0.90, 81)
    chosen_threshold = 0.50
    chosen_recall = 0.0
    chosen_precision = 0.0

    for t in sorted(thresholds, reverse=True):
        preds_t = (cal_val_probs >= t).astype(int)
        rec = recall_score(y_val, preds_t)
        prec = precision_score(y_val, preds_t, zero_division=0)
        if rec >= 0.85:
            chosen_threshold = round(float(t), 3)
            chosen_recall = float(rec)
            chosen_precision = float(prec)
            break

    print(f"Chosen threshold: {chosen_threshold} (Validation Recall: {chosen_recall:.4f}, Precision: {chosen_precision:.4f})")

    # 7. Save Model Artifacts
    print("\n--- Saving Artifacts ---")
    model_artifact = {
        "model": final_model,
        "calibrator": calibrator,
        "baseline_lr": lr_pipeline,
        "threshold": chosen_threshold,
        "scale_pos_weight": scale_pos_weight,
        "best_params": best_params,
        "best_tree_count": avg_best_trees,
        "features": FEATURES,
        "version": "v1",
        "validation_metrics": {
            "lr_auc": round(float(lr_val_auc), 4),
            "xgb_auc": round(float(cal_val_auc), 4),
            "xgb_brier": round(float(cal_val_brier), 4),
            "recall": round(float(chosen_recall), 4),
            "precision": round(float(chosen_precision), 4),
            "threshold": chosen_threshold,
        }
    }
    joblib.dump(model_artifact, models_dir / "model_v1.joblib")
    print(f"Saved {models_dir / 'model_v1.joblib'}")

    graph_hash = get_graph_hash(data_dir / "graph.json")
    features_meta = {
        "features": FEATURES,
        "version": "v1",
        "graph_hash": graph_hash,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "threshold": chosen_threshold,
        "scale_pos_weight": round(scale_pos_weight, 4),
    }
    with open(models_dir / "features.json", "w", encoding="utf-8") as f:
        json.dump(features_meta, f, indent=2)
    print(f"Saved {models_dir / 'features.json'}")

    # 8. Register Model in PostgreSQL
    print("\n--- Registering Model in PostgreSQL model_registry ---")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO model_registry (version, trained_at, auc, recall, brier, feature_list, artifact_path)
                VALUES (%s, NOW(), %s, %s, %s, %s, %s)
                ON CONFLICT (version) DO UPDATE
                SET trained_at = NOW(),
                    auc = EXCLUDED.auc,
                    recall = EXCLUDED.recall,
                    brier = EXCLUDED.brier,
                    feature_list = EXCLUDED.feature_list,
                    artifact_path = EXCLUDED.artifact_path;
                """,
                (
                    "v1",
                    round(float(cal_val_auc), 3),
                    round(float(chosen_recall), 3),
                    round(float(cal_val_brier), 3),
                    json.dumps(FEATURES),
                    "models/model_v1.joblib",
                )
            )
        conn.commit()
        conn.close()
        print("Successfully registered model v1 in model_registry.")
    except Exception as e:
        print(f"Warning: Could not register model in PostgreSQL: {e}")

    print("\nTraining complete!")

if __name__ == "__main__":
    train_pipeline()
