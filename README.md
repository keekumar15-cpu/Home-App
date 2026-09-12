# Rent Tracker

Single-user rent tracking app for 10 tenants — Node.js/Express + EJS + PostgreSQL (via Prisma), built to run as one Docker container on a Hostinger VPS alongside your existing Postgres instance.

## Features

- Dashboard with colored status cards per tenant (green = paid up, amber = partial, red = overdue, gray = contract expired) and month-level totals
- Tenant records with unit, contact, opening balance (editable, with a full audit history), and advance amount
- Contracts as their own history — renewing a lease adds a new contract row rather than overwriting the old one, so past rent terms are preserved
- Payment log per tenant, tagged to the month it covers
- Vacate flow that prompts you to confirm the advance was returned
- Single admin login (bcrypt-hashed password from `.env`, no user table needed)

## 1. Set up the database on your VPS

On the VPS, in `psql` (as a superuser):

```sql
CREATE DATABASE rentdb;
CREATE USER rentapp_user WITH ENCRYPTED PASSWORD 'pick-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE rentdb TO rentapp_user;
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — use the password you set above
- `SESSION_SECRET` — generate with `openssl rand -hex 32`
- `ADMIN_USERNAME` — whatever you want to log in with
- `ADMIN_PASSWORD_HASH` — generate with:
  ```bash
  npm install
  npm run hash-password -- "your-chosen-password"
  ```
  Copy the printed hash into `.env`.

## 3. Run the migration (creates tables)

Locally, with `DATABASE_URL` pointing at a reachable Postgres (or run this once against the VPS's Postgres before first deploy):

```bash
npx prisma migrate dev --name init
```

This generates `prisma/migrations/` — commit that folder; the Docker container runs `prisma migrate deploy` automatically on startup using those files.

## 4. Build and run the container

```bash
docker compose up -d --build
```

The app listens on `127.0.0.1:4000` on the VPS. It is not exposed publicly by itself.

## 5. Point your reverse proxy at it

Using whatever you already run on the VPS (Nginx or Caddy), add a subdomain (e.g. `rent.yourdomain.com`) that proxies to `http://127.0.0.1:4000` with Let's Encrypt SSL.

Example Nginx server block:

```nginx
server {
    listen 443 ssl;
    server_name rent.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/rent.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rent.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. Back up regularly

Add a nightly cron job on the VPS:

```bash
0 2 * * * pg_dump -U rentapp_user rentdb > /path/to/backups/rentdb_$(date +\%F).sql
```

## Notes on the model

- **Opening balance** lives on the tenant and is directly editable; every edit is logged in `BalanceAdjustment` with old/new value and an optional note, so nothing is silently overwritten.
- **Advance** is tracked as `advanceAmount` + `advanceStatus` (`held`/`returned`). Marking a tenant vacated prompts you to confirm the advance was returned, which stamps `advanceReturnedDate`.
- **Contracts** are their own table so renewals don't destroy history — the dashboard always uses whichever contract covers today's date, or the most recent one if the lease has lapsed.
- **"Overdue"** = past `RENT_DUE_DAY` (default the 5th) in the current month with an active, non-expired contract and outstanding balance for that month.

## What's not built yet (intentionally out of scope for v1)

- CSV/PDF export of payment history
- Multi-property grouping (fine for 10 tenants in one view; add a `Property` table later if needed)
- Automated monthly reminders — you asked for the dashboard flag only, no email
