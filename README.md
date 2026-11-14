# Home Flavour Catering — clone

A working clone of the office catering / meal-ordering app at <https://hfcatering.vercel.app>.
Members order lunch/dinner against a wallet (Regular) or cash on delivery (One-time); staff run the
distribution board, menus, deposits and offices.

## Stack

- **Next.js 15** (App Router, server components + server actions) · **TypeScript** · **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL**
- **Auth.js v5** (`next-auth@beta`) — Google sign-in, plus a dev-only "sign in as" login
- `react-day-picker` (delivery-date calendar), `lucide-react` icons, `sonner` toasts
- Fonts: Syne (display) + Outfit (body) via `next/font`. Deployable to Vercel.

## Quick start (local)

Prerequisites: Node 20+, a Postgres you can reach (Docker, Homebrew or apt all work).

```bash
# 1. Postgres (example: Debian/Ubuntu)
sudo apt install postgresql
sudo -u postgres psql -c "CREATE USER hfc WITH PASSWORD 'hfc_dev_password' CREATEDB;" \
                      -c "CREATE DATABASE hfc OWNER hfc;"
#    …or with Docker:
#    docker run -d --name hfc-pg -e POSTGRES_USER=hfc -e POSTGRES_PASSWORD=hfc_dev_password -e POSTGRES_DB=hfc -p 5432:5432 postgres:17

# 2. Install + configure
npm install
cp .env.example .env            # then set AUTH_SECRET (openssl rand -base64 32)

# 3. Create tables + demo data (wipes the DB!)
npm run db:setup                # = prisma migrate deploy + tsx prisma/seed.ts

# 4. Run
npm run dev                     # http://localhost:3000
```

Open <http://localhost:3000>. With `ENABLE_DEV_LOGIN=true` the landing page shows a **"Dev sign-in"** box:
pick any seeded user (SUPER_ADMIN, manager, Regular or One-time member) and sign in without Google.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm run db:setup` | Apply migrations, then **wipe + reseed** demo data |
| `npm run db:seed` | Wipe + reseed only |
| `npm run db:migrate` | `prisma migrate dev` (create a migration after editing `schema.prisma`) |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run make-admin -- you@example.com` | Promote a user to SUPER_ADMIN (`--demote` to undo) |
| `npm run smoke` | Headless-Playwright end-to-end test of every major workflow (needs a running app + seeded DB) |
| `npm run screenshots` | Headless screenshots of the main pages (`OUT=/some/dir`) |

For the two Playwright scripts: `npx playwright install chromium` once.

## Environment variables

See [`.env.example`](.env.example). Nothing secret is committed; `.env` is git-ignored.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `DIRECT_URL` | yes | Direct (non-pooled) Postgres URL used by `prisma migrate`. Same as `DATABASE_URL` locally; on Neon use the host without `-pooler` |
| `DIRECT_URL` | yes | Direct (non-pooled) Postgres URL used by `prisma migrate`. Same as `DATABASE_URL` locally; on Neon use the non-`-pooler` host |
| `AUTH_SECRET` | yes | Auth.js JWT secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | non-Vercel hosts | set `true` when behind a proxy / on localhost |
| `AUTH_URL` | optional | public base URL if auto-detection is wrong |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | for Google sign-in | OAuth client; redirect URI `{AUTH_URL}/api/auth/callback/google` |
| `SUPER_ADMIN_EMAILS` | recommended | comma-separated emails promoted to SUPER_ADMIN on sign-in |
| `ENABLE_DEV_LOGIN` | dev only | `true` enables the "sign in as" credentials login. **Never set in production.** |
| `MAX_WALLET_DUE` | optional (1000) | Regular members can't order when their wallet due would exceed this (৳) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | optional | meal photo uploads; without them uploads go to `public/uploads` (local dev only) |
| `SEED_ADMIN_EMAIL` | seed | email of the seeded SUPER_ADMIN ("Imran"). Set it to your Gmail to own the demo data |

## Making the first SUPER_ADMIN

Any one of these:

1. Put your Google email in `SUPER_ADMIN_EMAILS` — you are promoted automatically the first time you sign in (and on every later sign-in).
2. `npm run make-admin -- you@gmail.com` — promotes an existing user, or pre-creates the account so that it is already SUPER_ADMIN on first Google sign-in (the adapter links accounts by email).
3. Seed with `SEED_ADMIN_EMAIL=you@gmail.com npm run db:seed`.

Further admins: promote with `make-admin`, or assign people as **managers** of an office from *Admin → Staff*.

## Roles & access

| Role | Access |
|---|---|
| **Member** (`USER`) | `/app` order meals, `/app/orders` history, `/app/profile`. No `/admin`. |
| **Manager** (a `USER` assigned to ≥1 office in *Staff*) | `/admin` limited to their offices: dashboard, menu, distribution board, users in their offices (+ unassigned members). No *Staff* page. |
| **SUPER_ADMIN** | everything, all offices, *Staff & offices* (create offices, cutoffs, active switch, managers). Cannot be banned/deleted from the UI. |

Banned members cannot sign in (sessions are checked against the DB on every request).

## What's implemented

| Route | Features |
|---|---|
| `/` | Dark landing (hero, logo, copy), **Continue with Google**, dev sign-in box, suspended-account message |
| `/app` | Greeting + zone card; order-window card (open/closed/day-off, cutoffs) with date badge → **Delivery date** calendar (past disabled, up to 6 weeks ahead); **Menu** per slot (Lunch/Dinner) with option cards, quantity stepper, place order; your existing order per slot with **Cancel** (until cutoff); empty states (“No published meals right now at …”, no zone, day off); wallet limit + cutoff + stock + day-off validation |
| `/app/orders` | **Your history**: Balance / Total due / Due (wallet) / Unpaid cash orders / Payment mode, Meals ordered (n cancelled) / Total meal spend / Deposits received / Due payments; **All activity** with All / Orders / Deposits & wallet filters; order cards (status + payment chips, placed-by, phone-order note, delivered time) and wallet ledger cards (+amount, balance) |
| `/app/profile` | Employee ID, Phone, Office/Building (sets catering zone), Floor, Desk, Address; all required; **Save changes** |
| `/admin` | Dashboard: Office + Floor filters, **Catering is open / Take day off** (and resume), order-window card, Today's Orders / Portions / Delivered / Pending / Total Sales, Active users / Users with due / Outstanding due, quick actions, **Pack by item** accordion (who ordered it + zone) |
| `/admin/menu` | Office select (All / one), lunch + dinner cutoffs (**Save cutoffs for all**), **Offer dinner**, **Weekly schedule** (Sat–Fri, lunch/dinner, add / edit / remove options, today highlighted), **Live · today** with stock-out / restock, publish for a specific date, photo upload, **Saved meals** (Use / Archive, **Show archived** with Restore) |
| `/admin/orders` | **Distribution board**: filters (Location, Floor, Date, Search member), order cards with Mark delivered (Regular → wallet charged), Cancel, Cash paid / Due (One-time); **Order for member** phone-order form (office, meal day, member typeahead, meal, quantity, note) |
| `/admin/users` | **Users & deposits**: Zone / Floor / Search filters; cards with role badge, profile summary, balance/due chip, Regular/One-time, **Assign zone**, switch type, **Deposit to wallet** (amount + note), Ban/Unban (confirm), Delete (confirm); SUPER_ADMIN rows omit ban/delete |
| `/admin/users/[memberId]` | **Member account**: summary, phone link, **Edit phone** and **Edit balance** dialogs, the same stat cards, **Full history** with per-order **Delete** (wallet charges are refunded) |
| `/admin/team` | **Staff & offices**: New location form, per-location Active switch, lunch cutoff (Save cutoff disabled until changed), managers list, **Managers** dialog (assigned + remove, searchable candidates + add) |

Also: PWA manifest + minimal service worker + **Install app** banner (Install / Not now / ×).

### Project layout

```
prisma/              schema, migration, seed
scripts/             make-admin, smoke (e2e), screenshots
src/
  app/               routes (/, /app/*, /admin/*, api/auth, api/upload)
  actions/           server actions (thin: auth check → server/* → revalidate)
  server/            domain logic (orders, wallet, menu, members, offices, stats, summary)
  lib/               config, time (Asia/Dhaka), money, session/guards, helpers
  components/        ui/ (primitives), shell/, member/, admin/
```

Business rules live in `src/server/*`, so changing e.g. how deliveries are charged is a one-file edit
(`src/server/orders.ts`); visual tokens (colours, glows, cards, buttons) are in `src/app/globals.css`.

## Deploying to Vercel

1. Create a Postgres (Neon / Vercel Postgres / Supabase) and set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
2. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SUPER_ADMIN_EMAILS` (+ Cloudinary vars for photos). Leave `ENABLE_DEV_LOGIN` unset.
3. Add the Google redirect URI `https://<your-domain>/api/auth/callback/google`.
4. Deploy — the `vercel-build` script runs `prisma generate && prisma migrate deploy && next build`.
5. Optionally seed once from your machine: `DATABASE_URL=… npm run db:seed` (this wipes the target DB — don't do it on live data).

## Assumptions (where the spec was ambiguous or silent)

**Data & money**
- Money is whole taka (`Int`). Wallet balance can go negative = **due**. *Total due* = wallet due + delivered cash orders still `UNPAID`/`DUE`.
- Order statuses: `PENDING → DELIVERED | CANCELLED`. Payment statuses: `UNPAID`, `WALLET_CHARGED`, `CASH_PAID`, `DUE`.
- **Regular** members are charged to the wallet when staff marks the order *delivered*; **One-time** members stay `UNPAID` until staff taps *Cash paid* or *Due*.
- Deposits are only for Regular accounts. A deposit made while the balance is negative is recorded as a **Due payment**, otherwise **Deposit**. *Edit balance* writes an `ADJUSTMENT` ledger row for the difference; deleting a wallet-charged order writes a `REFUND`.
- “Deposits received” sums `DEPOSIT` rows, “Due payments” sums `DUE_PAYMENT` rows.
- **Wallet limit** (not in the spec): Regular members can't place an order if due + pending orders + new order would exceed `MAX_WALLET_DUE` (default ৳1,000).
- Members get one active order per slot per day (“everyone picks one option”); staff phone orders aren't limited.

**Menu & cutoffs**
- Cutoff for a slot closes ordering for that meal day from the cutoff time on; future days are always open (up to 42 days ahead); past days are closed. Admin/phone orders skip cutoffs.
- Weekly templates repeat on their weekday; dated meals (an extra “Publish for a specific date” form — the live site's intro mentions dated meals but no form was visible) add to that day. Options created under “All locations” share a group, so edit/remove/stock-out apply to every office; choosing a single office scopes the change to it.
- “Weekly schedule” preview shows the first active office when “All locations” is selected, as the live copy says.
- *Stock out* is per option per day. *Take day off* is per office per date (dashboard applies it to every office in the current filter).
- Saved meals: *Use* fills the add/dated form; *Archive* / *Restore* toggle visibility. Seed keeps 11 archived meals and no active ones (to match the observed empty state).

**Roles & people**
- Only `USER` / `SUPER_ADMIN` exist in the DB (as observed); “manager” is derived from office assignments. Managers see members of their offices plus unassigned members (so they can assign a zone).
- Floors in filters are the distinct free-text floor values members entered (hence “Floor 3”, “Floor 03”, “Floor 3rd” style variety in the demo data).
- Profile “Office / Building” sets both the free-text building and the catering zone; admins can reassign the zone from *Users*.
- Seed members are invented (`@hfc.example`). The SUPER_ADMIN "Imran" has a wallet history matching the reference account (19 meals incl. 1 cancelled, ৳2,030 spend, ৳1,730 due payments, balance ৳-300).

**UI**
- The observed per-order controls on the distribution board weren't visible on the live site, so *Mark delivered / Cancel order / Cash paid / Due* and the confirm dialogs are designed from the page copy.
- Member-side ordering UI (option cards, quantity, place order, cancel) wasn't observable (live Today view was empty) and is designed to match the visual language.
- Meal photos: uploads go to Cloudinary when configured, otherwise to `public/uploads` (dev only; Vercel returns a clear error).
- Calendar, install banner, dialogs (SweetAlert-style “?” confirms) and visual tokens (colours, fonts, cards, blobs, grain) were taken from the live site's CSS/screenshots.

## Not replicated / not verified

- **Google sign-in** is wired up but untested here (no OAuth credentials on the build machine); everything else was exercised through the dev login. **Cloudinary** upload code is untested against a real account (local fallback is tested).
- The live site's real data, any server-side behaviour not visible in the UI (emails, notifications, audit logs — none were observed), and any states the capture didn't reach.
- Offline support is a minimal service worker (caches the landing shell); it is not a full offline mode.
