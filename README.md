<p align="center"><img src="public/logo-pink.png" alt="LoyalTEA" width="280"></p>

# LoyalTEA

**The canteen stamp card, on your phone.** Buy 7 drinks, get the 8th free. No paper cards, no sign-up, no personal details.

---

## Why LoyalTEA?

| | Paper stamp cards | LoyalTEA |
| --- | --- | --- |
| **Losing your card** | Lost card, lost stamps | It's on your phone, with a backup code |
| **Signing up** | None | Still none. Just open the page |
| **Personal details stored** | None | Still none |
| **Fake or copied stamps** | Easy to copy a stamp | Only canteen staff can add stamps |
| **Knowing what sells** | No idea | Reports on drinks, busy times and free drinks given |
| **Cost** | Printing cards and stampers | Free to run on a company server |

---

## How it works

**1. Colleague opens LoyalTEA on their phone.**
A stamp card appears with a QR code. Nothing to type, nothing to sign up for. They can add it to their home screen so it opens like an app.

**2. Canteen staff scan the QR code at the till.**
On a tablet or phone at the till, staff tap **+1 Stamp**. The stamp appears on the colleague's phone a few seconds later.

**3. After 8 stamps, the next drink is free.**
The till shows **Redeem free drink**. One tap and the card starts again.

Managers also get a **reports page**: stamps given, free drinks, the most popular drinks and the busiest times of day. It downloads to Excel (CSV).

---

## Security and privacy, in plain English

**LoyalTEA doesn't know who you are, and that's on purpose.**

- **No accounts.** No names, emails, staff numbers, phone numbers or passwords.
- **Your card is a random code**, like `7K4Q-9XM2-PB3D`, stored on your phone.
- **The database only holds** those random codes, the date and time of each stamp, and which drink it was.
- **If it were ever hacked**, there'd be nothing to identify anyone. Just anonymous codes and drink counts.
- **Only canteen staff can add stamps.** The till needs a staff PIN. Colleagues can only *view* their own card.
- **Reports need a separate manager PIN.**
- **Guessing PINs doesn't work.** Too many wrong PINs locks sign-in for 15 minutes.
- **Office Wi-Fi only** (optional). It can be set so it only works on the office network.
- **Everything is encrypted** in transit (HTTPS).

Full details for Cyber Security reviews: **[docs/SECURITY.md](docs/SECURITY.md)**

**The one trade-off:** because there's no account, the code *is* your card. If you clear your browser or change phone, enter your backup code to get your stamps back. The app reminds you to save it.

---

## The pages

| Page | Who uses it | What it's for |
| --- | --- | --- |
| `/` | Everyone | Your stamp card and QR code |
| `/staff` | Canteen staff | The till: scan, stamp, redeem, undo (staff PIN) |
| `/staff/reports` | Managers | Reports and Excel download (manager PIN) |
| `/privacy` | Everyone | What's stored, in plain English |

---

## Setting it up

Pick the guide for where it's being hosted:

| Where | Guide | Cost |
| --- | --- | --- |
| **Company Windows Server** (recommended) | **[docs/WINDOWS-SERVER.md](docs/WINDOWS-SERVER.md)** | Little to none |
| Linux server, Azure, or the current trial setup (Vercel) | [docs/OTHER-HOSTING.md](docs/OTHER-HOSTING.md) | Varies |

Every option needs the same few settings:

| Setting | What it is |
| --- | --- |
| Database connection | Where the stamps are saved (PostgreSQL) |
| Session secret | A long random password the server uses internally. Nobody types it |
| Staff PIN | Opens the till |
| Manager PIN | Opens the reports |
| Allowed IPs *(optional)* | The office network addresses, to make it office-Wi-Fi only |

---

## What's in this repository

| Folder | What's inside |
| --- | --- |
| `app/` | The pages and the server code |
| `components/` | Building blocks for the pages (stamp grid, QR code, scanner, PIN pad) |
| `lib/` | Shared logic (card codes, database, sign-in, office Wi-Fi check) |
| `database/` | `schema.sql`, which sets up the database tables |
| `deploy/windows/` | Scripts for Windows Server (install, backup, IIS) |
| `public/` | Logo and app icons |
| `docs/` | The setup and security guides |
| `Dockerfile`, `docker-compose.yml` | For hosting on Linux with Docker |

---

## For developers

```bash
npm install
cp .env.example .env.local   # fill in the settings
npm run dev                  # http://localhost:3000
```

Built with Next.js 16, React 19 and TypeScript. Works with plain PostgreSQL (`DATABASE_URL`) or Supabase. The camera scanner needs HTTPS or `localhost`.
