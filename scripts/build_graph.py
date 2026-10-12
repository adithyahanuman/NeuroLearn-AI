#!/usr/bin/env python3
"""
scripts/build_graph.py

Reads concepts.json, prerequisites.json, and resources.json,
runs all validation checks, and compiles data/graph.json containing:
- nodes: list of concept objects
- edges: list of {"from": req_id, "to": concept_id, "strength": strength}
- topological_order: list of concept IDs
- ancestors: dict mapping concept ID string to sorted list of ancestor concept IDs
- descendants: dict mapping concept ID string to sorted list of descendant concept IDs
- parents: dict mapping concept ID string to direct prerequisite concept IDs
- children: dict mapping concept ID string to direct dependent concept IDs

Supports the '--check' flag:
Rebuilds the graph structure in memory and verifies it matches the on-disk data/graph.json.
Exits with 0 if identical, or 1 if different or missing.
"""

import sys
import json
import argparse
from pathlib import Path
import networkx as nx

# Import validation function
from validate_graph import validate_knowledge_graph

def generate_graph_dict(data_dir: Path) -> dict:
    concepts_path = data_dir / "concepts.json"
    prereqs_path = data_dir / "prerequisites.json"

    with open(concepts_path, "r", encoding="utf-8") as f:
        concepts = json.load(f)
    with open(prereqs_path, "r", encoding="utf-8") as f:
        prerequisites = json.load(f)

    # Sort concepts by ID
    concepts = sorted(concepts, key=lambda x: x["id"])

    g = nx.DiGraph()
    for c in concepts:
        g.add_node(c["id"], **c)

    edges = []
    parents_map = {str(c["id"]): [] for c in concepts}
    children_map = {str(c["id"]): [] for c in concepts}

    for p in prerequisites:
        req_id = p["requires_id"]
        cid = p["concept_id"]
        strength = p.get("strength", 1.0)

        g.add_edge(req_id, cid, strength=strength)
        edges.append({
            "from": req_id,
            "to": cid,
            "strength": strength
        })
        parents_map[str(cid)].append(req_id)
        children_map[str(req_id)].append(cid)

    # Sort lists for determinism
    for cid_str in parents_map:
        parents_map[cid_str].sort()
    for cid_str in children_map:
        children_map[cid_str].sort()

    topo_order = list(nx.topological_sort(g))

    ancestors_map = {}
    descendants_map = {}
    for c in concepts:
        cid = c["id"]
        cid_str = str(cid)
        # nx.ancestors(G, source) returns all nodes having a path to source
        ancestors_map[cid_str] = sorted(list(nx.ancestors(g, cid)))
        # nx.descendants(G, source) returns all nodes reachable from source
        descendants_map[cid_str] = sorted(list(nx.descendants(g, cid)))

    return {
        "nodes": concepts,
        "edges": edges,
        "topological_order": topo_order,
        "ancestors": ancestors_map,
        "descendants": descendants_map,
        "parents": parents_map,
        "children": children_map
    }

def main():
    parser = argparse.ArgumentParser(description="Build and check academic knowledge graph.")
    parser.add_argument("--check", action="store_true", help="Check on-disk graph.json against freshly built graph")
    args = parser.parse_args()

    data_dir = Path(__file__).resolve().parent.parent / "data"
    output_path = data_dir / "graph.json"

    # Step 1: Validate input source files
    if not validate_knowledge_graph(data_dir):
        print("Validation failed. Aborting graph build.", file=sys.stderr)
        sys.exit(1)

    graph_data = generate_graph_dict(data_dir)
    formatted_json = json.dumps(graph_data, indent=2, ensure_ascii=False) + "\n"

    if args.check:
        if not output_path.exists():
            print(f"ERROR: {output_path} does not exist.", file=sys.stderr)
            sys.exit(1)
        with open(output_path, "r", encoding="utf-8") as f:
            disk_content = f.read()

        # Parse and compare data
        try:
            disk_data = json.loads(disk_content)
        except Exception as e:
            print(f"ERROR: Failed to parse on-disk graph.json: {e}", file=sys.stderr)
            sys.exit(1)

        if disk_data == graph_data:
            print("graph.json is up to date.")
            sys.exit(0)
        else:
            print("ERROR: On-disk graph.json differs from freshly built graph.", file=sys.stderr)
            sys.exit(1)
    else:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(formatted_json)
        print(f"Successfully generated {output_path} ({len(graph_data['nodes'])} nodes, {len(graph_data['edges'])} edges).")
        sys.exit(0)

if __name__ == "__main__":
    main()
