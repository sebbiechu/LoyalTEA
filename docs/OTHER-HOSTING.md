# Other ways to host LoyalTEA

The recommended option is **Windows Server**: see [WINDOWS-SERVER.md](WINDOWS-SERVER.md). These are the alternatives.

| Option | Good for |
| --- | --- |
| [A. Linux server with Docker](#a-linux-server-with-docker) | If a Linux VM is available. One command sets up everything |
| [B. Existing PostgreSQL or Azure](#b-existing-postgresql-or-azure) | If a database server or Azure is already in use |
| [C. Vercel and Supabase](#c-vercel-and-supabase-the-pilot) | Trials and demos. Free tier, no servers to manage |

All options use the same settings (see `.env.example`) and the same `database/schema.sql`.

---

## A. Linux server with Docker

Needs a Linux VM with Docker and the Docker Compose plugin.

```bash
git clone <repo-url> loyaltea && cd loyaltea
cp .env.example .env
nano .env                       # fill in everything marked CHANGE_ME
docker compose up -d --build
curl http://localhost:3000/api/health      # {"status":"ok"}
```

This runs three containers:

| Container | Job |
| --- | --- |
| `db` | PostgreSQL 16. Creates the tables automatically on first start. Not reachable from outside |
| `app` | LoyalTEA on port 3000 (`APP_PORT`). Runs as a non-root user |
| `backup` | Saves a database backup to `./backups` every day and keeps 30 days |

Put an HTTPS reverse proxy or load balancer in front of port 3000. It must **append** the visitor's address to `X-Forwarded-For` (nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).

| Task | Command |
| --- | --- |
| Update | `git pull && docker compose up -d --build` |
| Logs | `docker compose logs app` |
| Restore a backup | `docker compose exec -T db pg_restore -U loyaltea -d loyaltea --clean --if-exists < backups/loyaltea-YYYY-MM-DD.dump` |

---

## B. Existing PostgreSQL or Azure

1. Create a database and a login that owns it, e.g. both called `loyaltea`.
2. Run the schema **as that login**: `psql "postgres://loyaltea:PASSWORD@HOST:5432/loyaltea" -f database/schema.sql`
3. Run the app with `DATABASE_URL` pointing at it (add `DATABASE_SSL=true` for Azure Database for PostgreSQL), either with the Docker image (`docker build -t loyaltea .`) or on Windows Server using the Windows guide from step 3 onwards.

On Azure: App Service or Container Apps for the app, Azure Database for PostgreSQL (Flexible Server) for the data. Restrict inbound access to the office's public IP address.

---

## C. Vercel and Supabase (the pilot)

1. **Supabase:** create a project in the London region. SQL Editor > New query > paste `database/schema.sql` > Run.
2. **Vercel:** import the GitHub repo and add these environment variables:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API, use the **service_role** key)
   - `SESSION_SECRET`, `STAFF_PIN`, `MANAGER_PIN`
   - optional: `ALLOWED_IPS` (the office's public IP address), `NEXT_PUBLIC_STAMPS_FOR_REWARD`
3. Deploy. Vercel only picks up changed settings on a new deployment.

Note: this keeps the data with Vercel and Supabase rather than on your own servers, so it may need separate approval for live use.
