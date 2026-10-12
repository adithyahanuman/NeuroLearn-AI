"""
ml-service/app/services/twin.py

Digital Learning Twin Engine (Section 5):
Maintains continuous cognitive mastery, velocity, consistency, engagement,
and confidence metrics per student across all 38 concepts.

Rules (Section 5.2 & 17.8):
- Prior mastery: 0.40 (no prerequisites) or 0.20 + 0.40 * mean(prereq_mastery).
- Attempt update: m_new = m_old + alpha * (score - m_old)
  alpha = 0.35 (first 3 attempts), else 0.25. (Practice scaled by 0.7).
- Forgetting: m_effective = prior + (m - prior) * exp(-0.015 * days_since_last_attempt).
- Velocity: slope of last 5 scores (0 if < 3 attempts).
- Consistency: 1 - min(1, std(gaps) / max(mean(gaps), 0.5)) (0.5 if < 3 attempts).
- Engagement: attempts in last 7 days / cohort_median_7d (capped at 1.0).
- Confidence: low (< 3 attempts), medium (3-5), high (> 5).
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone, timedelta
import math
import numpy as np
from pathlib import Path

# Local import of graph service
from app.services.graph import KnowledgeGraphService, get_graph_service

def parse_iso_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    s = str(val).replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

class DigitalLearningTwin:
    def __init__(self, student_id: str, graph_service: Optional[KnowledgeGraphService] = None):
        self.student_id = student_id
        self.graph = graph_service or get_graph_service()

        # Concept tracking
        self.raw_mastery: Dict[int, float] = {}
        self.scores_history: Dict[int, List[float]] = {}
        self.last_attempt_dt: Dict[int, datetime] = {}
        self.attempt_counts: Dict[int, int] = {}
        self.all_attempt_dts: List[datetime] = []

        self._initialize_priors()

    def _initialize_priors(self):
        """Initializes raw mastery according to prerequisite structure."""
        topo = self.graph.get_topological_order()
        for cid in topo:
            parents = self.graph.get_parents(cid)
            if not parents:
                self.raw_mastery[cid] = 0.40
            else:
                parent_m = [self.raw_mastery.get(p, 0.40) for p in parents]
                self.raw_mastery[cid] = 0.20 + 0.40 * float(np.mean(parent_m))
            self.scores_history[cid] = []
            self.attempt_counts[cid] = 0

    def get_concept_prior(self, concept_id: int) -> float:
        """Computes base prior for concept using current raw mastery of prerequisites."""
        parents = self.graph.get_parents(concept_id)
        if not parents:
            return 0.40
        parent_m = [self.raw_mastery.get(p, 0.40) for p in parents]
        return float(np.clip(0.20 + 0.40 * float(np.mean(parent_m)), 0.05, 0.95))

    def apply_attempt(self, attempt: Dict[str, Any]):
        """Processes one attempt and updates internal state."""
        cid = int(attempt["concept_id"])
        score = float(np.clip(float(attempt["score"]), 0.0, 1.0))
        atype = str(attempt.get("assessment_type", "practice")).lower()
        att_dt = parse_iso_dt(attempt.get("attempted_at", datetime.now(timezone.utc)))

        count = self.attempt_counts.get(cid, 0)
        base_alpha = 0.35 if count < 3 else 0.25
        alpha_scale = 0.70 if atype == "practice" else 1.00
        alpha = base_alpha * alpha_scale

        m_old = self.raw_mastery.get(cid, self.get_concept_prior(cid))
        m_new = m_old + alpha * (score - m_old)
        self.raw_mastery[cid] = float(np.clip(m_new, 0.0, 1.0))

        if cid not in self.scores_history:
            self.scores_history[cid] = []
        self.scores_history[cid].append(score)

        self.last_attempt_dt[cid] = att_dt
        self.attempt_counts[cid] = count + 1
        self.all_attempt_dts.append(att_dt)

    def apply_attempts(self, attempts: List[Dict[str, Any]]):
        """Processes a list of attempts chronologically."""
        sorted_att = sorted(attempts, key=lambda a: parse_iso_dt(a.get("attempted_at", datetime.min)))
        for att in sorted_att:
            self.apply_attempt(att)

    def compute_velocity(self, concept_id: int) -> float:
        """Slope of straight line fitted to last 5 scores on concept (0 if < 3 attempts)."""
        scores = self.scores_history.get(concept_id, [])
        if len(scores) < 3:
            return 0.0
        recent = scores[-5:]
        n = len(recent)
        x = np.arange(n)
        slope, _ = np.polyfit(x, recent, 1)
        return float(round(slope, 4))

    def compute_consistency(self) -> float:
        """
        Consistency: 1 - min(1, std(gaps) / max(mean(gaps), 0.5)).
        With fewer than 3 attempts (2 gaps), store 0.5.
        """
        if len(self.all_attempt_dts) < 3:
            return 0.5

        sorted_dts = sorted(self.all_attempt_dts)
        # Compute gaps in days
        gaps = [(sorted_dts[i] - sorted_dts[i - 1]).total_seconds() / 86400.0 for i in range(1, len(sorted_dts))]
        if len(gaps) < 2:
            return 0.5

        mean_gap = max(float(np.mean(gaps)), 0.5)
        std_gap = float(np.std(gaps))
        ratio = min(1.0, std_gap / mean_gap)
        return float(round(1.0 - ratio, 4))

    def compute_engagement(self, as_of: datetime, cohort_median_7d: float = 1.0) -> float:
        """
        Attempts in 7 days before prediction time divided by cohort median
        (capped at 1, median floored at 1).
        """
        w_start = as_of - timedelta(days=7)
        recent_count = sum(1 for dt in self.all_attempt_dts if w_start <= dt <= as_of)
        median_val = max(1.0, float(cohort_median_7d))
        return float(round(min(1.0, recent_count / median_val), 4))

    def get_effective_mastery(self, concept_id: int, as_of: Optional[datetime] = None) -> float:
        """
        Applies forgetting rule:
        m_effective = prior + (m - prior) * exp(-0.015 * days_since_last_attempt).
        """
        if as_of is None:
            as_of = datetime.now(timezone.utc)
        else:
            as_of = parse_iso_dt(as_of)
        prior = self.get_concept_prior(concept_id)
        m = self.raw_mastery.get(concept_id, prior)
        if concept_id not in self.last_attempt_dt:
            return float(round(prior, 4))

        last_dt = self.last_attempt_dt[concept_id]
        days_passed = max(0.0, (as_of - last_dt).total_seconds() / 86400.0)
        decay = math.exp(-0.015 * days_passed)
        m_eff = prior + (m - prior) * decay
        return float(round(np.clip(m_eff, 0.0, 1.0), 4))

    def get_confidence(self, concept_id: int) -> str:
        """Confidence band: low (< 3), medium (3-5), high (> 5)."""
        count = self.attempt_counts.get(concept_id, 0)
        if count < 3:
            return "low"
        elif count <= 5:
            return "medium"
        else:
            return "high"

    def get_state(self, as_of: Optional[datetime] = None, cohort_median_7d: float = 1.0) -> Dict[str, Any]:
        """Returns the full twin snapshot dictionary matching Section 5.1."""
        if as_of is None:
            as_of = max(self.all_attempt_dts) if self.all_attempt_dts else datetime.now(timezone.utc)
        else:
            as_of = parse_iso_dt(as_of)

        effective_mastery = {}
        confidence = {}
        velocity = {}

        for cid in self.graph.get_topological_order():
            effective_mastery[str(cid)] = self.get_effective_mastery(cid, as_of)
            confidence[str(cid)] = self.get_confidence(cid)
            velocity[str(cid)] = self.compute_velocity(cid)

        # Risk summary based on effective mastery bands (< 0.5 high, 0.5-0.7 medium, >= 0.7 low)
        high_c = sum(1 for m in effective_mastery.values() if m < 0.50)
        med_c = sum(1 for m in effective_mastery.values() if 0.50 <= m < 0.70)
        low_c = sum(1 for m in effective_mastery.values() if m >= 0.70)

        return {
            "student_id": self.student_id,
            "as_of": as_of.isoformat(),
            "mastery": effective_mastery,
            "raw_mastery": {str(k): round(v, 4) for k, v in self.raw_mastery.items()},
            "confidence": confidence,
            "velocity": velocity,
            "consistency": self.compute_consistency(),
            "engagement": self.compute_engagement(as_of, cohort_median_7d),
            "risk_summary": {
                "high": high_c,
                "medium": med_c,
                "low": low_c,
            },
            "attempt_counts": {str(k): v for k, v in self.attempt_counts.items()},
        }

