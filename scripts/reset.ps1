# ══════════════════════════════════════════════════════════════════════════════
# scripts/reset.ps1 – PowerShell database reset & migration script
# ══════════════════════════════════════════════════════════════════════════════

$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "neurolearn" }
$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "neurolearn" }

Write-Host "🔄 Resetting database schema..."

docker compose exec -T db psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

Write-Host "Applying migration 001_init.sql..."
Get-Content -Raw "db/migrations/001_init.sql" | docker compose exec -T db psql -U $DB_USER -d $DB_NAME

Write-Host "Applying migration 002_indexes.sql..."
Get-Content -Raw "db/migrations/002_indexes.sql" | docker compose exec -T db psql -U $DB_USER -d $DB_NAME

Write-Host "✅ Database schema reset and all migrations applied successfully."
