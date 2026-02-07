$ErrorActionPreference = "Stop"

$envPath = "C:\Users\Lucas Magista\Downloads\financial-dashboard\.env.local"
$migrationPath = "C:\Users\Lucas Magista\Downloads\financial-dashboard\scripts\migrations\2026-02-01-add-transaction-metadata.sql"

$line = Get-Content -Path $envPath | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
if (-not $line) { Write-Error "DATABASE_URL not found in $envPath"; exit 1 }
$env:DATABASE_URL = $line -replace "^DATABASE_URL=",""

psql "$env:DATABASE_URL" -f $migrationPath
