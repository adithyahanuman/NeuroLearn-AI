# NeuroLearn AI: Source Code Execution Guide

> **Comprehensive Technical Runbook, Multi-Tier Service Startup & Automated Verification Guide**  
> **Target OS:** Windows (PowerShell) / macOS / Linux  
> **Architecture:** PostgreSQL 16 + FastAPI (ML Engine) + Express 5 (Backend Gateway) + React 18 / Vite (Frontend)

---

## 1. System Architecture & Port Allocation

| Component | Technology | Default Port | Operational Responsibility |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL 16 (Docker or Local) | `5432` | Relational store for users, cohorts, graph schema, quiz attempts, and student digital twins. |
| **ML Engine** | Python 3.11+, FastAPI, XGBoost, SHAP | `8000` | Real-time risk predictions, SHAP feature attribution, and DAG prerequisite root gap traversal. |
| **Backend Gateway** | Node.js (LTS), Express 5, TypeScript | `3001` | API orchestration, JWT authentication, rate limiting, ML caching, and stale fallback resilience. |
| **Frontend Client** | React 18, Vite, Tailwind CSS, TanStack | `5173` | Interactive visualizer (Cytoscape.js DAG), Chart.js analytics, Student and Faculty Dashboards. |

---

## 2. Prerequisites & Environment Setup

Verify the following tools are installed and accessible in your shell:
- **Node.js**: `node -v` (v18.x to v24.x)
- **Python**: `python --version` (v3.11+)
- **Docker Desktop** (or a local PostgreSQL 16 service): `docker --version`
- **Git**: `git --version`

### Step 2.1: Configure Environment Variables
Ensure the `.env` file exists at the root of the repository. If configuring anew:
```powershell
cp .env.example .env
```
Ensure your `.env` contains valid cryptographic secrets and connection settings:
```ini
# PostgreSQL
POSTGRES_USER=neurolearn
POSTGRES_PASSWORD=changeme
POSTGRES_DB=neurolearn
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
DATABASE_URL=postgresql://neurolearn:changeme@127.0.0.1:5432/neurolearn

# Cryptographic Keys (generate with: python -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=f52cc521c5dee5f5beaf1e43be0a08797d05a3edddde07c008840261f962e551
JWT_EXPIRES_IN=8h
ML_API_KEY=9bfa0adf52e01d16604931cae1b5f1f05811bf4a5700b5401bce3d85027d1d5c

# Microservice Endpoints
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
PREDICTION_CACHE_MINUTES=15
ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_TIMEOUT_MS=5000
VITE_API_URL=http://localhost:3001
MODEL_PATH=models/model_v1.joblib
GRAPH_PATH=data/graph.json
```

---

## 3. Step-by-Step Service Startup Sequence

Launch each service in a separate terminal window to keep logs segregated and active.

### Terminal 1: Database Startup, Migration & Seeding
Start PostgreSQL container and seed the database with synthetic students and attempts:

```powershell
# 1. Start PostgreSQL container
docker compose up -d db

# 2. Confirm database readiness
docker compose exec db psql -U neurolearn -c "SELECT version();"

# 3. Apply schema migrations (001_init.sql and 002_indexes.sql)
.\scripts\reset.ps1

# 4. Generate synthetic cohorts and seed database
.\scripts\seed.ps1
```
*(On Linux/macOS, execute `./scripts/reset.sh` and `./scripts/seed.sh` instead).*

---

### Terminal 2: ML Microservice (FastAPI + XGBoost + SHAP)
Launch the Python ML inference server on port `8000`:

```powershell
# Navigate into ml-service directory
cd ml-service

# (Optional) Activate your virtual environment if one is configured
# .\.venv\Scripts\Activate.ps1

# Install requirements if not already present
pip install -r requirements.txt

# Start FastAPI server with live reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
**Verification Check:**  
Open `http://127.0.0.1:8000/ml/health` in your browser or curl:
```json
{"status": "ok", "modelVersion": "1.0.0", "graphNodes": 38}
```

---

### Terminal 3: Express Backend Gateway
Launch the Node.js API server on port `3001`:

```powershell
cd backend

# Install dependencies
npm install

# Start development server with tsx watch
npm run dev
```
**Verification Check:**  
Open `http://127.0.0.1:3001/health` in your browser:
```json
{"status": "ok", "database": "connected", "ml": "healthy"}
```

---

### Terminal 4: Frontend Client (Vite + React)
Launch the user dashboard on port `5173`:

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
**Access Point:**  
Open `http://localhost:5173` in your browser.

---

## 4. Automated Verification & Testing Playbook

Run these commands from the root directory to verify system integrity:

| Target | Command | Expected Output |
| :--- | :--- | :--- |
| **Unified Smoke Test** | `python scripts/smoke.py` | All 4 services (ML, Backend, Auth/Postgres, Frontend) report `[PASS]`. |
| **Knowledge Graph DAG** | `python scripts/validate_graph.py` | Validates 38 concepts, 0 cycles, 0 orphans, valid topological sort. |
| **ML Engine Tests** | `pytest ml-service/tests` | 8/8 tests pass (SHAP attribution, root gap traversal, feature shape). |
| **Backend Unit Tests** | `npm --prefix backend test` | Authentication, JWT, and route handlers pass in Vitest. |
| **Frontend Tests** | `npm --prefix frontend test` | React components and view state tests pass. |
| **Playwright E2E** | `npm --prefix frontend run test:e2e` | End-to-end student login and graph traversal tests pass. |

---

## 5. Demo Accounts & Evaluation Scenarios

| Role | Email | Password | Primary Demonstration Capabilities |
| :--- | :--- | :--- | :--- |
| **Student (Primary)** | `demo1@neurolearn.ai` | `demo` | 38-node interactive DAG, Personalized risk predictions, SHAP explainability cards, root prerequisite gap isolation, generated study pathways. |
| **Student (Secondary)**| `demo2@neurolearn.ai` | `demo` | Alternative mastery distribution and custom diagnostic path. |
| **Faculty / Admin** | `faculty@neurolearn.ai` | `demo` | Cohort-level overview (Cohorts A, B, C), early-warning risk quadrants, concept failure heatmaps, bulk intervention triggers. |

### Suggested 3-Minute Live Demo Flow:
1. **Student Login**: Sign in as `demo1@neurolearn.ai`. Explore the interactive knowledge graph with color-coded mastery and risk statuses.
2. **Explainable AI (SHAP)**: Select a high-risk concept (e.g. *Dynamic Programming*). View the top contributing features (e.g. *Recursion* score deficit, attempt latency).
3. **Root Cause Analysis**: Verify that the system recommends remediating *Recursion* rather than repeated failure at *Dynamic Programming*.
4. **Dynamic Twin Update**: Complete a quiz attempt on *Recursion* with a high score; observe immediate live re-evaluation of downstream nodes.
5. **Faculty Oversight**: Log out and sign in as `faculty@neurolearn.ai`. Review cohort distributions and early-warning alerts for struggling students.
6. **Fault Tolerance Check**: Terminate the ML service (Ctrl+C in Terminal 2). Reload the student dashboard; verify that cached predictions allow the UI to remain functional with a "Stale Analysis" indicator without HTTP 500 crashes.

---

## 6. Troubleshooting Common Issues

- **Database Connection Error (`ECONNREFUSED 127.0.0.1:5432`)**:  
  Ensure Docker Desktop is active and run `docker compose up -d db`. If using a local native PostgreSQL install, ensure the PostgreSQL Windows service is running.
- **ML Service 401 Unauthorized**:  
  Verify that `ML_API_KEY` in root `.env` matches the key being sent by the backend.
- **CORS Issues in Browser**:  
  Ensure `CORS_ORIGIN=http://localhost:5173` in `.env` without any trailing slashes.
- **Playwright Headless Browser Missing**:  
  Run `npx playwright install --with-deps` inside the `frontend` folder.
