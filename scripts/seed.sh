#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# scripts/seed.sh – Generates CSVs if missing and seeds the database
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "🔍 Checking synthetic datasets..."
if [ ! -f "data/generated/students.csv" ] || [ ! -f "data/generated/attempts.csv" ]; then
    echo "⚙️ Synthetic data missing. Running generate_data.py..."
    python ml-service/training/generate_data.py
else
    echo "✓ Synthetic data already present."
fi

echo "🌱 Running database seeder..."
python db/seed/seed.py

echo "✅ Database seeded successfully."

