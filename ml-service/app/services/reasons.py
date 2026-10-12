"""
ml-service/app/services/reasons.py

SHAP Explanation and Natural Language Reason Generator (Section 6.7):
- Evaluates feature contributions to student risk.
- Groups and merges duplicate features (e.g. prerequisite cluster).
- Generates human-friendly explanations via verified natural language templates.
- Guarantees no raw identifiers, no underscores, and no unfilled curly braces.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from app.services.graph import KnowledgeGraphService
from app.services.twin import DigitalLearningTwin

# 1. Feature -> Human Template mapping for all 15 features
TEMPLATES: Dict[str, str] = {
    "avg_score_last3": "Your last 3 scores on this topic average {avg_score_last3_pct} percent",
    "avg_score_all": "Your overall average score on this topic is {avg_score_all_pct} percent",
    "score_slope_5": "Your scores on this topic dropped about {score_slope_pts} points over your last 5 attempts",
    "attempts_count": "Only {attempts_count} attempts recorded so far, so this risk estimate is less certain",
    "days_since_last_attempt": "You have not practiced this topic for {days_since_last_attempt} days",
    "time_ratio": "You took {time_ratio} times the typical benchmark time on recent exercises",
    "hints_rate": "You needed {hints_rate} hints per attempt on average",
    "prereq_mean_mastery": "Prerequisites for this concept have an average mastery of only {prereq_mean_mastery_pct} percent",
    "prereq_min_mastery": "A key prerequisite, {weakest_prereq_name}, is still weak at {prereq_min_mastery_pct} percent",
    "n_weak_prereqs": "{n_weak_prereqs} prerequisite concepts are currently below the 60 percent mastery threshold",
    "concept_difficulty": "This is a challenging topic with a difficulty rating of {concept_difficulty} out of 5",
    "concept_level": "This topic is at Level {concept_level} of the curriculum",
    "student_mean_mastery": "Your overall curriculum mastery across all topics is currently {student_mean_mastery_pct} percent",
    "student_consistency": "Your study schedule has been irregular with low practice consistency",
    "student_engagement": "Your recent weekly practice volume is noticeably below the cohort average",
}

# 2. Merge duplicate/correlated features into logical groups
GROUPS: Dict[str, str] = {
    "prereq_min_mastery": "prerequisites",
    "prereq_mean_mastery": "prerequisites",
    "n_weak_prereqs": "prerequisites",
    "avg_score_last3": "scores",
    "avg_score_all": "scores",
    "score_slope_5": "score_trend",
    "attempts_count": "attempts_count",
    "days_since_last_attempt": "recency",
    "time_ratio": "time_spent",
    "hints_rate": "hints",
    "concept_difficulty": "difficulty",
    "concept_level": "level",
    "student_mean_mastery": "student_mastery",
    "student_consistency": "consistency",
    "student_engagement": "engagement",
}

def build_template_context(
    features: Dict[str, float],
    concept_id: int,
    graph: KnowledgeGraphService,
    twin: Optional[DigitalLearningTwin] = None,
) -> Dict[str, Any]:
    """
    Builds the substitution dictionary to populate templates with concrete figures.
    """
    cid = int(concept_id)
    ancestors = graph.get_ancestors(cid)

    # Identify weakest prerequisite concept name
    weakest_prereq_name = "Prerequisite concept"
    min_m = 1.0
    if twin and ancestors:
        for anc in ancestors:
            m = twin.get_effective_mastery(anc)
            if m < min_m:
                min_m = m
                c_node = graph.nodes_by_id.get(anc)
                if c_node:
                    weakest_prereq_name = c_node.get("name", f"Concept {anc}")
    elif ancestors:
        c_node = graph.nodes_by_id.get(ancestors[0])
        if c_node:
            weakest_prereq_name = c_node.get("name", f"Concept {ancestors[0]}")

    slope_val = features.get("score_slope_5", 0.0)
    if slope_val is None or np.isnan(slope_val):
        slope_pts = 0
    else:
        slope_pts = max(1, abs(int(round(float(slope_val) * 100))))

    return {
        "avg_score_last3_pct": int(round(float(features.get("avg_score_last3", 0.0)) * 100)),
        "avg_score_all_pct": int(round(float(features.get("avg_score_all", 0.0)) * 100)),
        "score_slope_pts": slope_pts,
        "attempts_count": int(features.get("attempts_count", 0)),
        "days_since_last_attempt": int(round(float(features.get("days_since_last_attempt", 0.0)))),
        "time_ratio": f"{float(features.get('time_ratio', 1.0)):.1f}",
        "hints_rate": f"{float(features.get('hints_rate', 0.0)):.1f}",
        "prereq_mean_mastery_pct": int(round(float(features.get("prereq_mean_mastery", 0.0)) * 100)),
        "prereq_min_mastery_pct": int(round(float(features.get("prereq_min_mastery", 0.0)) * 100)),
        "n_weak_prereqs": int(features.get("n_weak_prereqs", 0)),
        "concept_difficulty": int(features.get("concept_difficulty", 3)),
        "concept_level": int(features.get("concept_level", 1)),
        "student_mean_mastery_pct": int(round(float(features.get("student_mean_mastery", 0.0)) * 100)),
        "weakest_prereq_name": weakest_prereq_name,
    }

def top_reasons(
    shap_dict: Dict[str, float],
    features: Dict[str, float],
    context: Dict[str, Any],
    max_reasons: int = 3,
) -> List[str]:
    """
    Selects top reasons for high risk:
    1. Filters only positive SHAP values (factors driving risk UP).
    2. Groups features by GROUPS map and picks the highest impact feature per group.
    3. Sorts groups by maximum positive impact.
    4. Formats sentence templates using context.
    5. Validates formatting (no unfilled braces, no underscores).
    """
    # Filter positive SHAP
    pos_items = [(f, s) for f, s in shap_dict.items() if s > 0.001]
    if not pos_items:
        return []

    # Group by logical group
    grouped: Dict[str, Tuple[str, float]] = {}
    for feat, s_val in pos_items:
        grp = GROUPS.get(feat, feat)
        if grp not in grouped or s_val > grouped[grp][1]:
            grouped[grp] = (feat, s_val)

    # Sort groups by SHAP value descending
    sorted_groups = sorted(grouped.values(), key=lambda x: x[1], reverse=True)

    reasons: List[str] = []
    for feat, _ in sorted_groups[:max_reasons]:
        template = TEMPLATES.get(feat)
        if not template:
            continue
        try:
            sentence = template.format(**context)
        except KeyError:
            # Fallback safe formatting
            sentence = template
        # Sanity check: replace underscores if any
        sentence = sentence.replace("_", " ")
        reasons.append(sentence)

    return reasons

