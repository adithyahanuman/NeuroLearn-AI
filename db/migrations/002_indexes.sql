-- ══════════════════════════════════════════════════════════════════════════════
-- NeuroLearn AI – Migration 002: Indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Attempts Indexes ─────────────────────────────────────────────────────────
-- Fast filtering and ordered retrieval of attempts per student & concept
CREATE INDEX IF NOT EXISTS idx_attempts_student_concept_date
    ON attempts (student_id, concept_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_student_date
    ON attempts (student_id, attempted_at DESC);

-- ── Predictions Indexes ──────────────────────────────────────────────────────
-- Ordered retrieval of recent predictions
CREATE INDEX IF NOT EXISTS idx_predictions_student_created
    ON predictions (student_id, created_at DESC);

-- Required by Express DISTINCT ON query for latest prediction per concept:
-- SELECT DISTINCT ON (concept_id) ... FROM predictions WHERE student_id = $1 ORDER BY concept_id, created_at DESC;
CREATE INDEX IF NOT EXISTS idx_predictions_distinct_on
    ON predictions (student_id, concept_id, created_at DESC);

-- ── Digital Twin Snapshots ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_twin_snapshots_student_taken
    ON twin_snapshots (student_id, taken_at DESC);

-- ── Relationship & Foreign Key Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_cohort
    ON students (cohort_id);

CREATE INDEX IF NOT EXISTS idx_cohorts_faculty
    ON cohorts (faculty_id);

CREATE INDEX IF NOT EXISTS idx_prerequisites_requires
    ON prerequisites (requires_id);

CREATE INDEX IF NOT EXISTS idx_resources_concept
    ON resources (concept_id);

-- ── Recommendations: Partial Unique Index for Single Active Path ─────────────
-- Ensures each student can have at most one 'active' recommendation at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_one_active
    ON recommendations (student_id)
    WHERE status = 'active';

