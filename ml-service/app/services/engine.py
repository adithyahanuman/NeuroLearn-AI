"""
ml-service/app/services/engine.py

Core ML Analysis and Serving Engine for NeuroLearn AI.
Loads model artifacts, knowledge graph, and SHAP explainer with startup validation guards.
Provides reusable orchestration functions for all /ml/* endpoints.
"""

from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timezone
from pathlib import Path
import os
import time
import json
import hashlib
import joblib
import numpy as np
import pandas as pd
import shap

from app.services.graph import KnowledgeGraphService
from app.services.twin import DigitalLearningTwin, parse_iso_dt
from app.services.features import FEATURES, features_for
from app.services.reasons import build_template_context, top_reasons


def resolve_file_path(candidates: List[Path], desc: str) -> Path:
    for c in candidates:
        if c.exists():
            return c.resolve()
    raise FileNotFoundError(f"Could not locate {desc}. Checked: {[str(c) for c in candidates]}")


class MLServiceEngine:
    def __init__(
        self,
        graph_path: Optional[str] = None,
        features_path: Optional[str] = None,
        model_path: Optional[str] = None,
        metrics_path: Optional[str] = None,
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent  # ml-service/
        root_dir = base_dir.parent  # project root

        # 1. Resolve Graph
        if graph_path:
            g_path = Path(graph_path)
        else:
            env_g = os.environ.get("GRAPH_PATH")
            g_path = Path(env_g) if env_g else resolve_file_path(
                [root_dir / "data" / "graph.json", base_dir / "data" / "graph.json", Path("data/graph.json")],
                "data/graph.json",
            )
        if not g_path.exists():
            raise FileNotFoundError(f"Graph file not found at {g_path}")

        # Compute graph SHA-256
        self.graph_path = g_path.resolve()
        graph_bytes = self.graph_path.read_bytes()
        self.graph_hash = hashlib.sha256(graph_bytes).hexdigest()
        self.graph_service = KnowledgeGraphService(str(self.graph_path))

        # 2. Resolve features.json
        if features_path:
            f_path = Path(features_path)
        else:
            env_f = os.environ.get("FEATURES_PATH")
            f_path = Path(env_f) if env_f else resolve_file_path(
                [base_dir / "models" / "features.json", root_dir / "ml-service" / "models" / "features.json", Path("models/features.json")],
                "models/features.json",
            )
        if not f_path.exists():
            raise FileNotFoundError(f"features.json not found at {f_path}")

        self.features_path = f_path.resolve()
        self.features_meta = json.loads(self.features_path.read_text(encoding="utf-8"))

        # Startup Guard 1: Verify features match code
        loaded_features = self.features_meta.get("features", [])
        if loaded_features != FEATURES:
            raise RuntimeError(
                f"Startup validation failed: features.json feature list does not match code FEATURES.\n"
                f"features.json: {loaded_features}\n"
                f"code FEATURES: {FEATURES}"
            )

        # Startup Guard 2: Verify graph hash matches
        expected_graph_hash = self.features_meta.get("graph_hash")
        if expected_graph_hash and expected_graph_hash != self.graph_hash:
            raise RuntimeError(
                f"Startup validation failed: graph SHA-256 mismatch!\n"
                f"features.json expected: {expected_graph_hash}\n"
                f"actual graph hash:       {self.graph_hash}"
            )

        # 3. Resolve model_v1.joblib
        if model_path:
            m_path = Path(model_path)
        else:
            env_m = os.environ.get("MODEL_PATH")
            m_path = Path(env_m) if env_m else resolve_file_path(
                [base_dir / "models" / "model_v1.joblib", root_dir / "ml-service" / "models" / "model_v1.joblib", Path("models/model_v1.joblib")],
                "models/model_v1.joblib",
            )
        if not m_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {m_path}")

        self.model_path = m_path.resolve()
        artifact = joblib.load(self.model_path)

        # Startup Guard 3: Verify artifact features
        art_features = artifact.get("features", [])
        if art_features and art_features != FEATURES:
            raise RuntimeError(
                f"Startup validation failed: model artifact features do not match code FEATURES.\n"
                f"artifact: {art_features}\n"
                f"code:     {FEATURES}"
            )

        self.model = artifact["model"]
        self.calibrator = artifact["calibrator"]
        self.threshold = float(artifact.get("threshold", 0.50))
        self.model_version = self.features_meta.get("version", "v1")

        # 4. Resolve metrics.json (optional for model-info)
        if metrics_path:
            met_path = Path(metrics_path)
        else:
            env_met = os.environ.get("METRICS_PATH")
            met_path = Path(env_met) if env_met else None
            if not met_path or not met_path.exists():
                try:
                    met_path = resolve_file_path(
                        [base_dir / "models" / "metrics.json", root_dir / "ml-service" / "models" / "metrics.json", Path("models/metrics.json")],
                        "models/metrics.json",
                    )
                except Exception:
                    met_path = None

        if met_path and met_path.exists():
            self.metrics_meta = json.loads(met_path.read_text(encoding="utf-8"))
        else:
            self.metrics_meta = {}

        # 5. Initialize SHAP TreeExplainer once
        self.explainer = shap.TreeExplainer(self.model)

    def replay_twin(
        self,
        student_id: str,
        attempts: List[Dict[str, Any]],
        as_of: Optional[datetime] = None,
        cohort_median_7d: float = 1.0,
    ) -> Tuple[DigitalLearningTwin, datetime, Dict[str, Any]]:
        """
        Replays attempts onto a DigitalLearningTwin and extracts full snapshot summary.
        """
        twin = DigitalLearningTwin(student_id=student_id, graph_service=self.graph_service)
        if attempts:
            twin.apply_attempts(attempts)

        if as_of is None:
            if twin.all_attempt_dts:
                dt = max(twin.all_attempt_dts)
            else:
                dt = datetime.now(timezone.utc)
        else:
            dt = parse_iso_dt(as_of)

        all_cids = self.graph_service.get_topological_order()
        mastery_all = {}
        raw_mastery = {}
        velocity = {}
        confidence = {}

        for cid in all_cids:
            str_c = str(cid)
            mastery_all[str_c] = twin.get_effective_mastery(cid, dt)
            raw_mastery[str_c] = round(twin.raw_mastery.get(cid, twin.get_concept_prior(cid)), 4)
            velocity[str_c] = twin.compute_velocity(cid)
            confidence[str_c] = twin.get_confidence(cid)

        high_c = sum(1 for m in mastery_all.values() if m < 0.50)
        med_c = sum(1 for m in mastery_all.values() if 0.50 <= m < 0.70)
        low_c = sum(1 for m in mastery_all.values() if m >= 0.70)

        twin_summary = {
            "studentId": student_id,
            "computedAt": dt.isoformat(),
            "masteryAll": mastery_all,
            "rawMastery": raw_mastery,
            "velocity": velocity,
            "consistency": twin.compute_consistency(),
            "engagement": twin.compute_engagement(dt, cohort_median_7d),
            "confidence": confidence,
            "totalAttempts": sum(twin.attempt_counts.values()),
            "riskSummary": {
                "high": high_c,
                "medium": med_c,
                "low": low_c,
            },
        }

        return twin, dt, twin_summary

    def build_features_matrix(
        self,
        twin: DigitalLearningTwin,
        concept_ids: List[int],
        as_of: datetime,
        cohort_median_7d: float = 1.0,
    ) -> Tuple[pd.DataFrame, Dict[int, Dict[str, float]]]:
        """
        Extracts 15-feature vectors for specified concepts.
        """
        features_dict_map = {}
        rows = []
        for cid in concept_ids:
            f = features_for(twin, cid, as_of=as_of, cohort_median_7d=cohort_median_7d)
            features_dict_map[cid] = f
            rows.append(f)

        df = pd.DataFrame(rows)[FEATURES]
        return df, features_dict_map

    def predict_batch(
        self,
        features_df: pd.DataFrame,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Vectorized raw and calibrated predictions.
        """
        raw_probs = self.model.predict_proba(features_df)[:, 1]
        calibrated_probs = self.calibrator.predict_proba(features_df)[:, 1]
        return raw_probs, calibrated_probs

    def analyze(
        self,
        student_id: str,
        attempts: List[Dict[str, Any]],
        cohort_median_attempts: float = 1.0,
        include_path: bool = False,
        as_of: Optional[str] = None,
        target_concepts: Optional[List[Union[int, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Unified high-performance /ml/analyze orchestration.
        Guaranteed to run in < 150ms for 38 concepts.
        """
        t0 = time.perf_counter()

        # Step 1: Replay Twin
        t_twin_start = time.perf_counter()
        as_of_dt = parse_iso_dt(as_of) if as_of else None
        twin, dt, twin_summary = self.replay_twin(
            student_id=student_id,
            attempts=attempts,
            as_of=as_of_dt,
            cohort_median_7d=cohort_median_attempts,
        )
        t_twin_ms = (time.perf_counter() - t_twin_start) * 1000.0

        # Determine target concept IDs
        if target_concepts:
            cids: List[int] = []
            for c in target_concepts:
                norm_c = self.graph_service._normalize_id(c)
                if isinstance(norm_c, int):
                    cids.append(norm_c)
        else:
            cids = self.graph_service.get_topological_order()

        # Step 2: Build Features
        t_feat_start = time.perf_counter()
        features_df, feats_map = self.build_features_matrix(
            twin=twin,
            concept_ids=cids,
            as_of=dt,
            cohort_median_7d=cohort_median_attempts,
        )
        t_feat_ms = (time.perf_counter() - t_feat_start) * 1000.0

        # Step 3: Batch Predict
        t_pred_start = time.perf_counter()
        raw_probs, cal_probs = self.predict_batch(features_df)
        t_pred_ms = (time.perf_counter() - t_pred_start) * 1000.0

        # Step 4: Classify bands and filter for SHAP / Root Gaps
        # Band definition: high if >= 0.60, medium if >= 0.30, else low
        predictions = []
        medium_high_indices = []
        medium_high_cids = []

        for idx, cid in enumerate(cids):
            cal_risk = float(cal_probs[idx])
            if cal_risk >= 0.60:
                band = "high"
            elif cal_risk >= 0.30:
                band = "medium"
            else:
                band = "low"

            conf = twin.get_confidence(cid)
            node_info = self.graph_service.nodes_by_id.get(cid, {})

            pred_item = {
                "conceptId": cid,
                "conceptCode": node_info.get("code", f"C{cid:02d}"),
                "conceptName": node_info.get("name", f"Concept {cid}"),
                "risk": round(cal_risk, 4),
                "band": band,
                "confidence": conf,
                "reasons": [],
                "rootGaps": [],
                "stale": False,
                "computedAt": dt.isoformat(),
            }
            predictions.append(pred_item)

            if band in ("medium", "high"):
                medium_high_indices.append(idx)
                medium_high_cids.append(cid)

        # Step 5: SHAP computation strictly for medium and high rows
        t_shap_start = time.perf_counter()
        reasons_by_cid: Dict[int, List[str]] = {}
        if medium_high_indices:
            sub_df = features_df.iloc[medium_high_indices]
            shap_matrix = self.explainer.shap_values(sub_df)
            for sub_idx, orig_idx in enumerate(medium_high_indices):
                cid = cids[orig_idx]
                s_vals = shap_matrix[sub_idx]
                s_dict = dict(zip(FEATURES, s_vals))
                ctx = build_template_context(feats_map[cid], cid, self.graph_service, twin)
                reasons_by_cid[cid] = top_reasons(s_dict, feats_map[cid], ctx, max_reasons=3)
        t_shap_ms = (time.perf_counter() - t_shap_start) * 1000.0

        # Step 6: Root Gap algorithm for medium and high rows
        t_rg_start = time.perf_counter()
        root_gaps_by_cid: Dict[int, List[Dict[str, Any]]] = {}
        global_root_gaps_map: Dict[int, Dict[str, Any]] = {}
        # Prepare mastery map for find_root_gaps
        mastery_float_map = {cid: twin.get_effective_mastery(cid, dt) for cid in self.graph_service.get_topological_order()}

        for cid in medium_high_cids:
            gaps = self.graph_service.find_root_gaps(mastery_float_map, target_concept_id=cid)
            root_gaps_by_cid[cid] = gaps
            for g in gaps:
                rg_id = g["root_gap_id"]
                if rg_id not in global_root_gaps_map or g["score"] > global_root_gaps_map[rg_id]["score"]:
                    global_root_gaps_map[rg_id] = g

        t_rg_ms = (time.perf_counter() - t_rg_start) * 1000.0

        # Merge reasons and root gaps into predictions
        for pred in predictions:
            cid = pred["conceptId"]
            if cid in reasons_by_cid:
                pred["reasons"] = reasons_by_cid[cid]
            if cid in root_gaps_by_cid:
                pred["rootGaps"] = root_gaps_by_cid[cid]

        # Top global root gaps sorted descending by score
        sorted_global_root_gaps = sorted(global_root_gaps_map.values(), key=lambda x: x["score"], reverse=True)

        t_total_ms = (time.perf_counter() - t0) * 1000.0

        timings = {
            "twin_ms": round(t_twin_ms, 2),
            "features_ms": round(t_feat_ms, 2),
            "predict_ms": round(t_pred_ms, 2),
            "shap_ms": round(t_shap_ms, 2),
            "root_gap_ms": round(t_rg_ms, 2),
            "total_ms": round(t_total_ms, 2),
        }

        return {
            "studentId": student_id,
            "predictions": predictions,
            "twinSummary": twin_summary,
            "rootGaps": sorted_global_root_gaps,
            "path": [],  # Empty path for Phase 4 as specified in PRD & checklist
            "timings": timings,
        }

    def explain_concept(
        self,
        student_id: str,
        attempts: List[Dict[str, Any]],
        concept_id: Union[int, str],
        as_of: Optional[str] = None,
        cohort_median_attempts: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Explains risk prediction for a single concept with exact SHAP feature contributions.
        """
        cid_norm = self.graph_service._normalize_id(concept_id)
        if not isinstance(cid_norm, int):
            raise ValueError(f"Unknown concept ID: {concept_id}")

        as_of_dt = parse_iso_dt(as_of) if as_of else None
        twin, dt, _ = self.replay_twin(student_id, attempts, as_of=as_of_dt, cohort_median_7d=cohort_median_attempts)

        feats = features_for(twin, cid_norm, as_of=dt, cohort_median_7d=cohort_median_attempts)
        f_df = pd.DataFrame([feats])[FEATURES]

        cal_risk = float(self.calibrator.predict_proba(f_df)[:, 1][0])
        if cal_risk >= 0.60:
            band = "high"
        elif cal_risk >= 0.30:
            band = "medium"
        else:
            band = "low"

        conf = twin.get_confidence(cid_norm)
        s_vals = self.explainer.shap_values(f_df)[0]
        shap_dict = {feat: float(round(val, 4)) for feat, val in zip(FEATURES, s_vals)}

        ctx = build_template_context(feats, cid_norm, self.graph_service, twin)
        reasons = top_reasons(shap_dict, feats, ctx, max_reasons=3)
        node_info = self.graph_service.nodes_by_id.get(cid_norm, {})

        return {
            "studentId": student_id,
            "conceptId": cid_norm,
            "conceptCode": node_info.get("code", f"C{cid_norm:02d}"),
            "conceptName": node_info.get("name", f"Concept {cid_norm}"),
            "risk": round(cal_risk, 4),
            "band": band,
            "confidence": conf,
            "shapValues": shap_dict,
            "reasons": reasons,
        }


# Singleton engine instance
_engine_instance: Optional[MLServiceEngine] = None


def get_engine() -> MLServiceEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = MLServiceEngine()
    return _engine_instance


def set_engine(engine: Optional[MLServiceEngine]) -> None:
    global _engine_instance
    _engine_instance = engine
