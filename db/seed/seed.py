#!/usr/bin/env python3
"""
db/seed/seed.py

Database seed script for NeuroLearn AI (Section 17.4 & Phase 2):
1. Loads concepts.json, prerequisites.json, and resources.json into PostgreSQL.
2. Seeds 1 faculty user ('faculty@neurolearn.ai', password 'demo', bcrypt cost 12).
3. Seeds 3 cohorts owned by the faculty user ('Cohort A', 'Cohort B', 'Cohort C').
4. Seeds 300 student users and student records:
   - 5 demo accounts with password 'demo' (bcrypt cost 12).
   - 295 generated student accounts with 1 shared pre-computed bcrypt hash for ultra-fast seeding.
5. Loads data/generated/attempts.csv using PostgreSQL COPY command.
6. Runs sanity queries to verify row counts and relational integrity.
"""

import os
import sys
import json
import csv
import io
import time
from pathlib import Path
import psycopg2
from psycopg2 import sql
import bcrypt

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def load_env_file():
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    if k not in os.environ:
                        os.environ[k] = v

def get_db_connection():
    load_env_file()
    user = os.environ.get("POSTGRES_USER", "neurolearn")
    password = os.environ.get("POSTGRES_PASSWORD", "changeme")
    db = os.environ.get("POSTGRES_DB", "neurolearn")
    host = os.environ.get("POSTGRES_HOST", "127.0.0.1")
    if host == "db":
        host = "127.0.0.1"
    port = os.environ.get("POSTGRES_PORT", "5433")

    return psycopg2.connect(
        dbname=db,
        user=user,
        password=password,
        host=host,
        port=port
    )

def seed_database():
    base_dir = Path(__file__).resolve().parent.parent.parent
    data_dir = base_dir / "data"
    gen_dir = data_dir / "generated"

    concepts_path = data_dir / "concepts.json"
    prereqs_path = data_dir / "prerequisites.json"
    resources_path = data_dir / "resources.json"
    students_csv_path = gen_dir / "students.csv"
    attempts_csv_path = gen_dir / "attempts.csv"

    for p in (concepts_path, prereqs_path, resources_path, students_csv_path, attempts_csv_path):
        if not p.exists():
            print(f"ERROR: Missing required seed file: {p}", file=sys.stderr)
            sys.exit(1)

    t0 = time.time()
    conn = get_db_connection()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("🌱 Seeding Concepts, Prerequisites, and Resources...")

        # 1. Load concepts
        with open(concepts_path, "r", encoding="utf-8") as f:
            concepts = json.load(f)

        cur.execute("TRUNCATE TABLE concepts CASCADE;")
        for c in concepts:
            cur.execute(
                """
                INSERT INTO concepts (id, code, name, description, level, difficulty, subject)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    level = EXCLUDED.level,
                    difficulty = EXCLUDED.difficulty;
                """,
                (c["id"], c["code"], c["name"], c["description"], c["level"], c["difficulty"], c.get("subject", "Data Structures and Algorithms"))
            )

        # 2. Load prerequisites
        with open(prereqs_path, "r", encoding="utf-8") as f:
            prerequisites = json.load(f)

        for p in prerequisites:
            cur.execute(
                """
                INSERT INTO prerequisites (concept_id, requires_id, strength)
                VALUES (%s, %s, %s)
                ON CONFLICT (concept_id, requires_id) DO UPDATE SET strength = EXCLUDED.strength;
                """,
                (p["concept_id"], p["requires_id"], p.get("strength", 1.0))
            )

        # 3. Load resources
        with open(resources_path, "r", encoding="utf-8") as f:
            resources = json.load(f)

        for r in resources:
            cur.execute(
                """
                INSERT INTO resources (id, concept_id, title, type, url, difficulty, est_minutes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    type = EXCLUDED.type,
                    url = EXCLUDED.url,
                    difficulty = EXCLUDED.difficulty,
                    est_minutes = EXCLUDED.est_minutes;
                """,
                (r["id"], r["concept_id"], r["title"], r["type"], r["url"], r["difficulty"], r["est_minutes"])
            )
        cur.execute("SELECT setval('resources_id_seq', (SELECT MAX(id) FROM resources));")

        # 4. Seed Faculty user & 3 Cohorts
        print("👨‍🏫 Seeding Faculty User & Cohorts...")
        faculty_password_raw = os.environ.get("DEMO_FACULTY_PASSWORD", "demo")
        faculty_hash = bcrypt.hashpw(faculty_password_raw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

        cur.execute(
            """
            INSERT INTO users (email, password_hash, name, role)
            VALUES (%s, %s, %s, 'faculty')
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
            RETURNING id;
            """,
            ("faculty@neurolearn.ai", faculty_hash, "Dr. Rao (Course Instructor)")
        )
        faculty_id = cur.fetchone()[0]

        cohort_map = {}
        for cname in ("Cohort A", "Cohort B", "Cohort C"):
            cur.execute(
                """
                INSERT INTO cohorts (name, faculty_id)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (cname, faculty_id)
            )
            cohort_map[cname] = cur.fetchone()[0]

        # 5. Precompute password hashes for students
        print("👥 Seeding 300 Students (5 demo + 295 synthetic)...")
        demo_password_raw = os.environ.get("DEMO_STUDENT_PASSWORD", "demo")
        demo_hash = bcrypt.hashpw(demo_password_raw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

        # Shared pre-computed hash for generated non-login student accounts
        shared_dummy_hash = bcrypt.hashpw("dummy_non_login_pass".encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

        with open(students_csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            students_data = list(reader)

        for s in students_data:
            s_id = s["id"]
            s_email = s["email"]
            s_name = s["name"]
            s_cohort_name = s["cohort"]
            is_demo = s["is_demo"].lower() == "true"
            cohort_id = cohort_map.get(s_cohort_name, list(cohort_map.values())[0])

            pw_hash = demo_hash if is_demo else shared_dummy_hash

            # Insert User
            cur.execute(
                """
                INSERT INTO users (email, password_hash, name, role)
                VALUES (%s, %s, %s, 'student')
                ON CONFLICT (email) DO NOTHING
                RETURNING id;
                """,
                (s_email, pw_hash, s_name)
            )
            row = cur.fetchone()
            if row:
                user_id = row[0]
            else:
                cur.execute("SELECT id FROM users WHERE email = %s;", (s_email,))
                user_id = cur.fetchone()[0]

            # Insert Student with deterministic ID
            cur.execute(
                """
                INSERT INTO students (id, user_id, cohort_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (s_id, user_id, cohort_id)
            )

        # 6. Load Attempts using COPY
        print("⚡ Loading attempts with COPY...")
        cur.execute("TRUNCATE TABLE attempts;")
        with open(attempts_csv_path, "r", encoding="utf-8") as f:
            cur.copy_expert(
                """
                COPY attempts (id, student_id, concept_id, score, time_spent_sec, hints_used, assessment_type, attempted_at, client_attempt_id)
                FROM STDIN WITH (FORMAT CSV, HEADER TRUE);
                """,
                f
            )

        conn.commit()
        duration = time.time() - t0
        print(f"✅ Seeding finished successfully in {duration:.2f} seconds!")

        # 7. Run Sanity Queries
        print("\n🔍 Running Sanity Queries:")
        cur.execute("SELECT COUNT(*) FROM concepts;")
        concepts_count = cur.fetchone()[0]
        print(f"  • Concepts count: {concepts_count} (Expected: 38)")

        cur.execute("SELECT COUNT(*) FROM prerequisites;")
        prereqs_count = cur.fetchone()[0]
        print(f"  • Prerequisites count: {prereqs_count} (Expected: 64)")

        cur.execute("SELECT COUNT(*) FROM resources;")
        resources_count = cur.fetchone()[0]
        print(f"  • Resources count: {resources_count} (Expected: 76)")

        cur.execute("SELECT COUNT(*) FROM students;")
        students_count = cur.fetchone()[0]
        print(f"  • Students count: {students_count} (Expected: 300)")

        cur.execute("SELECT COUNT(*) FROM attempts;")
        attempts_count = cur.fetchone()[0]
        print(f"  • Attempts count: {attempts_count}")

        cur.execute("SELECT COUNT(*) FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL;")
        orphan_students = cur.fetchone()[0]
        print(f"  • Orphan students (no user): {orphan_students} (Expected: 0)")

        cur.execute(
            """
            SELECT COUNT(*) FROM prerequisites p
            LEFT JOIN concepts c1 ON p.concept_id = c1.id
            LEFT JOIN concepts c2 ON p.requires_id = c2.id
            WHERE c1.id IS NULL OR c2.id IS NULL;
            """
        )
        broken_edges = cur.fetchone()[0]
        print(f"  • Broken prerequisite edges: {broken_edges} (Expected: 0)")

        # Assertions
        assert concepts_count == 38, f"Expected 38 concepts, got {concepts_count}"
        assert students_count == 300, f"Expected 300 students, got {students_count}"
        assert orphan_students == 0, f"Found {orphan_students} orphan students"
        assert broken_edges == 0, f"Found {broken_edges} broken edges"

        print("✨ All sanity assertions passed!\n")

    except Exception as e:
        conn.rollback()
        print(f"❌ Seeding failed: {e}", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_database()
