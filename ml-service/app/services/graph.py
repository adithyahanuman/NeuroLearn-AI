"""
ml-service/app/services/graph.py

Knowledge Graph service providing:
1. Ancestors and descendants lookups.
2. Topological ordering of concepts.
3. Prerequisite chain computation (shortest path).
4. Root gap identification algorithm according to Section 4.4:
   - Identify weak ancestors (< 0.6 mastery).
   - Filter out candidates that have an ancestor that is also weak.
   - Return root gaps ranked by (1 - mastery) * blocked_descendants.
   - If no ancestor is weak, target itself is the gap (if target itself is weak).
"""

from typing import Dict, List, Any, Optional, Union
from pathlib import Path
import json
import networkx as nx

class KnowledgeGraphService:
    def __init__(
        self,
        graph_path: Optional[Union[str, Path]] = None,
        graph_data: Optional[Dict[str, Any]] = None,
        nodes: Optional[List[Dict[str, Any]]] = None,
        edges: Optional[List[Dict[str, Any]]] = None,
    ):
        """
        Initializes graph from either:
        - graph_data dict
        - graph_path JSON file (defaults to data/graph.json if exists)
        - explicit nodes and edges lists (for lightweight unit testing)
        """
        self.g = nx.DiGraph()
        self.nodes_by_id: Dict[Any, Dict[str, Any]] = {}
        self.code_to_id: Dict[str, Any] = {}

        if nodes is not None and edges is not None:
            self._init_from_nodes_edges(nodes, edges)
        elif graph_data is not None:
            self._init_from_graph_data(graph_data)
        else:
            if graph_path is None:
                # Default search paths
                candidates = [
                    Path("data/graph.json"),
                    Path("../data/graph.json"),
                    Path(__file__).resolve().parent.parent.parent.parent / "data" / "graph.json",
                ]
                for c in candidates:
                    if c.exists():
                        graph_path = c
                        break

            if graph_path and Path(graph_path).exists():
                with open(graph_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._init_from_graph_data(data)
            else:
                raise FileNotFoundError(f"Graph file could not be found at {graph_path}")

    def _init_from_graph_data(self, data: Dict[str, Any]):
        for node in data.get("nodes", []):
            nid = node["id"]
            self.nodes_by_id[nid] = node
            if "code" in node:
                self.code_to_id[node["code"]] = nid
            self.g.add_node(nid, **node)

        for edge in data.get("edges", []):
            src = edge["from"]
            dst = edge["to"]
            strength = edge.get("strength", 1.0)
            self.g.add_edge(src, dst, strength=strength)

    def _init_from_nodes_edges(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
        for node in nodes:
            nid = node["id"]
            self.nodes_by_id[nid] = node
            if "code" in node:
                self.code_to_id[node["code"]] = nid
            self.g.add_node(nid, **node)

        for edge in edges:
            src = edge["from"]
            dst = edge["to"]
            strength = edge.get("strength", 1.0)
            self.g.add_edge(src, dst, strength=strength)

    def get_ancestors(self, concept_id: Any) -> List[Any]:
        """
        Returns all prerequisite concepts (upstream ancestors) that reach concept_id.
        """
        cid = self._normalize_id(concept_id)
        if cid not in self.g:
            return []
        return sorted(list(nx.ancestors(self.g, cid)))

    def get_descendants(self, concept_id: Any) -> List[Any]:
        """
        Returns all dependent concepts (downstream descendants) reachable from concept_id.
        """
        cid = self._normalize_id(concept_id)
        if cid not in self.g:
            return []
        return sorted(list(nx.descendants(self.g, cid)))

    def get_parents(self, concept_id: Any) -> List[Any]:
        """
        Returns direct prerequisite concepts (predecessors in nx DiGraph).
        """
        cid = self._normalize_id(concept_id)
        if cid not in self.g:
            return []
        return sorted(list(self.g.predecessors(cid)))

    def get_children(self, concept_id: Any) -> List[Any]:
        """
        Returns direct dependent concepts (successors in nx DiGraph).
        """
        cid = self._normalize_id(concept_id)
        if cid not in self.g:
            return []
        return sorted(list(self.g.successors(cid)))

    def get_topological_order(self) -> List[Any]:
        """
        Returns topological ordering of concept IDs.
        """
        return list(nx.topological_sort(self.g))

    def get_shortest_chain(self, source_id: Any, target_id: Any) -> List[Any]:
        """
        Returns shortest path from source_id to target_id (e.g., [source, ..., target]).
        """
        src = self._normalize_id(source_id)
        dst = self._normalize_id(target_id)
        if src == dst:
            return [src]
        try:
            return nx.shortest_path(self.g, source=src, target=dst)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return [src, dst]

    def find_root_gaps(
        self,
        mastery_map: Dict[Any, float],
        target_concept_id: Any,
        gap_threshold: float = 0.6,
    ) -> List[Dict[str, Any]]:
        """
        Root Gap Algorithm (Section 4.4):
        Input: student mastery map and target concept T.
        1. Collect all ancestors of T using traversal over prerequisite edges.
        2. Keep ancestors whose mastery is below gap_threshold (0.6). These are gap candidates.
        3. Remove candidates that still have a weak ancestor of their own.
           What remains are the root gaps (the deepest weak nodes).
        4. Return the root gaps plus the shortest chain from each to T,
           ranked by (1 - mastery) * number of descendants it blocks.
        5. If no ancestor is weak, T itself is the gap (if T's mastery is < gap_threshold).
        """
        target = self._normalize_id(target_concept_id)
        if target not in self.g:
            return []

        # Normalize mastery keys to match node types
        norm_mastery: Dict[Any, float] = {}
        for k, v in mastery_map.items():
            norm_k = self._normalize_id(k)
            norm_mastery[norm_k] = float(v)

        ancestors = self.get_ancestors(target)
        gap_candidates = {
            anc for anc in ancestors
            if norm_mastery.get(anc, 0.4) < gap_threshold
        }

        root_gap_ids: List[Any] = []
        for cand in gap_candidates:
            cand_ancestors = self.get_ancestors(cand)
            # If cand has any ancestor that is also weak (< threshold), cand is NOT a root gap
            has_weak_ancestor = any(
                anc in gap_candidates for anc in cand_ancestors
            )
            if not has_weak_ancestor:
                root_gap_ids.append(cand)

        # Step 5: If no ancestor is weak, check if target itself is weak
        if not root_gap_ids:
            target_mastery = norm_mastery.get(target, 0.4)
            if target_mastery < gap_threshold:
                target_descendants = len(self.get_descendants(target))
                score = (1.0 - target_mastery) * max(1, target_descendants)
                node_info = self.nodes_by_id.get(target, {})
                return [
                    {
                        "root_gap_id": target,
                        "concept_id": target,
                        "code": node_info.get("code", str(target)),
                        "name": node_info.get("name", str(target)),
                        "mastery": target_mastery,
                        "chain": [target],
                        "blocked_descendants": target_descendants,
                        "score": round(score, 4),
                        "is_target_itself": True,
                    }
                ]
            else:
                # No gap exists
                return []

        # Rank root gaps
        ranked_gaps = []
        for r_id in root_gap_ids:
            m = norm_mastery.get(r_id, 0.4)
            desc_count = len(self.get_descendants(r_id))
            score = (1.0 - m) * max(1, desc_count)
            chain = self.get_shortest_chain(r_id, target)
            node_info = self.nodes_by_id.get(r_id, {})

            ranked_gaps.append({
                "root_gap_id": r_id,
                "concept_id": r_id,
                "code": node_info.get("code", str(r_id)),
                "name": node_info.get("name", str(r_id)),
                "mastery": m,
                "chain": chain,
                "blocked_descendants": desc_count,
                "score": round(score, 4),
                "is_target_itself": False,
            })

        # Sort descending by score
        ranked_gaps.sort(key=lambda x: x["score"], reverse=True)
        return ranked_gaps

    def _normalize_id(self, val: Any) -> Any:
        if isinstance(val, str) and val in self.code_to_id:
            return self.code_to_id[val]
        if isinstance(val, str) and val.isdigit():
            int_val = int(val)
            if int_val in self.nodes_by_id:
                return int_val
        return val


# Global singleton instance loaded lazily
_default_graph_service: Optional[KnowledgeGraphService] = None

def get_graph_service() -> KnowledgeGraphService:
    global _default_graph_service
    if _default_graph_service is None:
        _default_graph_service = KnowledgeGraphService()
    return _default_graph_service

