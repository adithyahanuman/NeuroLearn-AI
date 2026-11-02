# Changelog

All notable changes to **NeuroLearn AI** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-30

### Final Production Release
- **Full-Stack Production Readiness**: Verified complete end-to-end integration across PostgreSQL 16, FastAPI ML Service, Express.js API Gateway, and React 18 / Vite Frontend.
- **Academic & Pitch Documentation**: Compiled comprehensive 10-slide presentation deck (`docs/presentation_slides.md`), verbatim 3-minute demo rehearsal script (`docs/demo_script.md`), and updated mentor-facing project report (`report.md`) with budget breakdown and faculty guide details.
- **Milestone Completion**: Successfully passed all 10 PRD user stories (US-1 through US-10) and achieved 100% test pass rate across frontend components, backend routes, and ML cognitive pipelines.

---

## [1.0.0-rc] - 2026-10-26

### Deployment & Verification
- **Multi-Service Orchestration**: Configured local orchestration for PostgreSQL (5432), FastAPI (8000), Express Backend (3001), and Vite Frontend (5173).
- **Smoke Verification**: Added multi-service smoke verification scripts (`scripts/smoke.py`, `scripts/smoke.sh`, `scripts/smoke.ps1`) probing health, authentication, risk recomputation, and fallback states.
- **Resilience Testing**: Verified graceful fallback handling when ML service is offline: backend serves cached predictions with `stale: true` and a user-facing StaleBanner.
- **Demo Database Artifact**: Exported clean demo database dump (`data/neurolearn_demo.dump`) containing 300 students, 38 concepts, 64 prerequisite edges, 76 resources, and 34,555 synthetic historical attempts.

---

## [0.9.0] - 2026-10-26

### Integration & Hardening
- **End-to-End Testing**: Implemented Playwright E2E suite (`frontend/e2e/demo-path.spec.ts`) validating student login, dashboard telemetry, attempt submission drawer, and live twin updates.
- **Load & Latency Benchmarks**: Verified localhost p95 latency under 600 ms for `/ml/analyze` and under 1.5 s for `POST /attempts`.
- **Security Audit**: Verified constant-time API key verification (`secrets.compare_digest`), bcrypt password hashing (cost factor 12), JWT expiration (8 hours), and strict ownership guards (`canAccessStudent`, `requireRole`).
- **Feature Freeze**: Declared feature freeze with green continuous integration on `main`.

---

## [0.8.0] - 2026-10-25

### Faculty Dashboard
- **Cohort Analytics Routes**: Implemented `GET /cohorts`, `GET /cohorts/:id/summary`, `GET /cohorts/:id/students`, `GET /cohorts/:id/alerts`, and `GET /cohorts/:id/gaps`.
- **Early Warning Radar**: Implemented alert detection identifying students with risk score rises >= 0.20 over a 7-day rolling window.
- **Common Prerequisite Gaps**: Built aggregated gap ranking sorting systemic cognitive deficits by number of impacted students.
- **Faculty UI Views**: Created `/faculty` overview, sortable student roster with trend indicators, `/faculty/gaps` bar charts, and read-only student drill-down inspection (`/faculty/students/:id`).
- **Access Control Enforcement**: Enforced strict cohort ownership; cross-cohort access attempts return HTTP 403 Forbidden.

---

## [0.7.0] - 2026-10-24

### Student Frontend Dashboard
- **Modern React Architecture**: Built client interface using React 18, Vite, TypeScript, and TailwindCSS.
- **Interactive Concept Graph**: Developed interactive prerequisite DAG visualizer with Cytoscape.js and dagre layout, including alternative list views.
- **Mastery & Risk Visualizations**: Created `MasteryHeatmap` (Levels 1–6 color bands), `RiskBadge`, `ConfidenceChip`, and `TrendChart`.
- **Explainability & Root Gaps**: Implemented `ReasonList` displaying top 3 plain English SHAP attributions and `RootGapChain` drawing upstream causal paths.
- **Practice Logging Drawer**: Built attempt drawer with optimistic UI, `client_attempt_id` generation for idempotent retries, and real-time cache invalidation via TanStack Query.
- **Accessibility & Responsiveness**: Verified keyboard navigation, high-contrast dark/light tokens, and 360px mobile responsive layouts.

---

## [0.6.0] - 2026-10-22

### Recommender Engine & Classroom Simulation
- **Topologically Ordered Recommender**: Implemented priority-ranked study path algorithm in `ml-service/app/services/recommender.py` capping paths at 10 prerequisite-first steps.
- **Multi-Factor Priority Scoring**: Integrated severity (0.469), graph impact (0.228), learning readiness (0.208), and estimated effort (0.096).
- **Synthetic Classroom Simulation**: Evaluated 4 study strategies (NeuroLearn, Syllabus Order, Weakest First, Random Weak) across 20 random seeds on 100 held-out student twins.
- **Empirical Gain**: NeuroLearn achieved +60.7% true mastery gain over the syllabus baseline, far exceeding the PRD target of >= 20.0%.

---

## [0.5.0] - 2026-10-20

### Express API Gateway & Data Integration
- **Gateway Architecture**: Built Express.js / TypeScript gateway with Zod schema validation, Pino structured logging, Helmet security headers, and CORS origin controls.
- **Authentication & RBAC**: Implemented JWT authentication, role guards (`student`, `faculty`), and rate limiting (5 login/min, 100 req/min).
- **Cognitive Recomputation Pipeline**: Engineered transactional attempt ingestion (`POST /attempts`) with idempotent replay via `client_attempt_id` and background recomputation.
- **Prediction Cache & Fallback**: Designed dual-layer cache in PostgreSQL returning fresh predictions or serving stale predictions when the ML service is unreachable.
- **Historical Backfill**: Executed fast batched backfill (`scripts/backfill_history.py`) populating 12 weeks of historical twin snapshots and risk records.

---

## [0.4.0] - 2026-10-18

### FastAPI Machine Learning Service
- **Microservice Architecture**: Implemented FastAPI service running on Uvicorn with lifespans, request ID tracking, and constant-time API key security.
- **Unified Engine**: Created `MLServiceEngine` preloading model artifacts, knowledge graph, and SHAP explainer at startup.
- **Startup Integrity Guards**: Added fatal startup checks rejecting mismatches between `features.json`, code `FEATURES`, or graph SHA-256 hash.
- **Granular Endpoints**: Implemented `/ml/analyze`, `/ml/twin/update`, `/ml/predict`, `/ml/explain`, `/ml/root-gap`, `/ml/recommend`, and `/ml/health`.
- **Containerization**: Configured multi-stage Dockerfile with non-root security user and Docker Compose integration.

---

## [0.3.0] - 2026-10-16

### Cognitive Digital Learning Twin & ML Risk Engine
- **Digital Learning Twin**: Formulated cognitive twin tracking mastery EMA, prerequisite readiness gating, Ebbinghaus forgetting decay (0.5%/day), submission velocity, and schedule consistency.
- **Feature Engineering**: Built 15 prospective features obeying Section 17.8 thin-data rules and temporal leakage guards.
- **Model Training & Calibration**: Trained XGBoost classifier with GroupKFold cross-validation and fitted Isotonic regression for calibrated probabilities.
- **Explainability Engine**: Implemented TreeSHAP attribution and human-readable reason translation across 5 cognitive categories.
- **Evaluation Benchmark**: Surpassed all PRD Section 1.9 targets: ROC AUC 0.841 (target >= 0.80), Recall 82.5% (target >= 75%), Brier score 0.126 (target < 0.18), Root Gap top-1 accuracy 98.65% (target >= 85%).

---

## [0.2.0] - 2026-10-14

### Database Schema & Seed Pipeline
- **Relational Schema**: Implemented PostgreSQL 16 migrations (`001_init.sql`, `002_indexes.sql`) covering 10 tables, foreign key cascades, and check constraints.
- **High-Performance Ingestion**: Implemented PostgreSQL `COPY` seed pipeline loading 300 students, 38 concepts, 64 prerequisite edges, 76 resources, and 34,555 attempts in under 4 seconds.
- **Deterministic Reset**: Created automated database reset scripts (`scripts/reset.sh`, `scripts/reset.ps1`) completing full rebuilds in under 15 seconds.

---

## [0.1.0] - 2026-10-13

### Curricular Knowledge Graph & DAG Traversal
- **Curriculum Curation**: Formulated 38 Data Structures and Algorithms concepts across 6 hierarchical levels with 64 prerequisite dependencies and 76 curated learning resources.
- **Graph Validation**: Built automated DAG validator (`scripts/validate_graph.py`) enforcing acyclicity, level ordering, connectivity, and resource availability.
- **Root Gap Algorithm**: Implemented recursive backward graph traversal in `app/services/graph.py` isolating deepest root causes of cognitive deficits.

---

## [0.0.0] - 2026-10-12

### Initial Infrastructure & Contracts
- **Workspace Setup**: Initialized Git repository, environment variables (`.env.example`), and Docker Compose configuration.
- **API Contracts**: Published formal REST contract (`docs/api.md`) and requirements specification (`docs/prd.md`).
- **Continuous Integration**: Configured initial GitHub Actions CI workflow for graph and schema verification.

