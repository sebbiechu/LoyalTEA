# Setting up LoyalTEA on Windows Server

A step-by-step guide for IT. Allow about an hour.

## What you're setting up

```
 Phone on office Wi-Fi
        │  HTTPS
        ▼
 ┌──────────── Windows Server ─────────────┐
 │  IIS  (HTTPS certificate, port 443)     │
 │    │  forwards to 127.0.0.1:3000        │
 │    ▼                                    │
 │  LoyalTEA service  (Node.js)            │
 │    │                                    │
 │    ▼                                    │
 │  PostgreSQL  (localhost only)           │
 └─────────────────────────────────────────┘
```

- **IIS** handles HTTPS. It's the only part visitors talk to.
- **LoyalTEA** runs as a Windows service. It only listens on `127.0.0.1`, so it can't be reached except through IIS.
- **PostgreSQL** stores the stamps. It only needs to accept connections from the same server.

## What you need

| Item | Notes |
| --- | --- |
| Windows Server 2019 or newer | 2 CPU / 4 GB RAM is plenty. Uses very little |
| **Node.js 22 LTS** | [nodejs.org](https://nodejs.org) (Windows installer, .msi) |
| **PostgreSQL 16** | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (EDB installer) |
| **IIS** with **URL Rewrite** and **Application Request Routing (ARR)** | Free Microsoft add-ons for IIS |
| **NSSM** | [nssm.cc](https://nssm.cc). A small free tool that runs Node.js as a Windows service |
| A **hostname** | e.g. `loyaltea.company.com` |
| An **HTTPS certificate personal phones trust** | See step 6. This matters |
| Internet access during install | To download the app's packages from npmjs.org (install only) |

---

## Step 1: Install the software

1. Install **Node.js 22 LTS**. Default options are fine.
2. Install **PostgreSQL 16**. Note the `postgres` password you choose. Default port 5432 is fine. Stack Builder isn't needed.
3. Install **IIS** (Server Manager > Add Roles > Web Server), then **URL Rewrite** and **Application Request Routing**.
4. Download **NSSM** and unzip it, e.g. to `C:\Tools\nssm`.
5. Download the LoyalTEA code from GitHub (green **Code** button > **Download ZIP**, or `git clone`), e.g. to `C:\Install\LoyalTEA`.

## Step 2: Create the database

Open **PowerShell as Administrator**. Choose a password for the app's database login (letters and numbers only):

```powershell
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

# Create the login and database (asks for the postgres password you set during install)
& $psql -U postgres -c "CREATE ROLE loyaltea LOGIN PASSWORD 'YourAppDbPassword'"
& $psql -U postgres -c "CREATE DATABASE loyaltea OWNER loyaltea"

# Create the tables (asks for YourAppDbPassword)
& $psql -U loyaltea -d loyaltea -f "C:\Install\LoyalTEA\database\schema.sql"
```

The last command should finish without any `ERROR` lines. It's safe to run again.

PostgreSQL only needs to accept connections from this server. Make sure port **5432 is closed** in Windows Firewall (the installer may offer to open it).

## Step 3: Fill in the settings

Create the folder `C:\LoyalTEA`, then copy `deploy\windows\loyaltea.env.example` to `C:\LoyalTEA\loyaltea.env` and open it in Notepad:

| Setting | What to put |
| --- | --- |
| `DATABASE_URL` | `postgres://loyaltea:YourAppDbPassword@localhost:5432/loyaltea` |
| `SESSION_SECRET` | A long random string. Generate one in PowerShell: `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Maximum 256 }))` |
| `STAFF_PIN` | 6+ digits, for canteen staff |
| `MANAGER_PIN` | 6+ digits, different from the staff PIN, for reports |
| `ALLOWED_IPS` | Optional. See step 7 |

The install script locks this file so only Administrators can read it.

## Step 4: Install the LoyalTEA service

In **PowerShell as Administrator**:

```powershell
cd C:\Install\LoyalTEA
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\windows\install.ps1 -NssmPath C:\Tools\nssm\win64\nssm.exe
```

This builds the app, copies it to `C:\LoyalTEA\app`, creates the **LoyalTEA** Windows service (starts automatically with Windows, runs as the low-privilege *LocalService* account, restarts itself if it stops), then checks it can reach the database.

You should see: **LoyalTEA is running and connected to the database.**

If it says the settings need fixing, it lists exactly what's wrong.

## Step 5: Set up IIS (one-off)

```powershell
.\deploy\windows\configure-iis.ps1
```

This turns on ARR's forwarding, passes the visitor's address through for the office Wi-Fi check, and lets the app's own messages through (for example "Wrong PIN") instead of IIS error pages.

Then in **IIS Manager**:

1. **Add Website**: name `LoyalTEA`, physical path `C:\LoyalTEA\iis` (contains only `web.config`, created by the install script).
2. **Bindings**: add **https**, port 443, your hostname, your certificate. Keep **http** on port 80 too: it automatically redirects to https.

## Step 6: HTTPS certificate

**This is the step that most often goes wrong.**

HTTPS is required. Phones only allow the till's camera scanner on secure sites. Colleagues use **personal phones**, which **don't trust certificates from an internal company certificate authority**. So the certificate must be publicly trusted:

- the company's existing **wildcard certificate** (e.g. `*.company.com`), or
- a free **Let's Encrypt** certificate using a DNS challenge (e.g. via win-acme). This works even if the site is internal only.

## Step 7: Office Wi-Fi only (recommended)

Use both layers:

1. **Network:** only publish the hostname in internal DNS and/or only allow the office Wi-Fi network to reach the server at the firewall. Phones on 4G or home Wi-Fi then can't reach it at all.
2. **In the app:** set `ALLOWED_IPS` in `C:\LoyalTEA\loyaltea.env` to the office Wi-Fi address range, e.g. `ALLOWED_IPS=10.20.0.0/16` (several can be comma-separated). Anyone else sees an "Office Wi-Fi only" page. Then re-run step 4 to apply.

Use the addresses that phones on the office Wi-Fi have **as the server sees them**. If the Wi-Fi is NAT'd before reaching the server, that's the NAT address. The canteen till and managers' devices must be on an allowed network too.

## Step 8: Daily backups

```powershell
.\deploy\windows\backup.ps1            # run once now to check it works
.\deploy\windows\backup.ps1 -Schedule  # then schedule it daily at 02:00
```

Backups go to `C:\LoyalTEA\backups`. The last 30 days are kept (change with `-KeepDays`). Include this folder in the server's normal backups too.

**To restore** a backup (replaces the current data):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" --clean --if-exists `
  --dbname "postgres://loyaltea:YourAppDbPassword@localhost:5432/loyaltea" `
  C:\LoyalTEA\backups\loyaltea-2026-01-31.dump
```

## Step 9: Check it works

1. On a phone on the office Wi-Fi, open `https://loyaltea.company.com`. You should see a stamp card and QR code.
2. On the till device, open `https://loyaltea.company.com/staff`, enter the staff PIN and allow the camera.
3. Scan the phone and tap **+1 Stamp**. The stamp appears on the phone within a few seconds.
4. Open `/staff/reports` with the manager PIN. Today's stamp shows up.

---

## Day-to-day

| Task | How |
| --- | --- |
| **Is it up?** | `https://loyaltea.company.com/api/health` shows `{"status":"ok"}` |
| **Logs** | `C:\LoyalTEA\logs\app.log` (rotates at 10 MB) |
| **Restart** | `Restart-Service LoyalTEA` |
| **Change a PIN** | Edit `C:\LoyalTEA\loyaltea.env`, re-run step 4. Everyone using the old PIN is signed out |
| **Update to a new version** | Download the new code, re-run step 4. Stamps are kept. If the update notes say so, re-run the `schema.sql` command from step 2 |
| **Remove it** | `nssm remove LoyalTEA confirm`, delete the IIS site, drop the `loyaltea` database, delete `C:\LoyalTEA` |

## Troubleshooting

| Problem | Likely cause |
| --- | --- |
| Install says the health check failed | Wrong `DATABASE_URL` password, or step 2's `schema.sql` wasn't run. Check `C:\LoyalTEA\logs\app.log` |
| IIS shows **502.3 Bad Gateway** | The LoyalTEA service isn't running: `Get-Service LoyalTEA` |
| IIS shows **404** or a blank page | ARR proxy isn't enabled. Re-run `configure-iis.ps1` |
| Till camera doesn't start | The site isn't on trusted HTTPS (step 6), or camera permission was refused in the browser |
| Staff can't stay signed in | The site is being opened over http rather than https |
| Everyone sees "Office Wi-Fi only" | `ALLOWED_IPS` doesn't match the addresses the server sees. Remove it, re-run step 4, and check with the network team |
