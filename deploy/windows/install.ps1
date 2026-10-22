<#
.SYNOPSIS
  Builds LoyalTEA and installs (or updates) it as a Windows service.

.DESCRIPTION
  Run from an elevated PowerShell prompt inside the downloaded LoyalTEA folder:

      .\deploy\windows\install.ps1 -NssmPath C:\Tools\nssm\win64\nssm.exe

  What it does:
    1. Builds the app (needs Node.js 22 and internet access to npmjs.org)
    2. Copies the built app to C:\LoyalTEA\app and the IIS file to C:\LoyalTEA\iis
    3. Installs/updates the "LoyalTEA" Windows service (runs as LocalService, starts with Windows)
    4. Starts it and checks it can reach the database

  Safe to run again for updates.

.PARAMETER NssmPath
  Path to nssm.exe (https://nssm.cc). NSSM runs Node.js as a Windows service.

.PARAMETER InstallDir
  Where LoyalTEA lives. Default C:\LoyalTEA. Settings file must be <InstallDir>\loyaltea.env

.PARAMETER SkipService
  Build and copy files only (used for testing, or when building on another machine).
#>
[CmdletBinding()]
param(
  [string]$NssmPath = "nssm.exe",
  [string]$InstallDir = "C:\LoyalTEA",
  [switch]$SkipService
)

$ErrorActionPreference = "Stop"
$ServiceName = "LoyalTEA"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$EnvFile = Join-Path $InstallDir "loyaltea.env"
$AppDir = Join-Path $InstallDir "app"
$IisDir = Join-Path $InstallDir "iis"
$LogDir = Join-Path $InstallDir "logs"

function Step($text) { Write-Host ""; Write-Host "==> $text" -ForegroundColor Magenta }

function Read-EnvFile([string]$Path) {
  $values = [ordered]@{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq "" -or $t.StartsWith("#")) { continue }
    $i = $t.IndexOf("=")
    if ($i -lt 1) { throw "Can't read this line in ${Path}: $line" }
    $values[$t.Substring(0, $i).Trim()] = $t.Substring($i + 1).Trim()
  }
  return $values
}

function Test-Settings($s) {
  $problems = @()
  $filled = @{}
  foreach ($key in @("DATABASE_URL", "SESSION_SECRET", "STAFF_PIN", "MANAGER_PIN")) {
    if (-not $s.Contains($key) -or [string]::IsNullOrWhiteSpace($s[$key]) -or $s[$key] -match "CHANGE_ME") {
      $problems += "$key is missing or still says CHANGE_ME"
    } else { $filled[$key] = $s[$key] }
  }
  if ($filled.ContainsKey("SESSION_SECRET") -and $filled["SESSION_SECRET"].Length -lt 32) { $problems += "SESSION_SECRET should be at least 32 characters" }
  foreach ($key in @("STAFF_PIN", "MANAGER_PIN")) {
    if ($filled.ContainsKey($key) -and $filled[$key] -notmatch "^\d{6,12}$") { $problems += "$key must be 6 to 12 digits" }
  }
  if ($filled.ContainsKey("STAFF_PIN") -and $filled["STAFF_PIN"] -eq $filled["MANAGER_PIN"]) { $problems += "STAFF_PIN and MANAGER_PIN must be different" }
  return $problems
}

# --- Checks -------------------------------------------------------------------
Step "Checking settings"
if (-not (Test-Path -LiteralPath $EnvFile)) {
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Copy-Item (Join-Path $PSScriptRoot "loyaltea.env.example") $EnvFile
  throw "Created $EnvFile from the template. Fill it in, then run this script again."
}
$settings = Read-EnvFile $EnvFile
$problems = Test-Settings $settings
if ($problems.Count -gt 0) { throw ("Fix these in ${EnvFile}:`n - " + ($problems -join "`n - ")) }
$port = "3000"
if ($settings.Contains("PORT") -and $settings["PORT"]) { $port = $settings["PORT"] }
Write-Host "Settings OK"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js isn't installed. Install Node.js 22 LTS from https://nodejs.org" }
$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) { throw "Node.js 20 or newer is needed (found $(node --version))." }

# --- Build --------------------------------------------------------------------
Step "Building LoyalTEA (takes a few minutes)"
Push-Location $RepoRoot
try {
  & npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally { Pop-Location }

$standalone = Join-Path $RepoRoot ".next\standalone"
if (-not (Test-Path (Join-Path $standalone "server.js"))) { throw "Build output not found at $standalone" }

# --- Copy ---------------------------------------------------------------------
if (-not $SkipService) {
  $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq "Running") {
    Step "Stopping the running service for the update"
    Stop-Service -Name $ServiceName
  }
}

Step "Copying files to $InstallDir"
foreach ($d in @($InstallDir, $IisDir, $LogDir)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir }
Copy-Item -Recurse $standalone $AppDir
Copy-Item -Recurse (Join-Path $RepoRoot ".next\static") (Join-Path $AppDir ".next\static")
Copy-Item -Recurse (Join-Path $RepoRoot "public") (Join-Path $AppDir "public")
# The settings file is the only source of configuration; never ship a stray .env inside the app
Get-ChildItem -LiteralPath $AppDir -Filter ".env*" -Force | Remove-Item -Force
(Get-Content (Join-Path $PSScriptRoot "web.config") -Raw).Replace("127.0.0.1:3000", "127.0.0.1:$port") |
  Set-Content -Encoding UTF8 (Join-Path $IisDir "web.config")
Write-Host "App:  $AppDir"
Write-Host "IIS:  $IisDir\web.config"

if ($SkipService) { Write-Host "`nFiles ready. Skipping service setup (-SkipService)."; return }

# --- Lock down the settings file (contains the database password and PINs) ----
Step "Restricting access to $EnvFile"
& icacls $EnvFile /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" | Out-Null   # Administrators, SYSTEM
& icacls $LogDir /grant "*S-1-5-19:(OI)(CI)M" | Out-Null                                 # LocalService can write logs

# --- Service --------------------------------------------------------------------
Step "Setting up the $ServiceName Windows service"
if (-not (Get-Command $NssmPath -ErrorAction SilentlyContinue)) { throw "nssm.exe not found at '$NssmPath'. Download from https://nssm.cc and pass -NssmPath." }
$nodeExe = (Get-Command node).Source

if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
  & $NssmPath install $ServiceName $nodeExe "server.js" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Couldn't create the service" }
}

$envPairs = @(
  "NODE_ENV=production",
  "HOSTNAME=127.0.0.1",          # only reachable from this server (through IIS), never directly
  "PORT=$port",
  "NEXT_TELEMETRY_DISABLED=1"
)
foreach ($key in $settings.Keys) {
  if ($key -ne "PORT" -and $settings[$key] -ne "") { $envPairs += "$key=$($settings[$key])" }
}

$set = @(
  @("Application", $nodeExe),
  @("AppParameters", "server.js"),
  @("AppDirectory", $AppDir),
  @("DisplayName", "LoyalTEA canteen stamp cards"),
  @("Description", "LoyalTEA web app. Settings: $EnvFile"),
  @("Start", "SERVICE_AUTO_START"),
  @("ObjectName", "NT AUTHORITY\LocalService"),
  @("AppStdout", (Join-Path $LogDir "app.log")),
  @("AppStderr", (Join-Path $LogDir "app.log")),
  @("AppRotateFiles", "1"),
  @("AppRotateOnline", "1"),
  @("AppRotateBytes", "10485760"),
  @("AppExit", "Default", "Restart"),
  @("AppRestartDelay", "5000")
)
foreach ($s in $set) {
  & $NssmPath set $ServiceName @s | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Couldn't set $($s[0]) on the service" }
}
& $NssmPath set $ServiceName AppEnvironmentExtra @envPairs | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Couldn't set the service settings" }

Step "Starting the service"
Start-Service -Name $ServiceName

$healthy = $false
for ($i = 0; $i -lt 20 -and -not $healthy; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$port/api/health"
    $healthy = ($r.StatusCode -eq 200)
  } catch { }
}

if ($healthy) {
  Write-Host ""
  Write-Host "LoyalTEA is running and connected to the database." -ForegroundColor Green
  Write-Host "Next: point the IIS site at $IisDir (see docs\WINDOWS-SERVER.md, step 6)."
} else {
  Write-Warning "The service started but the health check failed. Check $LogDir\app.log (usually the DATABASE_URL or the database tables)."
  exit 1
}
