-- ══════════════════════════════════════════════════════════════════════════════
-- NeuroLearn AI – Migration 001: Schema Initialisation
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'faculty');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_type AS ENUM ('quiz', 'assignment', 'practice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recommendation_status AS ENUM ('active', 'stale', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ── Users & Cohorts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Concepts, Prerequisites, and Resources ───────────────────────────────────
CREATE TABLE IF NOT EXISTS concepts (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 6),
    difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    subject VARCHAR(100) NOT NULL DEFAULT 'Data Structures and Algorithms'
);

CREATE TABLE IF NOT EXISTS prerequisites (
    concept_id SMALLINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    requires_id SMALLINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    strength NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (strength BETWEEN 0.00 AND 1.00),
    PRIMARY KEY (concept_id, requires_id),
    CONSTRAINT chk_no_self_prereq CHECK (concept_id <> requires_id)
);

CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    concept_id SMALLINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'article', 'practice')),
    url TEXT NOT NULL,
    difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    est_minutes INT NOT NULL CHECK (est_minutes > 0)
);

-- ── Student Attempts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id SMALLINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    score NUMERIC(4, 3) NOT NULL CHECK (score BETWEEN 0.000 AND 1.000),
    time_spent_sec INT NOT NULL CHECK (time_spent_sec >= 0),
    hints_used INT NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
    assessment_type assessment_type NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_attempt_id UUID NOT NULL,
    CONSTRAINT uq_attempts_student_client UNIQUE (student_id, client_attempt_id)
);

-- ── Digital Twin Snapshots ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS twin_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state JSONB NOT NULL
);

-- ── Predictions (with Reasons and Root Gaps) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id SMALLINT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    risk NUMERIC(4, 3) NOT NULL CHECK (risk BETWEEN 0.000 AND 1.000),
    band VARCHAR(20) NOT NULL CHECK (band IN ('low', 'medium', 'high')),
    model_version VARCHAR(50) NOT NULL,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    root_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Recommendations and Progress ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status recommendation_status NOT NULL DEFAULT 'active',
    path JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS path_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    step_index INT NOT NULL CHECK (step_index >= 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_path_progress_step UNIQUE (recommendation_id, step_index)
);

-- ── Model Registry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_registry (
    version VARCHAR(50) PRIMARY KEY,
    trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    auc NUMERIC(4, 3),
    recall NUMERIC(4, 3),
    brier NUMERIC(4, 3),
    feature_list JSONB NOT NULL,
    artifact_path TEXT NOT NULL
);

