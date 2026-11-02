"""
ml-service/app/config.py

Recommender and ML system configurations for NeuroLearn AI (Phase 6).
Tuned via training/simulator.py across 50 candidate weight sets.
"""

from typing import Dict

# Tuned Recommender Priority Scoring Weights (Section 7.1 & Section 17.8)
# priority = severity * 0.469 + impact * 0.228 + readiness * 0.208 - effort * 0.096
RECOMMENDER_WEIGHTS: Dict[str, float] = {
    "severity": 0.469,
    "impact": 0.228,
    "readiness": 0.208,
    "effort": 0.096,
}

# Remediation path caps
MAX_PATH_STEPS: int = 10
AT_RISK_THRESHOLD: float = 0.50
WEAK_MASTERY_THRESHOLD: float = 0.50
PREREQUISITE_READY_THRESHOLD: float = 0.60
BENCHMARK_EFFORT_MINUTES: float = 120.0
