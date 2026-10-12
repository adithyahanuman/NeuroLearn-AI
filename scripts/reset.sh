#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# scripts/reset.sh – Drops and recreates public schema, applies all migrations
# ══════════════════════════════════════════════════════════════════════════════

set -e

DB_USER="${POSTGRES_USER:-neurolearn}"
DB_NAME="${POSTGRES_DB:-neurolearn}"

echo "🔄 Resetting database schema..."

# Drop and recreate public schema
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Applying migration 001_init.sql..."
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < db/migrations/001_init.sql

echo "Applying migration 002_indexes.sql..."
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < db/migrations/002_indexes.sql

echo "✅ Database schema reset and all migrations applied successfully."
