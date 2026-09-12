# Home Ledger

Personal finance tracker — rent, bills, loans given, major expenses, reimbursable
claims, and pending jobs — each its own tab, multi-currency (INR/IDR/USD/SGD/EUR).
Node.js/Express/EJS + PostgreSQL, deployed as a Docker container behind an existing
Traefik reverse proxy on a Hostinger VPS.

## Deploying from this repo

This repo is deployed via Hostinger's Docker Manager API, pointed directly at this
GitHub URL — no manual file transfer needed. Secrets are **never committed here**;
they're supplied separately as environment variables at deploy time (see below).

### One-time VPS setup (already done for the current deployment)

- A dedicated Postgres database (`rentdb`) and user already exist inside the VPS's
  shared Postgres container.
- Traefik (the reverse proxy) and its Let's Encrypt cert resolver already exist,
  shared with other apps on the same VPS.
- The `docker-compose.yml` in this repo assumes both of those are reachable via
  the external Docker networks `postgresql-jld5_default` and `n8n_default`. If
  deploying to a different VPS, update those two network names and the Traefik
  `Host()` rule to match.

### Deploying (or redeploying after a change)

Using the Hostinger Docker Manager API's "create/update project" call:

- `content` = this repo's URL (`https://github.com/<you>/<repo>`)
- `project_name` = `rent-tracker`
- `environment` = the required variables below, one `KEY=value` per line

Required environment variables:

```
DATABASE_URL=postgresql://rentapp_user:<password>@postgresql-jld5-postgresql-1:5432/rentdb
SESSION_SECRET=<random hex string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
ACCOUNT2_USERNAME=<email>
ACCOUNT2_PASSWORD_HASH=<bcrypt hash>
ACCOUNT3_USERNAME=<email>
ACCOUNT3_PASSWORD_HASH=<bcrypt hash>
RENT_DUE_DAY=5
```

Generate a password hash with:

```bash
node -e "require('bcrypt').hash(process.argv[1], 12).then(console.log)" "your-password-here"
```

(requires `bcrypt` installed — `npm install bcrypt` in a scratch folder if needed)

### Local development

```bash
cp .env.example .env   # fill in real values
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Making a change and shipping it

1. Edit the code, test locally if you can (`npm run dev` against a local or
   reachable Postgres).
2. Commit and push to this repo.
3. Redeploy: same API call as above, `content` pointed at this repo again. Since
   `project_name` matches the existing project, it replaces it in place —
   Docker rebuilds the image from the updated `Dockerfile`/source and restarts.
4. Check logs after deploy for a clean startup: OpenSSL is now baked into the
   image (no longer reinstalled per-start), so a clean run goes straight from
   `npm install` (cached, fast) to `Prisma schema loaded` → `database is now in
   sync` (or `already in sync`) → `Rent tracker listening on port 4000`.

## Data model

Eleven Prisma models across six tabs — see `prisma/schema.prisma` for exact
fields. Status/coloring logic per tab lives in `src/lib/*Status.js`.

## Known gotchas

- **The `session` table isn't Prisma-managed** (it belongs to
  `connect-pg-simple`). Every `prisma db push` logs a warning about dropping it
  and recreates it empty — this just logs out whoever was signed in. Harmless,
  expected.
- **`app.set('trust proxy', 1)`** in `src/app.js` is required because the app
  sits behind Traefik (TLS-terminating). Without it, the session cookie is
  silently never set and logins appear to succeed but don't persist.
- **Dates** are three dropdowns (day/month/year), not native date pickers — see
  `src/views/partials/date-select.ejs` and `src/lib/dateFields.js`.
- **Currency totals are grouped per currency, never summed across currencies**
  — see `src/lib/currency.js`'s `groupByCurrency`.

## Not yet built

- CSV/PDF export, automated `rentdb` backups (recommended next step), in-app
  password change, loan interest accrual, per-account activity log.
