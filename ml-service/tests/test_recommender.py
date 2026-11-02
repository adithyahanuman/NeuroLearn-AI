"""
ml-service/tests/test_recommender.py

Unit tests for RecommenderService according to Section 7.1 and Phase 6 checklist:
1. Test: A prerequisite always comes before its dependent in the path.
2. Test: The path never exceeds 10 steps and every step has a reason and a resource.
3. Test: A student with no weak concepts gets an empty path.
4. Test: Two runs on the same input give identical paths (determinism).
5. Test: Resource selection picks practice for low mastery and harder items for high mastery.
"""

import pytest
from pathlib import Path

from app.services.graph import KnowledgeGraphService, get_graph_service
from app.services.twin import DigitalLearningTwin
from app.services.recommender import RecommenderService


@pytest.fixture
def graph():
    data_path = Path(__file__).resolve().parent.parent.parent / "data" / "graph.json"
    return KnowledgeGraphService(str(data_path))


@pytest.fixture
def recommender(graph):
    resources_path = Path(__file__).resolve().parent.parent.parent / "data" / "resources.json"
    return RecommenderService(graph, resources_path=resources_path)


def test_prerequisite_always_comes_before_dependent(recommender, graph):
    """
    Test 1: Verify that every prerequisite in the candidate set strictly
    precedes any of its dependent concepts in the generated learning path.
    """
    twin = DigitalLearningTwin(student_id="test-student-order", graph_service=graph)
    # Simulate a student weak on Arrays (7), Linked Lists (12), Trees (21), and Graphs (27)
    # where 7 is prerequisite to 12, 12 to 21, etc.
    twin.apply_attempts([
        {"concept_id": 7, "score": 0.20, "time_spent_seconds": 60, "hints_used": 2, "assessment_type": "practice"},
        {"concept_id": 12, "score": 0.25, "time_spent_seconds": 90, "hints_used": 3, "assessment_type": "practice"},
        {"concept_id": 21, "score": 0.30, "time_spent_seconds": 120, "hints_used": 2, "assessment_type": "quiz"},
    ])

    path = recommender.recommend_path(twin)
    assert len(path) > 0

    path_cids = [step["conceptId"] for step in path]
    step_indices = {cid: idx for idx, cid in enumerate(path_cids)}

    # For every concept in the path, all its ancestors that appear in the path must have a smaller index
    for cid in path_cids:
        ancestors = graph.get_ancestors(cid)
        for anc in ancestors:
            if anc in step_indices:
                assert step_indices[anc] < step_indices[cid], (
                    f"Prerequisite concept {anc} appears after dependent concept {cid} in path: {path_cids}"
                )


def test_path_never_exceeds_10_steps_and_has_reasons_and_resources(recommender, graph):
    """
    Test 2: Path is capped at 10 steps, and every step contains a valid resource,
    estimated minutes, and a human-readable reason.
    """
    # Student with many weak concepts across the curriculum
    twin = DigitalLearningTwin(student_id="test-student-weak-many", graph_service=graph)
    attempts = []
    for cid in graph.get_topological_order():
        attempts.append({"concept_id": cid, "score": 0.25, "time_spent_seconds": 45, "hints_used": 2})
    twin.apply_attempts(attempts)

    path = recommender.recommend_path(twin, max_steps=10)

    assert len(path) <= 10
    assert len(path) > 0

    for step in path:
        assert "conceptId" in step
        assert "conceptName" in step
        assert "resourceId" in step and step["resourceId"] is not None
        assert "resourceTitle" in step and len(step["resourceTitle"]) > 0
        assert "resourceUrl" in step
        assert "minutes" in step and step["minutes"] > 0
        assert "reason" in step and len(step["reason"]) > 0
        assert not step["reason"].startswith("{")
        assert not step["reason"].endswith("}")


def test_student_with_no_weak_concepts_gets_empty_path(recommender, graph):
    """
    Test 3: A strong student with all concepts mastered (mastery >= 0.60, risk < 0.50)
    receives an empty learning path.
    """
    twin = DigitalLearningTwin(student_id="test-student-strong", graph_service=graph)
    # Simulate high scores across all concepts (5 attempts each so mastery reaches ~0.90)
    strong_attempts = []
    for cid in graph.get_topological_order():
        for _ in range(5):
            strong_attempts.append({"concept_id": cid, "score": 1.0, "time_spent_seconds": 30, "hints_used": 0, "assessment_type": "quiz"})
    twin.apply_attempts(strong_attempts)

    # All predictions low risk
    preds = [{"conceptId": cid, "risk": 0.10} for cid in graph.get_topological_order()]

    path = recommender.recommend_path(twin, predictions=preds)
    assert path == []


def test_two_runs_on_same_input_give_identical_path(recommender, graph):
    """
    Test 4: Determinism test – two calls with the same twin and inputs produce
    identical ordered paths.
    """
    twin = DigitalLearningTwin(student_id="test-student-det", graph_service=graph)
    twin.apply_attempts([
        {"concept_id": 1, "score": 0.90, "time_spent_seconds": 40},
        {"concept_id": 7, "score": 0.35, "time_spent_seconds": 120, "hints_used": 2},
        {"concept_id": 12, "score": 0.40, "time_spent_seconds": 90, "hints_used": 1},
    ])

    path1 = recommender.recommend_path(twin)
    path2 = recommender.recommend_path(twin)

    assert path1 == path2


def test_pick_resource_logic(recommender):
    """
    Test 5: Resource choice prefers practice when mastery < 0.30
    and harder difficulty when mastery > 0.60.
    """
    # Concept 7 (Arrays)
    res_low = recommender.pick_resource(7, mastery=0.15)
    assert res_low["type"] == "practice"

    res_high = recommender.pick_resource(7, mastery=0.85)
    assert res_high["difficulty"] >= 2
