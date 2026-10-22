# LoyalTEA: security summary

For Cyber Security reviews (e.g. an XSAT). Written so it can be copied into assessment answers.

## In one sentence

LoyalTEA is an internal canteen stamp card that **stores no personal data**: colleagues have no accounts, and their card is a random code kept on their own phone.

## Data

| Question | Answer |
| --- | --- |
| **Personal data collected?** | **None.** No names, emails, staff/employee numbers, phone numbers, passwords, device IDs, location or IP addresses. |
| **What is stored?** | A random 12-character card code, the date and time of each stamp or free drink, and the drink type. Timestamps of failed staff PIN attempts (nothing else). |
| **Can a card be linked to a person?** | No. The code is generated randomly on the phone and is never linked to an identity. |
| **Impact if the database is breached** | Low. Anonymous codes and drink counts only. |
| **Special category / sensitive data?** | None. |
| **Data on the phone** | The card code, in the browser's local storage and one cookie. No tracking or analytics. |
| **Data retention** | Stamp history is kept to show the card and produce reports. Failed-PIN timestamps older than 24 hours are cleared automatically. Backups are kept 30 days (configurable). |
| **Data location** | On the server where it's hosted. |
| **Third parties** | None when self-hosted. Fonts and all other files are served from the same server. No analytics, advertising or tracking. (The pilot used Vercel and Supabase.) |

## Access and sign-in

| User | How they access it | What they can do |
| --- | --- | --- |
| Colleagues | No sign-in | **View** their own card only. Cannot add stamps |
| Canteen staff | Shared **staff PIN** on the till device | Look up a card, add a stamp, redeem a free drink, undo the last action (within 10 minutes) |
| Managers | Separate **manager PIN** | Everything staff can do, plus reports and CSV export |

- PINs are 6+ digits and stored only in the server's configuration, never in the database or code.
- **Brute-force protection:** 15 wrong PINs within 15 minutes locks sign-in for everyone for 15 minutes, plus a delay after every wrong attempt.
- **Sessions:** signed (HMAC-SHA256) cookies that are `HttpOnly`, `Secure` and `SameSite=Strict`. Staff sessions last 30 days, manager sessions 12 hours.
- **Changing a PIN** immediately signs out every device that used the old one.
- The manager CSV export shows only the last 4 characters of each card code.

## Network

- **HTTPS only** (HTTP redirects to HTTPS). HSTS enabled.
- **Office Wi-Fi only** (optional, recommended): enforced at the network/firewall, plus an in-app allow-list of office IP ranges. Visitors from elsewhere see an "Office Wi-Fi only" page. The in-app check uses the address added by the server's own web server (IIS), so a visitor can't fake an office address by sending their own headers.
- The app service listens on `127.0.0.1` only. It can only be reached through IIS.
- PostgreSQL only needs local connections. Port 5432 stays closed in the firewall.

## Application security

- **Integrity:** stamping, redeeming and undo run inside the database with row locking, so a double-tap can't add two stamps or redeem twice. Redeem is refused without 8 stamps.
- **Input validation:** card codes include a check character, so typos and made-up codes are rejected. Drink types come from a fixed list.
- **Injection:** all database queries use parameters. No user input is built into SQL.
- **Least privilege:** the app's database login owns only its own tables. Default `PUBLIC` privileges are revoked and row-level security is on.
- **Security headers:** `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera only for this site; microphone and location off).
- **Windows service** runs as the low-privilege *LocalService* account. The settings file (database password, PINs) is readable by Administrators only.
- **Health check** (`/api/health`) reveals only up or down.

## Operations

| | |
| --- | --- |
| **Hosting** | Windows Server: IIS, Node.js 22 LTS, PostgreSQL 16 |
| **Backups** | Daily automated database backup, 30 days kept, tested restore procedure |
| **Logging** | App log on the server (rotated at 10 MB). No personal data logged |
| **Updates** | New versions are installed by re-running the install script. Dependencies are standard, widely used open-source packages (Next.js, React, node-postgres) |
| **Source code** | GitHub |

## Known limitations

- **Shared PINs** rather than individual staff logins, chosen so no staff personal data is stored. Mitigated by lockout, PIN rotation and office-only access.
- **A card code works like a paper card.** Anyone who has someone's code could view or use that card. Impact is limited to free drinks. Colleagues are told not to share it.
- **Lost phone or cleared browser** means the card is lost unless the colleague saved their backup code. This is accepted as the cost of not storing identities.
