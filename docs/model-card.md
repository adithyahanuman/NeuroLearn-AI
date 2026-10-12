# NeuroLearn AI — Model Card: Risk Prediction Model v1

## 1. Model Details

- **Model Name:** NeuroLearn Student Concept Risk Predictor (`model_v1`)
- **Architecture:** Gradient Boosted Decision Trees (XGBoost Classifier) with Isotonic Probability Calibration (`CalibratedClassifierCV`)
- **Version:** `v1.0.0`
- **Trained Date:** October 2026
- **License:** MIT
- **Contact:** NeuroLearn AI Development Team

---

## 2. Intended Use & Responsible AI

- **Primary Purpose:** Assist faculty and students by estimating the risk that a student will score below 60% on their next attempt for a specific DSA concept within a 14-day window.
- **Intended Users:** University course instructors, teaching assistants, and self-directed computer science students.
- **Decision Scope:** Designed strictly as an **educational decision-support system**. Predictions should inform personalized review recommendations and proactive instructor office-hour invitations.
- **Prohibited Uses:** The model must **never** be used for automated grade penalties, admissions screening, course gating, or any high-stakes evaluative academic decisions without human review.

---

## 3. Training & Validation Data

- **Domain:** Data Structures and Algorithms (DSA) Knowledge Graph with 38 concepts spanning Levels 1 to 6 and 64 prerequisite dependencies.
- **Cohorts:** 300 simulated students across 3 cohorts (A, B, C) over a 14-week curriculum (98 simulated days).
- **Simulated Dynamics:**
  - Latent ability $\theta \sim \mathcal{N}(0, 1)$ and engagement style from $\text{Beta}(2, 2)$.
  - Time-based forgetting decay (0.5% per day without practice).
  - Prerequisite readiness gating (readiness $\in [0.2, 1.0]$).
  - 25% of students carry a hidden blocked root gap in Level 2 or Level 3.
  - Total attempts: 34,555.
- **Leakage Prevention:** Features are computed strictly using attempts occurring *before* prediction time $t$. Cohort engagement metrics use 7-day retrospective windows strictly prior to $t$.
- **Temporal Splits:**
  - **Train Set (Weeks 2–6):** 9,315 rows (Label 1 share: 25.26%)
  - **Buffer Week 7:** Skipped to prevent temporal bleed.
  - **Validation Set (Weeks 8–9):** 3,662 rows (Label 1 share: 30.75%)
  - **Buffer Week 10:** Skipped.
  - **Held-Out Test Set (Weeks 11–12):** 3,573 rows (Label 1 share: 31.40%)

---

## 4. Feature Set (15 Features)

1. `avg_score_last3`: Mean score of the last 3 attempts on the concept (or prior if 0 attempts).
2. `avg_score_all`: Historical mean score across all attempts on the concept.
3. `score_slope_5`: Linear trend slope of last 5 scores ($\text{NaN}$ if $<3$ attempts).
4. `attempts_count`: Total prior attempts on the concept.
5. `days_since_last_attempt`: Days since last practice (defaults to 60.0 if unattempted).
6. `time_ratio`: Time spent on exercises relative to typical concept benchmark time.
7. `hints_rate`: Mean hints used per attempt.
8. `prereq_mean_mastery`: Mean twin mastery of direct prerequisites in the knowledge graph.
9. `prereq_min_mastery`: Minimum twin mastery among all ancestors in the knowledge graph.
10. `n_weak_prereqs`: Number of ancestor concepts with mastery below 60%.
11. `concept_difficulty`: Difficulty level (1 to 5).
12. `concept_level`: Curriculum tier (Level 1 to 6).
13. `student_mean_mastery`: Student's overall average mastery across all 38 concepts.
14. `student_consistency`: Standard deviation of practice intervals (0.5 default for $<3$ attempts).
15. `student_engagement`: Ratio of 7-day attempt count to cohort median.

---

## 5. Performance Metrics (Held-Out Test Set: Weeks 11–12)

Evaluated strictly once on the held-out test rows ($N = 3,573$):

| Metric | Target (PRD §1.9) | Baseline (Logistic Reg) | XGBoost v1 (Calibrated) | Status |
| :--- | :---: | :---: | :---: | :---: |
| **ROC AUC** | $\ge 0.80$ | 0.8872 | **0.9365** | **PASS** |
| **PR AUC (Average Precision)** | — | 0.7712 | **0.8654** | **PASS** |
| **Recall (at Threshold 0.50)** | $\ge 0.75$ | 0.8021 | **0.8004** | **PASS** |
| **Precision (at Threshold 0.50)** | — | 0.6948 | **0.7735** | **PASS** |
| **Calibration (Brier Score)** | $< 0.18$ | 0.1412 | **0.0984** | **PASS** |
| **Root Gap Accuracy (Top-3)** | $\ge 85\%$ | — | **98.65%** | **PASS** |
| **Root Gap Accuracy (Top-1)** | — | — | **98.65%** | **PASS** |

### Evaluation Visualizations
- **ROC Curve:** `docs/roc_curve.png`
- **Reliability / Calibration Curve:** `docs/calibration_curve.png`
- **Confusion Matrix:** `docs/confusion_matrix.png`
- **SHAP Summary Plot:** `docs/shap_summary.png`

---

## 6. Ablation Study: Knowledge Graph Value

To quantify the empirical contribution of knowledge graph prerequisite features (`prereq_mean_mastery`, `prereq_min_mastery`, `n_weak_prereqs`), an identical XGBoost model was trained without graph features:

| Model Configuration | ROC AUC | PR AUC | AUC Delta |
| :--- | :---: | :---: | :---: |
| **Full Model (with Knowledge Graph)** | **0.9365** | **0.8654** | **Baseline** |
| **Ablation Model (No KG Prerequisite Features)** | 0.8872 | 0.7824 | **-0.0493 (-4.93%)** |

> **Finding:** Incorporating prerequisite graph topology into student twin features delivers a **+4.93% lift in ROC AUC** and **+8.30% lift in PR AUC**, validating that structural dependency modeling is essential for early risk detection.

---

## 7. Error Analysis (Worst False Negatives)

Top false negatives (where student failed, but model predicted low risk):
1. **Linear and Binary Search (ID 15):** Risk 0.024. Student had 52% overall mastery and clean prerequisite records, but experienced an unexpected score drop on difficulty-2 search problems.
2. **Two Pointers and Sliding Window (ID 16):** Risk 0.053. High initial scores on basic array problems led to optimistic mastery estimates before encountering edge-case window constraints.
3. **Divide and Conquer (ID 19):** Risk 0.053. Mastered recursion prerequisites, but failed on multi-branch tree recursion problems.
4. **Hash Tables and Hash Maps (ID 20):** Risk 0.053. Strong Level 1 background, but collided on open addressing / chaining practice sets.

*Mitigation:* Introduce concept-specific hint velocity and adaptive assessment weighting in future retraining cycles.

---

## 8. Limitations

1. **Synthetic Data:** Trained entirely on synthetic student simulation data; generalizability to real human classroom distributions requires pilot validation.
2. **Subject Scope:** Restricted exclusively to Data Structures and Algorithms (38 concepts). Cross-subject transfer (e.g., Operating Systems, Databases) requires dedicated ontology definition.
3. **Cold-Start Uncertainty:** Students with $< 3$ attempts have default consistency and engagement values and are marked with `confidence: low` in the API response.
