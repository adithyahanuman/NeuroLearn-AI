"""
ml-service/app/services/recommender.py

Personalized Remediation Learning Path Recommender for NeuroLearn AI (Section 7.1):
1. Candidate Set Builder:
   - Target concepts: risk >= 0.50 OR mastery < 0.50.
   - Candidate set = Targets UNION all root gaps computed for those targets.
2. Candidate Priority Scoring:
   - priority = w_severity * severity + w_impact * impact + w_readiness * readiness - w_effort * effort.
   - severity = 1 - mastery.
   - impact = at_risk_descendants / max_unblocked.
   - readiness = fraction of prerequisites with mastery >= 0.60.
   - effort = min(1.0, est_minutes / 120.0).
3. Topological Ordering Loop:
   - A prerequisite candidate always comes before its dependent candidate.
   - Chooses the ready candidate with highest priority score.
4. Resource Selection:
   - Difficulty closest to ceil(mastery * 5).
   - Prefers practice when mastery < 0.30; prefers harder when mastery > 0.60.
5. Path Caps:
   - At most 10 steps.
   - Every step includes concept, resource, minutes, and one-line explanatory reason.
   - Empty path for students with no weak concepts.
   - Deterministic: identical inputs produce identical paths.
"""

from typing import Dict, List, Any, Optional, Union, Set
from pathlib import Path
import json
import math

from app.services.graph import KnowledgeGraphService
from app.services.twin import DigitalLearningTwin
from app.config import (
    RECOMMENDER_WEIGHTS,
    MAX_PATH_STEPS,
    AT_RISK_THRESHOLD,
    WEAK_MASTERY_THRESHOLD,
    PREREQUISITE_READY_THRESHOLD,
    BENCHMARK_EFFORT_MINUTES,
)


class RecommenderService:
    def __init__(
        self,
        graph_service: KnowledgeGraphService,
        resources_path: Optional[Union[str, Path]] = None,
        resources: Optional[List[Dict[str, Any]]] = None,
        weights: Optional[Dict[str, float]] = None,
    ):
        self.graph = graph_service
        self.weights = weights or RECOMMENDER_WEIGHTS.copy()
        self.resources_by_concept: Dict[int, List[Dict[str, Any]]] = {}

        if resources is not None:
            self._init_resources(resources)
        else:
            self._load_resources(resources_path)

    def _init_resources(self, resources_list: List[Dict[str, Any]]):
        self.resources_by_concept.clear()
        for r in resources_list:
            cid = int(r["concept_id"])
            if cid not in self.resources_by_concept:
                self.resources_by_concept[cid] = []
            self.resources_by_concept[cid].append(r)

    def _load_resources(self, resources_path: Optional[Union[str, Path]]):
        if resources_path and Path(resources_path).exists():
            target_path = Path(resources_path)
        else:
            candidates = [
                Path("data/resources.json"),
                Path("../data/resources.json"),
                Path(__file__).resolve().parent.parent.parent.parent / "data" / "resources.json",
            ]
            target_path = None
            for c in candidates:
                if c.exists():
                    target_path = c
                    break

        if target_path and target_path.exists():
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._init_resources(data)
        else:
            # Fallback mock resources for testing
            for cid in self.graph.get_topological_order():
                self.resources_by_concept[cid] = [
                    {
                        "id": cid * 10 + 1,
                        "concept_id": cid,
                        "title": f"Study Material for Concept {cid}",
                        "type": "article",
                        "url": f"https://resources.neurolearn.ai/concept/{cid}/read",
                        "difficulty": 2,
                        "est_minutes": 25,
                    },
                    {
                        "id": cid * 10 + 2,
                        "concept_id": cid,
                        "title": f"Interactive Practice for Concept {cid}",
                        "type": "practice",
                        "url": f"https://resources.neurolearn.ai/concept/{cid}/practice",
                        "difficulty": 3,
                        "est_minutes": 30,
                    },
                ]

    def pick_resource(self, concept_id: int, mastery: float) -> Dict[str, Any]:
        """
        Picks resource whose difficulty is closest to ceil(mastery * 5),
        preferring practice when mastery < 0.30 and harder when mastery > 0.60.
        """
        res_list = self.resources_by_concept.get(concept_id, [])
        if not res_list:
            return {
                "id": concept_id * 100,
                "concept_id": concept_id,
                "title": f"Resource for Concept {concept_id}",
                "type": "practice",
                "url": f"https://neurolearn.ai/concepts/{concept_id}",
                "difficulty": 2,
                "est_minutes": 25,
            }

        target_diff = max(1, min(5, int(math.ceil(max(0.01, mastery) * 5.0))))

        def resource_score(r: Dict[str, Any]) -> float:
            diff = int(r.get("difficulty", 3))
            dist = abs(diff - target_diff)

            penalty = float(dist)

            # Prefer practice item when mastery < 0.30
            if mastery < 0.30 and r.get("type") == "practice":
                penalty -= 0.6

            # Prefer harder item when mastery > 0.60
            if mastery > 0.60 and diff >= target_diff:
                penalty -= 0.4

            return penalty

        # Return resource with minimum penalty (best match); tie-break by ID
        sorted_res = sorted(res_list, key=lambda r: (resource_score(r), r["id"]))
        return sorted_res[0]

    def recommend_path(
        self,
        twin: DigitalLearningTwin,
        predictions: Optional[List[Dict[str, Any]]] = None,
        as_of: Optional[Any] = None,
        weights: Optional[Dict[str, float]] = None,
        max_steps: int = MAX_PATH_STEPS,
    ) -> List[Dict[str, Any]]:
        """
        Unified path generation algorithm (Section 7.1).
        Guarantees:
        1. A prerequisite always comes before its dependent in the path.
        2. Output never exceeds max_steps (default 10).
        3. A student with no weak concepts gets an empty path.
        4. Completely deterministic.
        """
        w = weights or self.weights
        w_sev = w.get("severity", 0.40)
        w_imp = w.get("impact", 0.30)
        w_read = w.get("readiness", 0.20)
        w_eff = w.get("effort", 0.10)

        all_concepts = self.graph.get_topological_order()
        mastery_map = {cid: float(twin.get_effective_mastery(cid, as_of)) for cid in all_concepts}

        # Build risk map from predictions or estimate
        risk_map: Dict[int, float] = {}
        if predictions:
            for p in predictions:
                cid = int(p.get("conceptId", p.get("concept_id", 0)))
                risk_map[cid] = float(p.get("risk", 0.50))
        else:
            # If no predictions passed, infer risk from mastery
            for cid in all_concepts:
                m = mastery_map[cid]
                risk_map[cid] = float(max(0.0, min(1.0, 1.0 - m + 0.1)))

        # 1. Target Set: concepts with risk >= 0.50 OR mastery < 0.50
        targets: Set[int] = set()
        for cid in all_concepts:
            if risk_map.get(cid, 0.0) >= AT_RISK_THRESHOLD or mastery_map.get(cid, 1.0) < WEAK_MASTERY_THRESHOLD:
                targets.add(cid)

        # Empty path if no weak or at-risk concepts
        if not targets:
            return []

        # 2. Candidate Set: Union of targets and their root gaps
        candidates: Set[int] = set(targets)
        root_gap_links: Dict[int, List[int]] = {}  # root_gap -> [blocked targets]

        for t in sorted(list(targets)):
            gaps = self.graph.find_root_gaps(mastery_map, target_concept_id=t, gap_threshold=PREREQUISITE_READY_THRESHOLD)
            for g in gaps:
                rg_id = int(g["root_gap_id"])
                candidates.add(rg_id)
                if rg_id not in root_gap_links:
                    root_gap_links[rg_id] = []
                if t not in root_gap_links[rg_id]:
                    root_gap_links[rg_id].append(t)

        cand_list = sorted(list(candidates))

        # 3. Calculate metrics for each candidate
        descendants_count: Dict[int, int] = {}
        for c in cand_list:
            desc = self.graph.get_descendants(c)
            # Count at-risk targets that this candidate unblocks
            unblocked_targets = [d for d in desc if d in targets]
            descendants_count[c] = len(unblocked_targets)

        max_unblocked = max(descendants_count.values()) if descendants_count else 1
        if max_unblocked == 0:
            max_unblocked = 1

        chosen_resources: Dict[int, Dict[str, Any]] = {}
        priority_scores: Dict[int, float] = {}

        for c in cand_list:
            m = mastery_map.get(c, 0.35)
            sev = 1.0 - m

            imp = descendants_count.get(c, 0) / float(max_unblocked)

            parents = self.graph.get_parents(c)
            if parents:
                ready_count = sum(1 for p in parents if mastery_map.get(p, 0.0) >= PREREQUISITE_READY_THRESHOLD)
                readiness = ready_count / float(len(parents))
            else:
                readiness = 1.00

            res = self.pick_resource(c, m)
            chosen_resources[c] = res
            est_min = float(res.get("est_minutes", 25))
            effort = min(1.0, est_min / BENCHMARK_EFFORT_MINUTES)

            # Priority formula from Section 7.1
            score = (w_sev * sev) + (w_imp * imp) + (w_read * readiness) - (w_eff * effort)
            priority_scores[c] = float(score)

        # 4. Topological Ordering Loop
        # candidate_prereqs[c]: all prerequisites of c that are in the candidate set
        candidate_prereqs: Dict[int, Set[int]] = {}
        for c in cand_list:
            ancestors = self.graph.get_ancestors(c)
            candidate_prereqs[c] = set(ancestors).intersection(candidates)

        placed: Set[int] = set()
        path_cids: List[int] = []
        remaining = set(candidates)

        while remaining and len(path_cids) < max_steps:
            # A candidate is ready if all its candidate prerequisites have already been placed
            ready = [c for c in remaining if candidate_prereqs[c].issubset(placed)]

            if not ready:
                # Cycle fallback (should never occur in DAG): pick candidate with fewest unplaced prereqs
                ready = sorted(
                    remaining,
                    key=lambda c: (
                        len(candidate_prereqs[c] - placed),
                        self.graph.nodes_by_id[c].get("level", 1),
                        -priority_scores[c],
                    ),
                )[:1]

            # Pick the ready candidate with highest priority score.
            # Tie-break deterministically: lower level first, then lower concept ID
            best = max(
                ready,
                key=lambda c: (
                    round(priority_scores[c], 5),
                    -self.graph.nodes_by_id[c].get("level", 1),
                    -c,
                ),
            )

            placed.add(best)
            remaining.remove(best)
            path_cids.append(best)

        # 5. Build Final Path Step Objects
        path_steps: List[Dict[str, Any]] = []
        for idx, cid in enumerate(path_cids):
            c_info = self.graph.nodes_by_id.get(cid, {})
            c_name = c_info.get("name", f"Concept {cid}")
            c_code = c_info.get("code", f"C{cid:02d}")
            m_pct = int(round(mastery_map.get(cid, 0.35) * 100))
            r_val = risk_map.get(cid, 0.50)

            # Natural language reason formulation
            blocked_targets = root_gap_links.get(cid, [])
            if blocked_targets and cid not in targets:
                target_names = [
                    self.graph.nodes_by_id.get(t, {}).get("name", f"Concept {t}")
                    for t in blocked_targets[:2]
                ]
                reason = f"{c_name} is blocking {' and '.join(target_names)}"
            elif blocked_targets and cid in targets:
                target_names = [
                    self.graph.nodes_by_id.get(t, {}).get("name", f"Concept {t}")
                    for t in blocked_targets[:2]
                    if t != cid
                ]
                if target_names:
                    reason = f"{c_name} is weak ({m_pct}% mastery) and blocking {' and '.join(target_names)}"
                else:
                    reason = f"Critical foundation: current mastery is {m_pct}%"
            else:
                reason = f"Remediate {c_name} to resolve {int(round(r_val * 100))}% risk ({m_pct}% mastery)"

            res = chosen_resources[cid]
            step = {
                "id": f"step_{idx + 1}",
                "stepIndex": idx,
                "conceptId": cid,
                "conceptCode": c_code,
                "conceptName": c_name,
                "resourceId": res.get("id"),
                "resourceTitle": res.get("title", f"Resource for {c_name}"),
                "resourceType": res.get("type", "practice"),
                "resourceUrl": res.get("url", ""),
                "difficulty": res.get("difficulty", 2),
                "minutes": res.get("est_minutes", 25),
                "reason": reason,
                "priority": round(priority_scores[cid], 3),
            }
            path_steps.append(step)

        return path_steps
