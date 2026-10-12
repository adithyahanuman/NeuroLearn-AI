"""
ml-service/tests/test_twin.py

Unit tests for the Digital Learning Twin Engine (Section 5.3):
1. Repeated high scores raise mastery and never pass 1.0.
2. Repeated low scores lower mastery and never go below 0.0.
3. Forgetting moves mastery toward prior and never past it.
4. No attempts gives prior and low confidence everywhere.
5. Velocity computes slope on >= 3 scores, returns 0 on < 3.
6. Consistency computes regularity, falls back to 0.5 on < 3 attempts.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.twin import DigitalLearningTwin
from app.services.graph import KnowledgeGraphService

@pytest.fixture
def graph_service():
    nodes = [
        {"id": 1, "code": "C01", "name": "A", "level": 1, "difficulty": 1},
        {"id": 2, "code": "C02", "name": "B", "level": 2, "difficulty": 2},
    ]
    edges = [{"from": 1, "to": 2, "strength": 1.0}]
    return KnowledgeGraphService(nodes=nodes, edges=edges)

def test_twin_no_attempts_gives_prior_and_low_confidence(graph_service):
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph_service)
    state = twin.get_state()

    # Level 1 has prior 0.40
    assert state["mastery"]["1"] == pytest.approx(0.40, abs=0.01)
    # Level 2 has prior 0.20 + 0.40 * 0.40 = 0.36
    assert state["mastery"]["2"] == pytest.approx(0.36, abs=0.01)

    assert state["confidence"]["1"] == "low"
    assert state["confidence"]["2"] == "low"
    assert state["consistency"] == 0.5

def test_twin_repeated_high_scores_raise_mastery(graph_service):
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph_service)
    now = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)

    initial_m = twin.raw_mastery[1]
    for i in range(15):
        twin.apply_attempt({
            "concept_id": 1,
            "score": 1.0,
            "assessment_type": "quiz",
            "attempted_at": (now + timedelta(hours=i)).isoformat(),
        })

    final_m = twin.raw_mastery[1]
    assert final_m > initial_m
    assert final_m <= 1.0
    assert twin.get_confidence(1) == "high"

def test_twin_repeated_low_scores_lower_mastery(graph_service):
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph_service)
    now = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)

    initial_m = twin.raw_mastery[1]
    for i in range(15):
        twin.apply_attempt({
            "concept_id": 1,
            "score": 0.0,
            "assessment_type": "quiz",
            "attempted_at": (now + timedelta(hours=i)).isoformat(),
        })

    final_m = twin.raw_mastery[1]
    assert final_m < initial_m
    assert final_m >= 0.0

def test_twin_forgetting_moves_toward_prior(graph_service):
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph_service)
    t0 = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)
    prior = twin.get_concept_prior(1)  # 0.40

    # Raise mastery with perfect score
    twin.apply_attempt({
        "concept_id": 1,
        "score": 0.95,
        "assessment_type": "quiz",
        "attempted_at": t0.isoformat(),
    })
    m_after_attempt = twin.raw_mastery[1]
    assert m_after_attempt > prior

    # Immediate query has decay ~ 1
    m_day0 = twin.get_effective_mastery(1, as_of=t0)
    assert m_day0 == pytest.approx(m_after_attempt, abs=0.01)

    # After 30 days, forgetting should decay toward prior
    t_30d = t0 + timedelta(days=30)
    m_day30 = twin.get_effective_mastery(1, as_of=t_30d)

    assert m_day30 < m_day0
    assert m_day30 >= prior  # Never drops past the prior

    # If mastery was below prior, forgetting moves up toward prior
    twin_low = DigitalLearningTwin(student_id="test-student-2", graph_service=graph_service)
    twin_low.apply_attempt({
        "concept_id": 1,
        "score": 0.10,
        "assessment_type": "quiz",
        "attempted_at": t0.isoformat(),
    })
    m_low_0 = twin_low.get_effective_mastery(1, as_of=t0)
    assert m_low_0 < prior
    m_low_30 = twin_low.get_effective_mastery(1, as_of=t_30d)
    assert m_low_30 > m_low_0  # Moves up toward prior
    assert m_low_30 <= prior  # Never passes prior

def test_twin_velocity_and_consistency(graph_service):
    twin = DigitalLearningTwin(student_id="test-student", graph_service=graph_service)
    t0 = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)

    # 1 attempt: velocity 0, consistency 0.5
    twin.apply_attempt({
        "concept_id": 1,
        "score": 0.50,
        "attempted_at": t0.isoformat(),
    })
    assert twin.compute_velocity(1) == 0.0
    assert twin.compute_consistency() == 0.5

    # 3 attempts with increasing scores
    twin.apply_attempt({
        "concept_id": 1,
        "score": 0.65,
        "attempted_at": (t0 + timedelta(days=1)).isoformat(),
    })
    twin.apply_attempt({
        "concept_id": 1,
        "score": 0.80,
        "attempted_at": (t0 + timedelta(days=2)).isoformat(),
    })

    vel = twin.compute_velocity(1)
    assert vel > 0.0  # Positive velocity
    cons = twin.compute_consistency()
    assert 0.0 <= cons <= 1.0

