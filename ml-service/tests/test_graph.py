"""
ml-service/tests/test_graph.py

Unit tests for the Knowledge Graph and Root Gap algorithm (Section 4.4):
1. test_root_gap_chain: Single chain A -> B -> C
2. test_root_gap_diamond: Diamond DAG A -> (B, C) -> D
3. test_root_gap_two_roots: Two independent roots A -> C and B -> C
4. test_root_gap_no_gap: All ancestors and target strong
5. test_root_gap_target_itself_weak: Ancestors strong, target itself weak
6. test_root_gap_weak_node_with_weak_ancestor: Prunes intermediate weak node having a weak parent
7. test_production_graph_validation: Validates full 38-concept graph from disk
8. test_demo_student_1_arrays_root_gap: Verifies Arrays as root gap for Linked Lists & Trees
"""

import sys
from pathlib import Path
import pytest

# Ensure ml-service is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.graph import KnowledgeGraphService

def test_root_gap_chain():
    """
    Case 1: Chain graph A -> B -> C
    When A is weak (< 0.6) and B is weak (< 0.6),
    the root gap for target C must be A (the deepest weak ancestor).
    """
    nodes = [
        {"id": 1, "code": "A", "name": "Concept A", "level": 1},
        {"id": 2, "code": "B", "name": "Concept B", "level": 2},
        {"id": 3, "code": "C", "name": "Concept C", "level": 3},
    ]
    edges = [
        {"from": 1, "to": 2},
        {"from": 2, "to": 3},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.35, 2: 0.45, 3: 0.20}
    gaps = service.find_root_gaps(mastery, target_concept_id=3)

    assert len(gaps) == 1
    assert gaps[0]["root_gap_id"] == 1
    assert gaps[0]["chain"] == [1, 2, 3]
    assert gaps[0]["is_target_itself"] is False

def test_root_gap_diamond():
    """
    Case 2: Diamond graph:
        A -> B -> D
        A -> C -> D
    When A is weak, B and C are weak, the root gap for D must be A.
    """
    nodes = [
        {"id": 1, "code": "A", "name": "A", "level": 1},
        {"id": 2, "code": "B", "name": "B", "level": 2},
        {"id": 3, "code": "C", "name": "C", "level": 2},
        {"id": 4, "code": "D", "name": "D", "level": 3},
    ]
    edges = [
        {"from": 1, "to": 2},
        {"from": 1, "to": 3},
        {"from": 2, "to": 4},
        {"from": 3, "to": 4},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.30, 2: 0.40, 3: 0.45, 4: 0.25}
    gaps = service.find_root_gaps(mastery, target_concept_id=4)

    assert len(gaps) == 1
    assert gaps[0]["root_gap_id"] == 1
    assert gaps[0]["chain"][0] == 1
    assert gaps[0]["chain"][-1] == 4

def test_root_gap_two_roots():
    """
    Case 3: Two independent roots:
        A -> C
        B -> C
    When both A and B are weak, both must be identified as root gaps.
    """
    nodes = [
        {"id": 1, "code": "A", "name": "A", "level": 1},
        {"id": 2, "code": "B", "name": "B", "level": 1},
        {"id": 3, "code": "C", "name": "C", "level": 2},
    ]
    edges = [
        {"from": 1, "to": 3},
        {"from": 2, "to": 3},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.30, 2: 0.20, 3: 0.40}
    gaps = service.find_root_gaps(mastery, target_concept_id=3)

    assert len(gaps) == 2
    root_ids = {g["root_gap_id"] for g in gaps}
    assert root_ids == {1, 2}
    # Lower mastery (0.20) should rank higher
    assert gaps[0]["root_gap_id"] == 2

def test_root_gap_no_gap():
    """
    Case 4: No gap:
    All ancestors and target concept have mastery >= 0.6.
    Must return an empty list.
    """
    nodes = [
        {"id": 1, "code": "A", "name": "A", "level": 1},
        {"id": 2, "code": "B", "name": "B", "level": 2},
        {"id": 3, "code": "C", "name": "C", "level": 3},
    ]
    edges = [
        {"from": 1, "to": 2},
        {"from": 2, "to": 3},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.85, 2: 0.90, 3: 0.78}
    gaps = service.find_root_gaps(mastery, target_concept_id=3)

    assert gaps == []

def test_root_gap_target_itself_weak():
    """
    Case 5: Target itself weak, ancestors strong:
    Ancestors A and B have mastery >= 0.6, but target C has mastery < 0.6.
    Target C itself must be identified as the gap.
    """
    nodes = [
        {"id": 1, "code": "A", "name": "A", "level": 1},
        {"id": 2, "code": "B", "name": "B", "level": 2},
        {"id": 3, "code": "C", "name": "C", "level": 3},
    ]
    edges = [
        {"from": 1, "to": 2},
        {"from": 2, "to": 3},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.88, 2: 0.92, 3: 0.42}
    gaps = service.find_root_gaps(mastery, target_concept_id=3)

    assert len(gaps) == 1
    assert gaps[0]["root_gap_id"] == 3
    assert gaps[0]["chain"] == [3]
    assert gaps[0]["is_target_itself"] is True

def test_root_gap_weak_node_with_weak_ancestor():
    """
    Case 6: Weak node with a weak ancestor:
    Chain: A -> B -> C -> D
    A=0.25 (weak), B=0.50 (weak), C=0.85 (strong), D=0.30 (weak)
    Target D has weak ancestors A and B.
    Since B has weak ancestor A, B must be pruned and only A returned as root gap.
    """
    nodes = [
        {"id": 1, "code": "A", "name": "A", "level": 1},
        {"id": 2, "code": "B", "name": "B", "level": 2},
        {"id": 3, "code": "C", "name": "C", "level": 3},
        {"id": 4, "code": "D", "name": "D", "level": 4},
    ]
    edges = [
        {"from": 1, "to": 2},
        {"from": 2, "to": 3},
        {"from": 3, "to": 4},
    ]
    service = KnowledgeGraphService(nodes=nodes, edges=edges)

    mastery = {1: 0.25, 2: 0.50, 3: 0.85, 4: 0.30}
    gaps = service.find_root_gaps(mastery, target_concept_id=4)

    assert len(gaps) == 1
    assert gaps[0]["root_gap_id"] == 1
    assert gaps[0]["chain"] == [1, 2, 3, 4]

def test_production_graph_validation():
    """
    Validates that the production graph (data/graph.json) loads correctly,
    has exactly 38 concepts, and topological ordering is valid.
    """
    service = KnowledgeGraphService()
    topo = service.get_topological_order()
    assert len(topo) == 38
    assert len(service.nodes_by_id) == 38

def test_demo_student_1_arrays_root_gap():
    """
    Core project demo scenario:
    Student has weak Arrays (C07, id 7 = 0.25), but Level 1 is strong (0.85).
    When student attempts Singly Linked Lists (C12, id 12) or Binary Trees (C21, id 21),
    the root gap algorithm must pinpoint Arrays (C07) as the root cause.
    """
    service = KnowledgeGraphService()

    # Student mastery: Level 1 strong, Arrays (7) weak, Linked Lists (12) weak, Binary Trees (21) weak
    mastery = {
        1: 0.85, 2: 0.90, 3: 0.88, 4: 0.85, 5: 0.80, 6: 0.82, # Level 1 strong
        7: 0.25, # Arrays WEAK
        12: 0.30, # Linked Lists WEAK
        21: 0.20, # Binary Trees WEAK
    }

    # For Linked Lists (12)
    gaps_ll = service.find_root_gaps(mastery, target_concept_id=12)
    assert len(gaps_ll) >= 1
    assert gaps_ll[0]["root_gap_id"] == 7
    assert gaps_ll[0]["code"] == "C07"

    # For Binary Trees (21)
    gaps_bt = service.find_root_gaps(mastery, target_concept_id=21)
    assert len(gaps_bt) >= 1
    root_ids = [g["root_gap_id"] for g in gaps_bt]
    assert 7 in root_ids  # Arrays must be diagnosed as root gap
