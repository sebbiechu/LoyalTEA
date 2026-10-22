<#
.SYNOPSIS
  Backs up the LoyalTEA database and deletes backups older than -KeepDays.

.DESCRIPTION
  Run once by hand to test:          .\backup.ps1
  Schedule it daily at 02:00:        .\backup.ps1 -Schedule

  Backups go to C:\LoyalTEA\backups\loyaltea-YYYY-MM-DD.dump

  To restore one (replaces the current data):
    & "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" --clean --if-exists `
      --dbname "postgres://loyaltea:PASSWORD@localhost:5432/loyaltea" `
      C:\LoyalTEA\backups\loyaltea-2026-01-31.dump
#>
[CmdletBinding()]
param(
  [string]$InstallDir = "C:\LoyalTEA",
  [int]$KeepDays = 30,
  [string]$PgDump = "",
  [switch]$Schedule
)

$ErrorActionPreference = "Stop"
$EnvFile = Join-Path $InstallDir "loyaltea.env"
$BackupDir = Join-Path $InstallDir "backups"

if ($Schedule) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -InstallDir `"$InstallDir`" -KeepDays $KeepDays"
  $trigger = New-ScheduledTaskTrigger -Daily -At 2am
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  Register-ScheduledTask -TaskName "LoyalTEA backup" -Action $action -Trigger $trigger -Principal $principal `
    -Description "Daily LoyalTEA database backup to $BackupDir" -Force | Out-Null
  Write-Host "Scheduled: 'LoyalTEA backup' runs daily at 02:00 (Task Scheduler)." -ForegroundColor Green
  return
}

# Find pg_dump if not given
if (-not $PgDump) {
  $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if ($found) { $PgDump = $found.FullName }
  elseif (Get-Command pg_dump -ErrorAction SilentlyContinue) { $PgDump = (Get-Command pg_dump).Source }
  else { throw "pg_dump not found. Pass -PgDump 'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe'" }
}

# Read DATABASE_URL from the settings file
$dbUrl = $null
foreach ($line in Get-Content -LiteralPath $EnvFile) {
  $t = $line.Trim()
  if ($t.StartsWith("DATABASE_URL=")) { $dbUrl = $t.Substring("DATABASE_URL=".Length).Trim() }
}
if (-not $dbUrl) { throw "DATABASE_URL not found in $EnvFile" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$file = Join-Path $BackupDir ("loyaltea-{0}.dump" -f (Get-Date -Format "yyyy-MM-dd"))
$tmp = "$file.tmp"

& $PgDump --format=custom --file=$tmp --dbname=$dbUrl
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force -ErrorAction SilentlyContinue $tmp
  throw "Backup failed (pg_dump exit code $LASTEXITCODE)"
}
Move-Item -Force $tmp $file
Write-Host "Backup saved: $file"

# Remove old backups
$cutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -LiteralPath $BackupDir -Filter "loyaltea-*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object { Remove-Item -Force $_.FullName; Write-Host "Removed old backup: $($_.Name)" }
