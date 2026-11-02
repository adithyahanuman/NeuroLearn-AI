# NeuroLearn AI: 10-Slide Presentation Deck

**Academic Capstone / Project Review Presentation**  
**Course:** Data Structures and Algorithms Pedagogical Intelligence  
**Repository:** [github.com/adithyahanuman/NeuroLearn-AI](https://github.com/adithyahanuman/NeuroLearn-AI)  
**Release Tag:** `v1.0.0`

---

## Slide 1: Title & Team

### Slide Title: **NeuroLearn AI: An Intelligent Learning Operating System Using Machine Learning and Knowledge Graphs**

#### Visuals / Layout:
- Large modern banner with NeuroLearn AI logo and high-tech typography.
- Subtitle: *"Moving from Reactive Post-Mortem Grading to Proactive, Explainable, and Personalized Learning Intelligence"*
- Team Members Table:
  - **Narne Adithya Hanuman** (24BDS0220) — Project Lead & ML Engineer
  - **Tangudu Raajiv** (24BDS0242) — Knowledge Graph & Curriculum Architect
  - **Garikapati Charan Deep** (24BDS0260) — Database & Data Pipeline Engineer
  - **Bhamidipaty Sai Santosh** (24BDS0213) — Cognitive Modeling & Evaluation Lead
- Project Metadata:
  - Academic Period: Fall 2026
  - Status: Full Production Implementation (v1.0.0)

---

## Slide 2: The Core Problem

### Slide Title: **The Dilemma of Compounding Prerequisite Gaps**

#### Visuals / Layout:
- Split screen comparison:
  - *Left (Traditional LMS):* Canvas / Blackboard / Moodle — post-mortem exam failure, disconnected weekly modules, uncalibrated risk scores arriving after midterms.
  - *Right (The Reality of Learning):* Deep DAG prerequisite chain showing a student struggling in Binary Trees (Level 3) not because of trees, but because Arrays and Memory Contiguity (Level 1) was never truly consolidated.
- Key Bullet Points:
  1. **Reactive Post-Mortem Assessment**: Teachers and students only discover struggles after poor exam grades.
  2. **Topological Blindness**: Standard platforms (LeetCode, HackerRank) treat problems as isolated tests without structural dependency awareness.
  3. **Cognitive Compounding**: Over 80% of persistent failures in advanced computer science concepts stem from unaddressed upstream root deficits.
  4. **Instructor Overload**: Faculty managing 100–300 students cannot diagnose individual root causes in time.

---

## Slide 3: Solution Overview

### Slide Title: **The Three-Tier NeuroLearn Architecture**

#### Visuals / Layout:
- Three layered horizontal cards with distinct accent colors:
  - **Tier 1 — Curricular Knowledge Graph (DAG)**:
    - 38 curated DSA concepts, 64 prerequisite edges, 6 hierarchical difficulty tiers.
    - Zero cycles, strict topological ordering, 76 verified learning and practice resources.
  - **Tier 2 — Cognitive Digital Learning Twin**:
    - Continuously recomputed student profile tracking Exponential Moving Average (EMA) mastery.
    - Prerequisite-gated readiness, Ebbinghaus exponential forgetting decay (0.5%/day), submission velocity, consistency, and cohort engagement.
  - **Tier 3 — Calibrated Explainable ML Engine**:
    - XGBoost classifier with Isotonic probability calibration predicting 14-day prospective struggle (< 60%).
    - TreeSHAP attribution generating plain English explanations without mathematical jargon.
    - Graph-traversal root gap diagnosis identifying the deepest unmastered ancestor.

---

## Slide 4: Multi-Tier Microservice Architecture

### Slide Title: **Production-Grade Microservice Infrastructure**

#### Visuals / Layout:
- Microservices topology diagram:
  - `Browser Client` (React 18 + Vite + TailwindCSS + TanStack Query + Cytoscape.js)
  - `-> [HTTPS / REST]`
  - `Express.js Gateway` (Node.js LTS + TypeScript + Helmet + Pino + Zod + JWT + Dual-Layer Cache)
  - `-> [PostgreSQL 16]` (Relational persistence: 10 tables, partial indexes, deterministic seed)
  - `-> [FastAPI ML Service]` (Python 3.12 + Uvicorn + XGBoost + TreeSHAP + NetworkX)
- Architectural Highlights:
  - **Idempotency**: `client_attempt_id` prevents duplicate attempt accounting on retries.
  - **High Availability & Stale Fallbacks**: If ML service goes offline, backend gracefully returns cached predictions marked with `stale: true`.
  - **Strict Access Control**: Students access only their data; faculty view only their assigned cohorts.

---

## Slide 5: The Cognitive Digital Learning Twin

### Slide Title: **Dynamic Cognitive Modeling in Real Time**

#### Visuals / Layout:
- Equation callout cards alongside dynamic time-series charts:
  - **EMA Mastery**:
    $$\text{Mastery}_{t} = (1 - \alpha) \cdot \text{Mastery}_{t-1} + \alpha \cdot \text{Score}_t \cdot \text{Readiness}$$
  - **Readiness Gating**: Computed from mean mastery of immediate prerequisite concepts.
  - **Forgetting Decay**:
    $$\text{Decay} = e^{-\lambda \cdot \Delta t} \quad (\lambda = 0.005 / \text{day})$$
  - **Behavioral Dimensions**:
    - *Velocity*: 7-day attempt frequency relative to curriculum pace.
    - *Consistency*: Reciprocal standard deviation of inter-attempt intervals.
    - *Engagement*: Cohort-relative percentile tracking dropoff or cramming patterns.
- Archetypes: Handled demo archetypes including steady learners, dropoff risk, and irregular crammers.

---

## Slide 6: Predictive Risk Modeling & Explainability (SHAP)

### Slide Title: **Forecasting Failure 14 Days Ahead with Plain English Reasons**

#### Visuals / Layout:
- Calibration curve and SHAP beeswarm summary plot side-by-side.
- Technical Specs:
  - **Algorithm**: XGBoost (scale_pos_weight tuned, GroupKFold 5-fold student-grouped cross-validation).
  - **Calibration**: Isotonic regression scaling raw logits into verified probabilities.
  - **Decision Threshold**: Optimized at 0.50 balancing precision (43.4%) and high recall (82.5%).
  - **Brier Calibration Score**: 0.126 (well under the PRD ceiling of 0.18).
- Explainability in Action (TreeSHAP -> Natural Language):
  - *Mathematical Attribution:* `prereq_min_mastery: -0.84`, `recent_score_trend: -0.42`
  - *Plain English Reason:* `"A key prerequisite, Arrays and Memory Contiguity, is weak at 38%"`
  - Zero raw variable names, zero mathematical jargon, and zero unfilled templates.

---

## Slide 7: Curricular Knowledge Graph & Root Gap Traversal

### Slide Title: **Diagnosing the True Root Cause Upstream**

#### Visuals / Layout:
- Interactive DAG diagram highlighting Demo Student 1 (Asha):
  - *Symptom:* Failing Binary Trees (Level 3) & Singly Linked Lists (Level 2).
  - *Traversal Path:* Backwards BFS/DFS across prerequisite dependencies.
  - *Diagnosis:* Identifies **Arrays & Memory Contiguity** (Level 1) as the unaddressed bottleneck.
- Root Gap Algorithm Metrics:
  - Tested against synthetic ground truth across 300 simulated student profiles.
  - **Top-1 Diagnosis Accuracy**: **98.65%** (PRD Target: $\ge 85.0\%$).
  - **Top-3 Diagnosis Accuracy**: **100.00%**.
  - Eliminates superficial remediation by fixing the root foundational gap first.

---

## Slide 8: Personalised Learning Paths & Simulation Benchmark

### Slide Title: **Topologically-Ordered Learning Paths & Validated Learning Gain**

#### Visuals / Layout:
- Stepper diagram displaying a 5-step custom remediation sequence:
  1. *Step 1:* Visualizing Contiguous Memory (Video, 12 min) — *Reason: Fixes foundational root gap*
  2. *Step 2:* Array Pointer Arithmetic Practice (Exercise, 25 min) — *Reason: Consolidates Level 1*
  3. *Step 3:* Dynamic Node Allocation (Article, 15 min) — *Reason: Unlocks Linked Lists*
- Multi-Strategy Simulation Benchmark (100 student twins, 20 random seeds):
  - **NeuroLearn AI Strategy**: **+60.7% true mastery gain** over standard syllabus progression.
  - **Weakest First Baseline**: +34.2% gain.
  - **Random Weak Baseline**: +18.5% gain.
  - Confirms that topologically respecting prerequisite ordering accelerates cognitive recovery.

---

## Slide 9: Live Interactive Walkthrough

### Slide Title: **Student and Faculty Dashboards in Action**

#### Visuals / Layout:
- Side-by-side screenshots / live demo prompts:
  - *Student Portal (`/student`):*
    - Interactive 38-concept mastery heatmap with color-coded confidence levels.
    - High-risk forecast list with plain-English reasons.
    - Upstream root gap cards with graphical dependency chains.
    - Attempt Drawer: Real-time practice logging with optimistic UI updates in $< 1.5$ seconds.
  - *Faculty Portal (`/faculty`):*
    - Cohort risk distribution and early warning alerts (risk rise $\ge 0.20$ in 7 days).
    - Ranked common prerequisite gaps chart pinpointing class-wide curriculum bottlenecks.
    - Cross-cohort isolation and student drilldown.

---

## Slide 10: Impact, Limitations, Ethical AI, and Roadmap

### Slide Title: **Impact, Honest Limitations, and Future Horizons**

#### Visuals / Layout:
- Summary matrix of key outcomes and engineering integrity:
  - **Core Engineering Achievements**:
    - 10/10 PRD user stories satisfied.
    - Zero secrets in repository; robust security posture (bcrypt-12, JWT, rate limits, X-API-Key).
    - Sub-second API responses (p95 $< 600$ ms on analysis, $< 1.5$ s on attempt recomputations).
  - **Honest Limitations**:
    - *Synthetic Cohort:* Trained on mathematically validated synthetic data; requires IRB-approved real-classroom randomized controlled trials.
    - *Domain Scope:* Currently optimized for Data Structures and Algorithms; expansion requires ontologies for additional domains.
    - *Cold Start:* Students with $< 3$ attempts marked with low confidence chips.
  - **Next Steps / Roadmap**:
    - LLM-assisted multi-modal automated exercise generation.
    - Canvas / Blackboard LTI 1.3 standards integration.
    - Multi-institutional longitudinal educational studies.

