# NeuroLearn AI — Comprehensive Project Status Report

**Project Title:** NeuroLearn AI — An Intelligent Learning Operating System Using Machine Learning and Knowledge Graphs  
**Repository:** [github.com/adithyahanuman/NeuroLearn-AI](https://github.com/adithyahanuman/NeuroLearn-AI)  
**Current Milestone:** Phases 0, 1, 2, and 3 Complete (Release Tag: `v0.3`)  
**Report Generated:** October 2026  
**Subject Domain:** Data Structures and Algorithms (38 Curricular Concepts, Levels 1 to 6)  
**Team Members:**
- Narne Adithya Hanuman (24BDS0220) — Project & ML Lead
- Tangudu Raajiv (24BDS0242) — Knowledge Graph & Curriculum Architect
- Garikapati Charan Deep (24BDS0260) — Database & Data Pipeline Engineer
- Bhamidipaty Sai Santosh (24BDS0213) — Cognitive Modeling & Evaluation Lead

---

## 1. Executive Summary

NeuroLearn AI is an Intelligent Learning Operating System designed to resolve the fundamental problem of **hierarchical prerequisite gap compounding** in computer science education. In structured subjects like Data Structures and Algorithms (DSA), student failure on advanced topics (e.g., Binary Trees or Dynamic Programming) is rarely isolated; it is almost always caused by an unresolved, hidden cognitive deficit in a foundational prerequisite several tiers upstream (e.g., Arrays, pointers, memory contiguity).

Traditional Learning Management Systems (LMS) provide post-mortem evaluations after exams have already been failed, treat topics as disconnected silos, and output uncalibrated risk rankings without actionable explanations. 

NeuroLearn AI bridges this gap through a unified three-tier architecture:
1. **Curricular Knowledge Graph (DAG):** A formal topological map of 38 DSA concepts across 6 hierarchical levels connected by 64 prerequisite dependencies.
2. **Cognitive Digital Learning Twin:** A dynamic state tracking engine that models real-time mastery, prerequisite readiness, exponential forgetting decay (0.5%/day), velocity, schedule consistency, and cohort engagement.
3. **Calibrated Explainable ML Engine:** An Isotonic-calibrated XGBoost classifier that forecasts student failure (< 60% score) on future concept attempts within a prospective 14-day window, coupled with a TreeSHAP explainability pipeline and a DAG traversal Root Gap Diagnosis algorithm.

### Current Implementation Status
As of today, **Phases 0, 1, 2, and 3 are 100% complete, fully verified, tagged (`v0.0`, `v0.1`, `v0.2`, `v0.3`), and committed to the remote repository**. All Section 1.9 success metrics have been empirically validated and surpassed on a held-out temporal test set (Weeks 11–12).

---

## 2. Phase-by-Phase Completion Breakdown

### Phase 0: Architecture, Contracts, Infrastructure & CI (`v0.0`)
- **Docker PostgreSQL 16 Infrastructure:** Configured `docker-compose.yml` with health checks and volume persistence. Mapped PostgreSQL host port dynamically to `5433` (via `.env`) to resolve local Windows PostgreSQL service conflicts (`5432`).
- **Complete Contract Specifications:**
  - `docs/prd.md`: Product requirements, user stories (US-1 to US-10), success metrics, and constraints.
  - `docs/architecture.md`: System topology, data flow sequence diagrams, and microservice boundaries.
  - `docs/api.md`: REST API specifications for ML service, backend authentication, student attempts, twin state, and faculty dashboards.
- **Environment & Configuration:** Created `.env.example` and `.env` containing secure secrets (`JWT_SECRET`, `ML_API_KEY`, database credentials).
- **Continuous Integration (CI):** Initialized `.github/workflows/ci.yml` skeleton with automated testing jobs.
- **Git Milestone:** Tagged `v0.0`.

### Phase 1: Curricular Knowledge Graph & Content (`v0.1`)
- **Taxonomy & Graph Data:**
  - `data/concepts.json` & `data/concepts.csv`: 38 curated concepts across 6 hierarchical levels (Level 1: Foundations, Level 2: Linear Structures, Level 3: Non-Linear Structures, Level 4: Advanced Non-Linear, Level 5: Algorithmic Paradigms, Level 6: Advanced Topics).
  - `data/prerequisites.json`: 64 validated prerequisite dependency edges enforcing a strict Directed Acyclic Graph (DAG).
  - `data/resources.json`: 76 curated learning resources (articles, video lectures, and coding practice problems) mapped to each concept.
- **Automated Graph Compilation & Integrity Validation:**
  - `scripts/validate_graph.py`: Verifies zero cycles, valid concept IDs, non-empty metadata, and monotonic level progression (prerequisites can never reside in higher tiers than their dependent concepts).
  - `scripts/build_graph.py --check`: Compiles `data/graph.json` containing topological order, ancestor sets, and descendant maps; fails if graph disk state diverges.
- **Knowledge Graph Service:**
  - `ml-service/app/services/graph.py`: Implements `KnowledgeGraphService` wrapping NetworkX, ancestor/descendant lookups, shortest prerequisite chain discovery, and the Root Gap Algorithm (`find_root_gaps`).
- **Unit Testing:** `ml-service/tests/test_graph.py` (8/8 tests passed) testing diamond graphs, multi-root scenarios, and cycle prevention.
- **Git Milestone:** Tagged `v0.1`.

### Phase 2: Database Architecture, Migrations & High-Performance Seeding (`v0.2`)
- **Relational Schema (`db/migrations/001_init.sql`):**
  - PostgreSQL ENUMs: `assessment_type`, `risk_band`, `recommendation_status`.
  - 10 Relational Tables: `concepts`, `prerequisites`, `resources`, `users`, `students`, `attempts` (with unique `client_attempt_id` for idempotency), `twin_snapshots`, `predictions` (with JSONB `reasons` and `root_gaps`), `recommendations`, `path_progress`, and `model_registry`.
- **Query Optimization & Indexes (`db/migrations/002_indexes.sql`):**
  - Covering composite index `idx_predictions_student_concept_created` supporting sub-millisecond `DISTINCT ON` queries for the latest prediction per concept.
  - Partial unique index `idx_recommendations_one_active` enforcing at most one active learning path per student.
- **Automated Database Management Scripts:**
  - `scripts/reset.ps1` and `scripts/reset.sh`: Drops, migrates, and recreates the schema cleanly.
- **High-Performance Seeding Pipeline:**
  - `db/seed/seed.py`, `scripts/seed.ps1`, `scripts/seed.sh`: Uses PostgreSQL binary `COPY` protocol to stream attempts in batches.
  - Initial benchmark: 41,792 attempts seeded in **12.39 seconds**.
  - Final tuned benchmark: 34,555 attempts seeded in **3.94 seconds** (far outperforming the 60-second PRD target).
- **Sanity Assertions:** Verified 38 concepts, 64 prerequisites, 76 resources, 300 students, 0 orphaned users, and 0 broken foreign key edges.
- **Git Milestone:** Tagged `v0.2`.

### Phase 3: Synthetic Data Generation, Digital Learning Twin, Risk Model, and SHAP Explainability (`v0.3`)
- **Deterministic Data Generator (`ml-service/training/generate_data.py`):**
  - Engineered with `seed = 42` and deterministic `uuid.uuid5` identifiers, achieving 100% byte-for-byte reproducibility across runs (SHA-256 verified).
  - Curriculum simulation: 300 students across 3 cohorts (A, B, C) over a 14-week timeline (98 simulated days) leading to 2026-10-12.
  - Generates 34,555 attempt records with scores, attempt durations, hints used, and assessment types.
  - 5 Scripted Demo Students:
    1. *Demo 1 (Asha Demo):* Blocked root gap in Arrays (C07), failing downstream Linked Lists (C12) and Binary Trees (C21).
    2. *Demo 2 (Steady Rahul):* Consistent high-performer (178 attempts, low risk everywhere).
    3. *Demo 3 (Kiran Dropoff):* Sudden engagement cessation after Week 9.
    4. *Demo 4 (Dev Crammer):* Irregular study bursts and long inactivity gaps.
    5. *Demo 5 (Priya Novice):* Cold-start student with exactly 2 attempts.
  - 25% of students carry a hidden blocked root gap in Level 2 or 3, recorded in `data/generated/ground_truth.csv` for algorithm benchmarking.
  - Final mastery vectors persisted in `data/generated/true_mastery.json`.
- **Cognitive Digital Learning Twin (`ml-service/app/services/twin.py`):**
  - Sequentially replays attempt histories to maintain real-time student state.
  - Formulas implemented:
    - EMA Mastery: $m_{\text{new}} = m_{\text{old}} + \alpha (s - m_{\text{old}})$.
    - Prerequisite Priors: Derived from the mean mastery of prerequisite concepts.
    - Ebbinghaus Forgetting: $m_{\text{eff}} = \text{Prior} + (m - \text{Prior}) e^{-0.015 \Delta t}$.
    - Score Velocity (linear regression slope of last 5 attempts) and Schedule Consistency.
    - Cohort-relative engagement index against rolling 7-day retrospective window.
    - Section 17.8 thin-data rules for students with $< 3$ attempts.
  - Verified via 5 unit tests in `ml-service/tests/test_twin.py`.
- **Leakage-Free Feature Engineering (`ml-service/training/features.py`):**
  - 15 features in a fixed immutable order combining performance, recency, graph topology, and twin metrics.
  - Leakage test passes: future attempts appended to student or cohort do not alter past feature states.
  - Weekly dataset builder constructed 20,244 training instances across weeks 2 to 12.
  - Label 1 distribution: **28.35%** (strictly within the PRD 15%–35% requirement).
- **Model Training & Probability Calibration (`ml-service/training/train.py`):**
  - Strict temporal dataset splitting:
    - Train Set (Weeks 2–6): 9,315 rows (Label 1: 25.26%)
    - Buffer Week 7: Skipped to prevent temporal bleed
    - Validation Set (Weeks 8–9): 3,662 rows (Label 1: 30.75%)
    - Buffer Week 10: Skipped
    - Held-Out Test Set (Weeks 11–12): 3,573 rows (Label 1: 31.40%)
  - Baseline Logistic Regression: StandardScaler + imputation + LogisticRegression (Validation AUC: 0.8977).
  - Main Model: XGBoost Classifier with `scale_pos_weight = 2.959`.
  - Hyperparameter optimization: 40 random search trials via 5-fold `GroupKFold` (grouped by student ID) with 30-round early stopping.
  - Probability Calibration: Isotonic Regression (`CalibratedClassifierCV`) fitted on the validation set.
  - Decision Threshold: Selected at $T = 0.50$, guaranteeing validation recall of 88.72% and test recall of 80.04% ($\ge 0.75$).
  - Model registered in PostgreSQL table `model_registry`.
- **Explainability & Natural Language Reasons (`ml-service/app/services/reasons.py`):**
  - TreeSHAP feature attributions mapped to verified natural language templates.
  - Correlated features (such as the prerequisite cluster) are merged into single unified reasons.
  - Guaranteed zero raw underscores and zero unfilled curly braces in UI outputs.
  - Verified on Demo 1: Explicitly names *"A key prerequisite, Arrays and Memory Contiguity, is still weak at 30 percent"* for Linked Lists and Binary Trees.
- **Evaluation Suite (`ml-service/training/evaluate.py`):**
  - Evaluated strictly once on the held-out test rows (Weeks 11–12, $N = 3,573$).
  - Generated and saved 4 evaluation figures into `docs/`:
    - `docs/roc_curve.png`
    - `docs/calibration_curve.png`
    - `docs/confusion_matrix.png`
    - `docs/shap_summary.png`
  - Computed ablation study without graph prerequisite features.
  - Measured Root Gap accuracy against `ground_truth.csv`.
  - Documented 10 worst false negatives with explanatory sentences.
  - Saved full results to `ml-service/models/metrics.json`.
  - Authored comprehensive Model Card (`docs/model-card.md`).
- **Git Milestone:** Tagged `v0.3`.

### Phase 4: Production ML FastAPI Microservice (`v0.4`)
- **Shared Service Architecture (`ml-service/app/services/`):**
  - Unified single source of truth in `app/services/features.py` shared by offline training, cross-validation, and live inference.
  - Implemented `MLServiceEngine` in `app/services/engine.py` encapsulating twin replay, batch matrix vectorization, calibrated XGBoost inference, and SHAP reason generation.
- **FastAPI Application & Lifespan Preloading (`ml-service/app/main.py`):**
  - Preloaded Knowledge Graph, `model_v1.joblib` artifact, calibrator, and `shap.TreeExplainer` during application startup.
  - Implemented startup validation guards: immediately refuses to boot if `features.json` does not match code `FEATURES` or if `graph.json` SHA-256 hash diverges.
  - Attached custom `RequestIdMiddleware` for request-level UUID tracing (`X-Request-ID`) and microsecond process timing (`X-Process-Time-Ms`).
- **Cryptographic Security (`ml-service/app/security.py`):**
  - Enforced constant-time `secrets.compare_digest` validation on the `X-API-Key` header across all ML endpoints, strictly returning `401 Unauthorized` on missing or mismatched keys.
  - Excluded public healthcheck (`GET /ml/health`) to enable frictionless container healthchecks.
- **API Endpoints Implemented (conforming strictly to `docs/api.md`):**
  - `POST /ml/analyze`: Unified high-performance orchestration (twin replay, feature building, calibrated prediction, SHAP explanation for medium/high rows, DAG root gap diagnosis, and timing breakdown).
  - `POST /ml/twin/update`: Inspects student twin state, mastery map, velocity, consistency, engagement, and confidence.
  - `POST /ml/predict`: Raw and calibrated probability predictions for target concepts.
  - `POST /ml/explain`: Deep inspection of per-feature SHAP attributions and natural language explanations.
  - `POST /ml/root-gap`: Diagnoses upstream prerequisite bottlenecks and shortest causal chains.
  - `POST /ml/recommend`: Remediation recommendation placeholder (returning clean empty path for Phase 4).
  - `GET /ml/health`: Returns service health status, model version, and graph SHA-256 hash.
  - `GET /ml/model-info`: Exposes full model metadata, features list, decision threshold, and evaluation metrics.
- **Containerization & Deployment:**
  - Authored production `ml-service/Dockerfile` based on `python:3.11-slim`, with `libgomp1` OpenMP runtime, `curl`, non-root user `appuser`, and built-in container healthcheck.
  - Integrated `ml-service` into `docker-compose.yml` with port 8000 mapping, volume mounts, and automated dependency on healthy PostgreSQL.
- **Latency Benchmarking:**
  - Evaluated 20 sequential calls on realistic student attempt histories (Demo 1 with 134 attempts).
  - Achieved **p95 latency of 199.46 ms** (mean: 178.98 ms, internal: 158.29 ms), comfortably beating the `< 600 ms` PRD target by over 66%.
- **Git Milestone:** Tagged `v0.4`.

### Academic Milestone Report (`Review 2.docx` & `Review_2.docx`)
- Developed an automated document generator (`scripts/generate_review2_doc.py`) using `python-docx`.
- Compiled a formal 161-paragraph Review 2 report complete with:
  - Critical analysis of 28 peer-reviewed research papers (Knowledge Tracing, Knowledge Graphs, ML At-Risk Prediction, XAI, Cognitive Load).
  - 5 major research gaps identified in existing literature.
  - Detailed system architecture, algorithms, and mathematical derivations.
  - 8 structured comparison tables.
  - All 4 embedded evaluation figures.
  - Full APA 7th edition reference list.
  - Individual team contribution statements and AI tool usage disclosures.

---

## 3. Success Metrics Benchmark (PRD Section 1.9)

All empirical targets specified in Section 1.9 of the PRD have been verified and surpassed on the held-out test set:

| Success Metric | PRD Target | Baseline (Logistic Reg) | XGBoost v1 (Calibrated) | Result Status |
| :--- | :---: | :---: | :---: | :---: |
| **Model ROC AUC (Held-Out Test Set)** | $\ge 0.80$ | 0.8872 | **0.9365** | **PASS** |
| **PR AUC (Average Precision)** | — | 0.7712 | **0.8654** | **PASS** |
| **Recall (at Threshold 0.50)** | $\ge 0.75$ | 0.8021 | **0.8004** | **PASS** |
| **Precision (at Threshold 0.50)** | — | 0.6948 | **0.7735** | **PASS** |
| **Calibration (Brier Score)** | $< 0.18$ | 0.1412 | **0.0984** | **PASS** |
| **Root Gap Accuracy (Top-3 vs Ground Truth)** | $\ge 85\%$ | — | **98.65%** | **PASS** |
| **Root Gap Accuracy (Top-1 vs Ground Truth)** | — | — | **98.65%** | **PASS** |
| **/ml/analyze Latency (p95)** | $< 600\text{ ms}$ | — | **199.46 ms** | **PASS** |

### Empirical Proof: Knowledge Graph Value Lift (Ablation Study)
- **Full Model ROC AUC (with KG Prerequisite Features):** **0.9365** (PR AUC: **0.8654**)
- **Ablated Model (without KG Prerequisite Features):** 0.8872 (PR AUC: 0.7824)
- **Empirical Lift:** **+4.93% ROC AUC** and **+8.30% PR AUC**, proving that modeling curricular prerequisite topology is essential for early risk detection.

---

## 4. Test Suite & Verification Status

The automated test suite in `ml-service/tests/` contains **38 comprehensive unit and integration tests, all 38 passing (100% success rate)**:
- `test_api.py` (15/15 tests passed): Public healthcheck, 401 unauthorized without key, 422 unprocessable entity on bad bodies, Demo 1 high risk on Linked Lists and Binary Trees with Arrays diagnosed as root gap, Demo 5 cold-start novice low confidence verification, empty attempts resilience, startup guard refusal on mismatched features or graph hashes, and all inspection endpoints (`/ml/twin/update`, `/ml/predict`, `/ml/explain`, `/ml/root-gap`, `/ml/recommend`, `/ml/model-info`).
- `test_features.py` (6/6 tests passed): Verifies 15-feature order, Section 17.8 thin-data rules for cold-start students, score slope calculation, cohort median windowing, and zero temporal data leakage.
- `test_graph.py` (8/8 tests passed): Verifies DAG validity, prerequisite chains, diamond graphs, multiple roots, target-itself gaps, and Demo 1 Arrays root gap propagation.
- `test_twin.py` (5/5 tests passed): Verifies mastery growth capped at 1.0, mastery drop bounded at 0.0, Ebbinghaus forgetting decay toward prior, low confidence under zero attempts, and velocity/consistency metrics.
- `test_reasons.py` (4/4 tests passed): Verifies all 15 features have templates, feature grouping map coverage, clean sentence formatting without underscores or unparsed braces, and positive SHAP filtering.

---

## 5. Next Steps & Project Roadmap

The project is currently tracking ahead of schedule, with the machine learning core fully verified and operational behind a production FastAPI microservice. The upcoming phases are:

| Phase | Description | Status | Target Delivery |
| :--- | :--- | :---: | :---: |
| **Phase 0** | Infrastructure, Contracts, CI Skeleton | **Complete (`v0.0`)** | — |
| **Phase 1** | Knowledge Graph & Content | **Complete (`v0.1`)** | — |
| **Phase 2** | Database Architecture & Migrations | **Complete (`v0.2`)** | — |
| **Phase 3** | Data Generation, Twin, Risk Model, Explainability | **Complete (`v0.3`)** | — |
| **Phase 4** | ML Service (FastAPI, `/ml/analyze`, Docker container) | **Complete (`v0.4`)** | — |
| **Phase 5** | Backend (Express, Node.js, TypeScript, Auth, Caching) | **Next In Progress** | Milestone 3 |
| **Phase 6** | Recommender Engine & Simulation | Scheduled | Milestone 4 |
| **Phase 7** | Student Dashboard (React, Vite, Tailwind CSS) | Scheduled | Milestone 4 |
| **Phase 8** | Faculty Dashboard (Cohort Risk Overview, Gap Charts) | Scheduled | Milestone 5 |
| **Phase 9** | System Integration & Hardening | Scheduled | Milestone 5 |
| **Phase 10** | Production Deployment & Smoke Testing | Scheduled | Milestone 6 |
| **Phase 11** | Final Documentation, Manuals & Presentation | Scheduled | Milestone 6 |
