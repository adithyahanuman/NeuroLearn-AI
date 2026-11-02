# NeuroLearn AI

> **An Intelligent Learning Operating System Using Machine Learning and Knowledge Graphs**

[![Release](https://img.shields.io/badge/Release-v1.0.0-blue.svg)](https://github.com/adithyahanuman/NeuroLearn-AI/releases)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node-LTS-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.x-red.svg)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![CI](https://github.com/adithyahanuman/NeuroLearn-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/adithyahanuman/NeuroLearn-AI/actions)

NeuroLearn AI is an **Intelligent Learning Operating System** designed to eliminate **hierarchical prerequisite gap compounding** in computer science education. When a student struggles in advanced topics like Binary Trees or Dynamic Programming, standard learning management systems report the failure only after an exam is lost. In over 80% of cases, the real root cause is an unmastered, hidden deficit in an upstream foundational prerequisite (such as memory contiguity or pointers) several tiers earlier in the curriculum.

NeuroLearn AI solves this by maintaining a dynamic **Cognitive Digital Learning Twin**, predicting concept struggle 14 days in advance using calibrated **XGBoost**, explaining predictions in plain English with **TreeSHAP**, isolating root bottlenecks through **Knowledge Graph DAG traversal**, and prescribing topologically-ordered, personalized remediation paths.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Tier (Port 5173)"]
        UI["React 18 + Vite + TailwindCSS"]
        DAG["Cytoscape.js Prerequisite Graph"]
        RQ["TanStack React Query + AuthContext"]
    end

    subgraph Gateway ["API Gateway Tier (Port 3001)"]
        EXP["Express.js + TypeScript Gateway"]
        AUTH["JWT Auth & Role Guards (Student / Faculty)"]
        CACHE["Dual-Layer Cache & Stale Fallbacks"]
        EXP --> AUTH
        EXP --> CACHE
    end

    subgraph DataTier ["Persistence Tier (Port 5432)"]
        PG[("PostgreSQL 16 Relational Database<br/>10 Tables · Partial Indexes · COPY Seed")]
    end

    subgraph MLTier ["Cognitive & ML Tier (Port 8000)"]
        FAST["FastAPI + Uvicorn Microservice"]
        TWIN["Cognitive Digital Learning Twin<br/>EMA Mastery · Forgetting Decay · Velocity"]
        XGB["Calibrated XGBoost Model<br/>Isotonic Scaling · Threshold 0.50"]
        SHAP["TreeSHAP Explainability Engine<br/>Plain English Translation"]
        REC["Topological Recommender Engine<br/>Root Gap Traversal · Priority Scorer"]
        FAST --> TWIN
        FAST --> XGB
        FAST --> SHAP
        FAST --> REC
    end

    UI -->|"HTTPS / REST (JWT Token)"| EXP
    CACHE -->|"asyncpg / pg Pool"| PG
    CACHE -->|"HTTP / REST (X-API-Key)"| FAST
```

---

## 5-Step Quick Start Guide

### Prerequisites
- **Node.js**: v18+ LTS (v24 LTS tested)
- **Python**: 3.11 or 3.12 (Python 3.12.4 tested)
- **Database**: Docker Desktop OR local PostgreSQL 16
- **Git**: 2.40+

---

### Step 1: Clone Repository & Configure Environment

```bash
# 1. Clone repository
git clone https://github.com/adithyahanuman/NeuroLearn-AI.git
cd NeuroLearn-AI

# 2. Configure environment variables
cp .env.example .env
```

Ensure `.env` contains:
```env
DATABASE_URL=postgresql://neurolearn:neurolearn_dev_password@localhost:5432/neurolearn
JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ML_SERVICE_URL=http://localhost:8000
ML_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
PORT=3001
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001
```

---

### Step 2: Database Spin-Up & Seeding

You can launch the database using either Docker or local PostgreSQL:

#### Option A: Via Docker Compose (Recommended)
```bash
# Start PostgreSQL 16 container
docker compose up -d db

# Execute deterministic database reset and high-performance seed
# Linux/macOS:
./scripts/reset.sh && ./scripts/seed.sh

# Windows PowerShell:
.\scripts\reset.ps1; .\scripts\seed.ps1
```

#### Option B: Local PostgreSQL Service
```bash
# Restore from verified pre-computed demo dump
pg_restore -U neurolearn -d neurolearn --no-owner --clean --if-exists data/neurolearn_demo.dump
```

---

### Step 3: Launch the Machine Learning Microservice

```bash
# Navigate to ML service directory
cd ml-service

# Create and activate virtual environment
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI engine on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*Verify at:* `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/ml/health`.

---

### Step 4: Launch the Express.js Backend Gateway

Open a new terminal window:
```bash
cd backend

# Install dependencies
npm install

# Build TypeScript and start backend server on port 3001
npm run build
node dist/server.js
# Or for live hot-reload development: npm run dev
```

---

### Step 5: Launch the React / Vite Frontend Client

Open a third terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite client on port 5173
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173`**

---

## Demo Accounts

All demo accounts are pre-seeded with bcrypt-hashed credentials (`cost = 12`):

| Role | Name | Email | Password | Narrative / Test Story |
|------|------|-------|----------|------------------------|
| **Student (Lead Demo)** | Asha Demo | `demo1@neurolearn.ai` | `demo` | **Arrays Bottleneck**: Weak memory contiguity causing high failure risk in Linked Lists (C12) and Binary Trees (C21). |
| **Student** | Ravi Steady | `demo2@neurolearn.ai` | `demo` | Steady learner with consistent practice cadence across all 6 levels. |
| **Student** | Kiran Dropoff | `demo3@neurolearn.ai` | `demo` | Sudden engagement dropoff; flags faculty early-warning radar. |
| **Student** | Dev Crammer | `demo4@neurolearn.ai` | `demo` | Crammer profile with 6-day inactivity gaps; low consistency index. |
| **Student** | Priya Novice | `demo5@neurolearn.ai` | `demo` | Cold-start profile with exactly 2 attempts; displays `confidence: low` chips. |
| **Faculty Admin** | Dr. P. Ramesh | `faculty@neurolearn.ai` | `demo` | Cohort leadership dashboard, early warning quadrant, class-wide common gaps. |

---

## Test Suites & Verification

NeuroLearn AI features comprehensive multi-tier test automation:

```bash
# 1. Full Stack Smoke Verification (Tests all ports, auth, ML analysis, and fallbacks)
python scripts/smoke.py

# 2. ML Engine & Cognitive Pipeline Tests (43 unit & integration tests)
python -m pytest ml-service/tests

# 3. Express Backend Integration Tests (45 route, auth, caching, and RBAC tests)
npm test --prefix backend

# 4. React Frontend Component & Access Control Tests (11 component & security tests)
npm test --prefix frontend

# 5. Playwright End-to-End Test Suite (Headless browser demo path execution)
npx playwright test --prefix frontend
```

---

## Empirical Benchmark & Evaluation

All metrics evaluated on held-out prospective test splits (Weeks 11–12):

| Evaluation Metric | PRD Target | Achieved | Status |
|-------------------|------------|----------|--------|
| **ROC AUC** | $\ge 0.800$ | **0.841** | Passed ✅ |
| **PR AUC** | Baseline +0.10 | **0.603** | Passed ✅ |
| **Recall (at Threshold 0.50)** | $\ge 0.750$ | **0.825** | Passed ✅ |
| **Brier Calibration Score** | $< 0.180$ | **0.126** | Passed ✅ |
| **Root Gap Diagnosis (Top-1)** | $\ge 85.0\%$ | **98.65%** | Passed ✅ |
| **Root Gap Diagnosis (Top-3)** | $\ge 95.0\%$ | **100.00%** | Passed ✅ |
| **Simulated Learning Gain** | $\ge +20.0\%$ | **+60.7%** | Passed ✅ |
| **Analysis Latency (p95)** | $< 600$ ms | **412 ms** | Passed ✅ |

---

## Resilience & Stale Fallbacks

NeuroLearn AI guarantees zero downtime for students even when the machine learning service experiences downtime:
1. When the ML microservice is unreachable, the Express gateway serves the student's latest stored prediction snapshot with `stale: true`.
2. The frontend renders a non-intrusive, yellow **StaleBanner** informing the user that cached predictions are shown.
3. Once the ML service recovers, incoming attempt submissions automatically trigger seamless background recomputation.

---

## Build Status & Roadmap

| Phase | Description | Deliverables | Tag | Status |
|---|---|---|---|---|
| **Phase 0** | Infrastructure, Contracts, CI | Repo setup, Docker Compose, .env.example, initial CI | `v0.0` | ✅ Complete |
| **Phase 1** | Knowledge Graph & Content | 38 concepts, 64 edges, 76 resources, DAG validator, root gaps | `v0.1` | ✅ Complete |
| **Phase 2** | Database Migrations & Seed | PostgreSQL 16 schema, COPY seed pipeline (34k attempts), reset scripts | `v0.2` | ✅ Complete |
| **Phase 3** | Data Generation, Twin, Model | Cognitive Twin, 15 features, XGBoost, Isotonic calibration, SHAP | `v0.3` | ✅ Complete |
| **Phase 4** | ML FastAPI Microservice | Uvicorn API, startup integrity guards, `/ml/analyze`, Dockerfile | `v0.4` | ✅ Complete |
| **Phase 5** | Express.js Gateway | JWT auth, RBAC, dual-layer cache, idempotent attempts, backfill | `v0.5` | ✅ Complete |
| **Phase 6** | Recommender & Simulation | Topologically-ordered paths, simulation (+60.7% gain) | `v0.6` | ✅ Complete |
| **Phase 7** | Student Dashboard | React 18, Vite, Cytoscape graph, heatmap, risk cards, attempt drawer | `v0.7` | ✅ Complete |
| **Phase 8** | Faculty Dashboard | Cohort overview, student table, early warning radar, common gaps | `v0.8` | ✅ Complete |
| **Phase 9** | Hardening & Security | Playwright E2E, load benchmarks (p95 < 600ms), security audit | `v0.9` | ✅ Complete |
| **Phase 10**| Multi-Service Deployment | Service orchestration, smoke scripts, verified demo dump | `v1.0-rc`| ✅ Complete |
| **Phase 11**| Documentation & Pitch | Comprehensive README, CHANGELOG, 10 slides, 3-min demo script | `v1.0.0` | ✅ Complete |

---

## Honest Limitations

- **Synthetic Cohort**: The model was trained and tuned on 300 synthetic student twins (34,555 attempts). While simulation results (+60.7% gain) are statistically significant ($p < 0.001$), real classroom trials are required for formal pedagogical validation.
- **Curricular Scope**: Currently restricted to 38 foundational Data Structures and Algorithms concepts. Cross-curricular expansion requires authoring domain-specific prerequisite DAGs.
- **Cold-Start Handling**: Students with fewer than 3 concept attempts receive prior baseline estimates with `confidence: low` chips.

---

## Project Team & Mentorship

**Academic Institution:** Vellore Institute of Technology (VIT-AP)  
**Academic Department:** School of Advanced Sciences (SAS), Department of Data Science  

**Faculty Guide / Mentor:**
- **Dr. P. Ramesh**, Associate Professor

**Student Development Team:**
| Member | Registration No. | Specialization & Key Roles |
|---|---|---|
| **Narne Adithya Hanuman** | `24BDS0220` | Team Lead, ML Modeling, Isotonic Calibration & TreeSHAP |
| **Tangudu Raajiv** | `24BDS0242` | Knowledge Graph Architecture & Graph Traversal Root Gap Logic |
| **Garikapati Charan Deep** | `24BDS0260` | Relational Database Schema, PostgreSQL COPY Seed Pipeline |
| **Bhamidipaty Sai Santosh** | `24BDS0213` | Cognitive Twin State Modeling, Feature Engineering & Validation |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
