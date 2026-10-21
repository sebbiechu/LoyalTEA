# LoyalTEA: IT setup guide

LoyalTEA is a small internal web app that replaces paper canteen stamp cards. This guide covers hosting it on company infrastructure.

## At a glance

| | |
| --- | --- |
| **What it is** | Mobile web page (no app store). Colleagues show a QR code at the canteen till; staff scan it to add a stamp. 8 stamps = free drink. |
| **Personal data** | **None.** No accounts, names, emails, staff numbers or device identifiers. A card is a random 12-character code generated on the phone. |
| **What the database stores** | Random card codes, timestamps, drink type, stamp/redeem events. Plus timestamps of failed staff PIN attempts (no IPs). |
| **Users** | Colleagues (no sign-in), canteen staff (shared PIN), managers (separate PIN for reports). |
| **Stack** | Node.js 22 (Next.js) web app + PostgreSQL 13 or later. Shipped as Docker containers. |
| **Size** | Tiny. 1 vCPU, 1 GB RAM is plenty. Database well under 1 GB for years of use. |
| **Network** | Phones on the office Wi-Fi must reach it over **HTTPS**. Can be restricted to the office network only. |

## What's needed from IT

1. **A host** for the containers. Any one of:
   - a Linux VM with Docker (simplest; everything in this repo runs with one command), or
   - Azure App Service / Container Apps running the Docker image, with Azure Database for PostgreSQL, or
   - an existing Kubernetes/container platform.
2. **PostgreSQL**: either the container included here, or a database on an existing PostgreSQL server/managed service.
3. **A hostname**, e.g. `loyaltea.<company-domain>`.
4. **An HTTPS certificate that personal phones trust** (see below).
5. **Network restriction** to the office Wi-Fi, if wanted (see below).
6. **Backups** of the database (a daily dump is included in the Docker setup).

## Option A: Linux VM with Docker (recommended for on-premises)

```bash
git clone <repo-url> loyaltea && cd loyaltea
cp .env.example .env
nano .env                         # fill in the "Shared" and "Option A" sections
docker compose up -d --build
curl http://localhost:3000/api/health     # {"status":"ok"}
```

This starts three containers:

| Container | Purpose |
| --- | --- |
| `db` | PostgreSQL 16. Not exposed outside Docker. Tables are created automatically on first start from `database/schema.sql`. Data in the `pgdata` volume. |
| `app` | The web app on port 3000 (`APP_PORT`). Runs as a non-root user. Has a built-in health check. |
| `backup` | Daily `pg_dump` into `./backups`, keeps 30 days (`BACKUP_KEEP_DAYS`). Restore: `docker compose exec -T db pg_restore -U loyaltea -d loyaltea --clean < backups/loyaltea-YYYY-MM-DD.dump` |

Put the app behind your existing reverse proxy / load balancer for HTTPS. If there isn't one and the hostname is publicly resolvable, `docker compose --profile https up -d` adds Caddy with an automatic Let's Encrypt certificate (needs ports 80/443 reachable from the internet for issuance, so not suitable for an office-only deployment).

**Updating:** `git pull && docker compose up -d --build`. The schema script is safe to re-run if a future version changes it: `docker compose exec -T db psql -U loyaltea -d loyaltea < database/schema.sql`.

## Option B: existing PostgreSQL server or Azure Database for PostgreSQL

1. Create a database and a dedicated login, e.g. `loyaltea`, that owns the database.
2. Run the schema **as that login** (so it owns the tables and functions):
   `psql "postgres://loyaltea:<password>@<host>:5432/loyaltea?sslmode=require" -f database/schema.sql`
3. Run the app container (`docker build -t loyaltea .`) with the environment variables below, setting `DATABASE_URL` (and `DATABASE_SSL=true` for Azure).

## Configuration (environment variables)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes (Option B) | `postgres://user:password@host:5432/loyaltea`. Set automatically by docker compose. |
| `DATABASE_SSL` | No | `true` for managed databases that require TLS (e.g. Azure). |
| `POSTGRES_PASSWORD` | Yes (Option A) | Letters and numbers only. |
| `SESSION_SECRET` | Yes | Random string, 32+ characters. `openssl rand -base64 48`. Signs staff sessions. |
| `STAFF_PIN` | Yes | 6+ digits. Changing it signs out every device using it. |
| `MANAGER_PIN` | Yes | 6+ digits, different from the staff PIN. Unlocks reports. |
| `ALLOWED_IPS` | No | Office-only lock, see below. |
| `STAMPS_FOR_REWARD` | No | Default 8. |
| `COOKIE_SECURE` | No | Leave `true`. `false` only for a plain-HTTP trial; staff sign-in won't work over HTTP otherwise. |

## HTTPS: the one thing that commonly goes wrong

HTTPS is required: browsers only allow the till's camera scanner and "Add to Home Screen" on secure sites. Colleagues use **personal phones**, which will **not** trust a certificate from an internal company CA. Use a publicly trusted certificate, for example:

- the company's existing wildcard certificate (`*.company.com`), or
- a Let's Encrypt certificate issued via **DNS challenge** (works even when the site is internal-only).

## Restricting to the office Wi-Fi

Two layers, ideally both:

1. **Network (primary).** Host it on the internal network / only publish the hostname in internal DNS, or allow only the office's egress IP at the firewall or cloud ingress. Phones on mobile data or other Wi-Fi then simply can't reach it.
2. **In the app (secondary).** Set `ALLOWED_IPS` to a comma-separated list of IPs/IPv4 CIDR ranges. Anyone else sees an "Office Wi-Fi only" page and API calls return 403. Which addresses to use depends on what the app sees as the client IP:
   - Hosted **inside** the office network: the Wi-Fi client range, e.g. `10.20.0.0/16`.
   - Hosted **in the cloud**: the office's public/NAT egress IP(s), e.g. `203.0.113.10`.

   The app reads the client IP from `X-Real-IP` or the first `X-Forwarded-For` entry, so it must sit behind a reverse proxy that **sets/overwrites** these headers. Don't rely on `ALLOWED_IPS` if the app port is exposed directly. `/api/health` stays open for monitoring.

Note: the staff till device and managers' devices must be on the allowed network too.

## Security summary

- No personal data collected; a breach exposes only anonymous codes and drink counts.
- Colleagues have read-only access to their own card; all writes require a staff session.
- Staff sessions: signed (HS256) HTTP-only, `SameSite=Strict`, `Secure` cookies; tied to the current PIN so a PIN change revokes them. Staff 30 days, manager 12 hours.
- PIN brute force: 15 failures in 15 minutes locks sign-in for 15 minutes (global, no IPs stored), plus a delay on every failure.
- Stamp/redeem/undo run as database functions with row locking (no double redemption).
- Database: only the app's own login has access; row-level security on; `PUBLIC` privileges revoked. Not exposed outside the Docker network.
- Security headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, camera allowed for self only.
- Manager CSV export includes only the last 4 characters of each card code.
- Container runs as non-root; health check at `/api/health` reveals only up/down.

## Monitoring

`GET /api/health` returns `200 {"status":"ok"}` when the app can reach the database, `503` otherwise. App logs go to stdout (`docker compose logs app`).
