# ══════════════════════════════════════════════════════════════════════════════
# scripts/seed.ps1 – PowerShell seed runner
# ══════════════════════════════════════════════════════════════════════════════

Write-Host "Checking synthetic datasets..."
$studentsExist = Test-Path "data\generated\students.csv"
$attemptsExist = Test-Path "data\generated\attempts.csv"

if (-not $studentsExist -or -not $attemptsExist) {
    Write-Host "Synthetic data missing. Running generate_data.py..."
    python ml-service\training\generate_data.py
} else {
    Write-Host "Synthetic data already present."
}

Write-Host "Running database seeder..."
python db\seed\seed.py

Write-Host "Database seeded successfully."
