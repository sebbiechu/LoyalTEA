# LoyalTEA

A digital stamp card for the office canteen. **No colleague accounts and no personal data.**

- Colleagues open the site on their phone. It creates a random card code and shows it as a QR code.
- Canteen staff scan it on the till device and tap **+1 Stamp**. After 8 stamps the till shows **Redeem free drink**.
- The database stores only random codes, timestamps and drink types. A breach would reveal nothing about who anyone is.
- Managers get a reports page (stamps, free drinks, busiest times, drink mix) and a CSV export.

## Pages

| URL | Who | What |
| --- | --- | --- |
| `/` | Colleagues | Stamp card, QR code, backup code, switch card |
| `/staff` | Canteen staff | PIN sign-in, camera scanner, stamp / redeem / undo |
| `/staff/reports` | Managers | Dashboard and CSV export (manager PIN) |
| `/privacy` | Everyone | Plain-English data notice |

## Why it's low risk

| Concern | How it's handled |
| --- | --- |
| Personal data | None collected. Card = random 12-character code (≈55 bits, with a check character). |
| Customer can stamp themselves | No. Every write needs a staff session. The public API is read-only. |
| Database access | Row Level Security on, all grants revoked from `anon`. Only the server, with the service role key, can read or write. |
| Staff PIN guessing | 15 wrong PINs in 15 minutes locks sign-in for everyone for 15 minutes (no IPs stored). Use 6+ digit PINs. |
| PIN leaked | Change `STAFF_PIN` / `MANAGER_PIN`; every existing staff session is signed out automatically. |
| Double taps | Stamp/redeem run in database functions that lock the card row; redeem refuses if there aren't 8 stamps. |
| Mistakes | **Undo last** removes the latest action on a card within 10 minutes. |
| Outside the office | Optional `ALLOWED_IPS` shows an "Office Wi-Fi only" page to anyone else. |

Known trade-off: if a colleague clears their browser or changes phone without their backup code, that card is gone. That's the price of not storing who they are.

## Hosting options

The app works with either database backend, chosen by environment variables:

| Setup | Database setting | Guide |
| --- | --- | --- |
| **Company servers** (Docker on a VM) | `docker compose up -d` (Postgres included) | [docs/IT-SETUP.md](docs/IT-SETUP.md) |
| **Company Azure / existing Postgres** | `DATABASE_URL` | [docs/IT-SETUP.md](docs/IT-SETUP.md) |
| **Vercel + Supabase** (current pilot) | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | below |

All options use the same `database/schema.sql` and share `SESSION_SECRET`, `STAFF_PIN`, `MANAGER_PIN` and optional `ALLOWED_IPS` (office-network lock). See `.env.example`.

### Vercel + Supabase

1. **Supabase**: SQL Editor > New query > paste `database/schema.sql` > Run.
2. **Vercel**: add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `STAFF_PIN`, `MANAGER_PIN` (and optionally `ALLOWED_IPS`, `NEXT_PUBLIC_STAMPS_FOR_REWARD`).
3. Deploy. On the till device open `/staff`, enter the staff PIN, allow the camera, add it to the home screen.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Camera scanning needs HTTPS or `localhost`.
