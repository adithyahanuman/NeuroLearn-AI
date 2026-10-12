"""
ml-service/tests/test_reasons.py

Unit tests for natural language reasons and SHAP explanation formatting (Section 6.7).
"""

import re
import pytest

from training.features import FEATURES
from app.services.graph import get_graph_service
from app.services.twin import DigitalLearningTwin
from app.services.reasons import TEMPLATES, GROUPS, build_template_context, top_reasons

def test_every_feature_has_a_template():
    """Ensure every feature in the 15 FEATURES has a corresponding template."""
    for feat in FEATURES:
        assert feat in TEMPLATES, f"Feature '{feat}' is missing a reason template!"
        assert len(TEMPLATES[feat]) > 10, f"Template for '{feat}' is too short."

def test_every_feature_is_grouped():
    """Ensure every feature is mapped to a logical group for near-duplicate merging."""
    for feat in FEATURES:
        assert feat in GROUPS, f"Feature '{feat}' is missing in GROUPS map!"

def test_templates_format_cleanly_without_underscores_or_unfilled_braces():
    """Context substitution must produce clean sentences with no unparsed braces or underscores."""
    graph = get_graph_service()
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph)

    mock_features = {
        "avg_score_last3": 0.42,
        "avg_score_all": 0.51,
        "score_slope_5": -0.15,
        "attempts_count": 2.0,
        "days_since_last_attempt": 14.0,
        "time_ratio": 1.8,
        "hints_rate": 2.5,
        "prereq_mean_mastery": 0.38,
        "prereq_min_mastery": 0.25,
        "n_weak_prereqs": 3.0,
        "concept_difficulty": 4.0,
        "concept_level": 3.0,
        "student_mean_mastery": 0.45,
        "student_consistency": 0.30,
        "student_engagement": 0.50,
    }

    context = build_template_context(
        features=mock_features,
        concept_id=12,  # Linked Lists (depends on Arrays)
        graph=graph,
        twin=twin,
    )

    for feat in FEATURES:
        template = TEMPLATES[feat]
        sentence = template.format(**context)

        # Assert no unfilled braces
        assert "{" not in sentence and "}" not in sentence, f"Unfilled brace in template for {feat}: {sentence}"
        # Assert no raw underscores
        assert "_" not in sentence, f"Raw underscore found in formatted sentence for {feat}: {sentence}"

def test_top_reasons_filters_positives_and_merges_groups():
    """top_reasons must only pick positive SHAP values and merge prerequisite group."""
    graph = get_graph_service()
    mock_features = {f: 0.5 for f in FEATURES}
    mock_features["score_slope_5"] = -0.10
    mock_features["attempts_count"] = 5

    context = build_template_context(mock_features, concept_id=7, graph=graph)

    mock_shap = {
        "prereq_min_mastery": 0.45,    # Group: prerequisites
        "prereq_mean_mastery": 0.35,   # Group: prerequisites (should be merged!)
        "avg_score_last3": 0.25,       # Group: scores
        "days_since_last_attempt": 0.15, # Group: recency
        "student_consistency": -0.30,  # Negative SHAP: must be excluded!
        "student_engagement": 0.05,    # Lower positive SHAP
    }

    reasons = top_reasons(mock_shap, mock_features, context, max_reasons=3)

    assert len(reasons) <= 3
    # First reason should be from the highest positive SHAP (prereq_min_mastery)
    assert any("prerequisite" in r.lower() for r in reasons)
    # Negative SHAP must not appear
    assert not any("consistency" in r.lower() for r in reasons)
    for r in reasons:
        assert "_" not in r
        assert "{" not in r and "}" not in r

