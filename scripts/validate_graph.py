#!/usr/bin/env python3
"""
scripts/validate_graph.py

Validates the academic knowledge graph:
1. Loads concepts.json, prerequisites.json, and resources.json.
2. Asserts concepts exist (exactly 38, levels 1 to 6).
3. Verifies no unknown concept IDs or require IDs.
4. Checks prerequisite constraints:
   - Level 1 concepts have 0 prerequisites.
   - Level 2+ concepts have between 1 and 3 prerequisites.
   - Level ordering: level(requires_id) < level(concept_id).
5. Ensures graph is a Directed Acyclic Graph (DAG) with no cycles.
6. Verifies no isolated concepts (every concept is connected).
7. Verifies every concept has at least 2 resources (at least 1 learning, at least 1 practice).
8. Prints 'graph ok' on success and exits with code 0.
"""

import sys
import json
from pathlib import Path
import networkx as nx

def validate_knowledge_graph(data_dir: Path = None) -> bool:
    if data_dir is None:
        data_dir = Path(__file__).resolve().parent.parent / "data"

    concepts_path = data_dir / "concepts.json"
    prereqs_path = data_dir / "prerequisites.json"
    resources_path = data_dir / "resources.json"

    for p in (concepts_path, prereqs_path, resources_path):
        if not p.exists():
            print(f"ERROR: Missing file {p}", file=sys.stderr)
            return False

    with open(concepts_path, "r", encoding="utf-8") as f:
        concepts = json.load(f)
    with open(prereqs_path, "r", encoding="utf-8") as f:
        prerequisites = json.load(f)
    with open(resources_path, "r", encoding="utf-8") as f:
        resources = json.load(f)

    # 1. Validate concepts count & uniqueness
    if len(concepts) != 38:
        print(f"ERROR: Expected exactly 38 concepts, found {len(concepts)}", file=sys.stderr)
        return False

    concept_ids = set()
    concept_map = {}
    for c in concepts:
        cid = c.get("id")
        code = c.get("code")
        level = c.get("level")
        difficulty = c.get("difficulty")
        if cid in concept_ids:
            print(f"ERROR: Duplicate concept ID {cid}", file=sys.stderr)
            return False
        if not (1 <= level <= 6):
            print(f"ERROR: Concept {code} has invalid level {level} (must be 1-6)", file=sys.stderr)
            return False
        if not (1 <= difficulty <= 5):
            print(f"ERROR: Concept {code} has invalid difficulty {difficulty} (must be 1-5)", file=sys.stderr)
            return False
        concept_ids.add(cid)
        concept_map[cid] = c

    # 2. Build graph and check prerequisites
    g = nx.DiGraph()
    for cid in concept_ids:
        g.add_node(cid, **concept_map[cid])

    prereqs_by_concept = {cid: [] for cid in concept_ids}
    seen_edges = set()

    for p in prerequisites:
        cid = p.get("concept_id")
        req_id = p.get("requires_id")

        if cid not in concept_map:
            print(f"ERROR: Unknown concept_id {cid} in prerequisites", file=sys.stderr)
            return False
        if req_id not in concept_map:
            print(f"ERROR: Unknown requires_id {req_id} in prerequisites", file=sys.stderr)
            return False
        if cid == req_id:
            print(f"ERROR: Self-loop detected on concept {cid}", file=sys.stderr)
            return False

        edge_pair = (req_id, cid)
        if edge_pair in seen_edges:
            print(f"ERROR: Duplicate edge from {req_id} to {cid}", file=sys.stderr)
            return False
        seen_edges.add(edge_pair)

        # Level consistency: prerequisite must be strictly lower level
        if concept_map[req_id]["level"] >= concept_map[cid]["level"]:
            print(
                f"ERROR: Level violation: prerequisite {req_id} (Level {concept_map[req_id]['level']}) "
                f"must be strictly lower than concept {cid} (Level {concept_map[cid]['level']})",
                file=sys.stderr,
            )
            return False

        prereqs_by_concept[cid].append(req_id)
        # Edge direction: requires_id -> concept_id (prerequisite flows to dependent)
        g.add_edge(req_id, cid, strength=p.get("strength", 1.0))

    # 3. Check prerequisite counts per concept
    for cid, c in concept_map.items():
        reqs = prereqs_by_concept[cid]
        level = c["level"]
        if level == 1 and len(reqs) > 0:
            print(f"ERROR: Level 1 concept {c['code']} cannot have prerequisites, got {len(reqs)}", file=sys.stderr)
            return False
        if level > 1 and not (1 <= len(reqs) <= 3):
            print(
                f"ERROR: Level {level} concept {c['code']} must have 1 to 3 prerequisites, got {len(reqs)}",
                file=sys.stderr,
            )
            return False

    # 4. Check DAG property (no cycles)
    if not nx.is_directed_acyclic_graph(g):
        cycles = list(nx.simple_cycles(g))
        print(f"ERROR: Graph contains cycles: {cycles}", file=sys.stderr)
        return False

    # 5. Check no isolated concepts
    for cid in concept_ids:
        in_deg = g.in_degree(cid)
        out_deg = g.out_degree(cid)
        if in_deg == 0 and out_deg == 0:
            print(f"ERROR: Isolated concept found without any edges: {cid} ({concept_map[cid]['code']})", file=sys.stderr)
            return False

    # 6. Check resources
    resources_by_concept = {cid: [] for cid in concept_ids}
    for res in resources:
        cid = res.get("concept_id")
        if cid not in concept_map:
            print(f"ERROR: Resource {res.get('id')} references unknown concept {cid}", file=sys.stderr)
            return False
        rtype = res.get("type")
        if rtype not in ("video", "article", "practice"):
            print(f"ERROR: Resource {res.get('id')} has invalid type '{rtype}'", file=sys.stderr)
            return False
        resources_by_concept[cid].append(res)

    for cid, c in concept_map.items():
        c_res = resources_by_concept[cid]
        if len(c_res) < 2:
            print(f"ERROR: Concept {c['code']} has only {len(c_res)} resources (minimum 2 required)", file=sys.stderr)
            return False
        types = {r["type"] for r in c_res}
        has_learning = bool({"video", "article"} & types)
        has_practice = "practice" in types
        if not (has_learning and has_practice):
            print(
                f"ERROR: Concept {c['code']} must have at least 1 learning resource and 1 practice resource",
                file=sys.stderr,
            )
            return False

    print("graph ok")
    return True

if __name__ == "__main__":
    success = validate_knowledge_graph()
    sys.exit(0 if success else 1)

