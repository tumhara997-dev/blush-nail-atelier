# BLUSH — booking website, customer portal & salon dashboard

Phase 1 MVP of the BLUSH blueprint (`../BLUSH_Production_Blueprint.md`): a real Next.js app with a database, phone-OTP login, live availability booking, a customer portal and a staff dashboard. It replaces the static demo; the demo's menu, nail-art styles and 10 gallery photos are seeded in.

## Run it locally

Needs Node 20+ (installed here at `C:\Program Files\nodejs`, which is not on PATH — in PowerShell run `$env:Path = "C:\Program Files\nodejs;" + $env:Path` first).

```bash
npm install
cp .env.example .env.local      # then set AUTH_SECRET and CRON_SECRET to long random strings
npm run db:setup                # create tables + seed menu, styles, gallery, owner account
npm run dev                     # http://localhost:3000
```

No database server is needed for local dev: with `DATABASE_URL` empty the app uses **embedded Postgres (PGlite)** stored in `.data/pglite`. PGlite is single-process, so stop `npm run dev` before running `db:*` scripts.

**Log in as the salon owner:** go to `/login`, enter `99999 99999` (the `OWNER_PHONE` from `.env.local`). With no SMS provider configured, the 6-digit code is shown on screen and printed in the server console. Change `OWNER_PHONE` to the owner's real number before seeding production.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit + database tests (slots, IST dates, phone numbers, pricing, status rules, double-booking constraint) |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | New migration after editing `src/db/schema.ts` |
| `npm run db:migrate` / `db:seed` / `db:setup` | Apply migrations / seed / both |
| `npm run gallery:extract -- <demo.html>` | Re-extract photos from the old demo file into `public/seed-gallery` |

## What's included

**Public site** — home, services & prices, nail-art styles, gallery (filter by style), contact (map, hours, enquiry form), privacy & cancellation policies, SEO metadata, `NailSalon` structured data, sitemap, robots, WhatsApp chat button.

**Booking** (`/book`) — choose service → length/add-ons → a real free time (computed from opening hours, artist availability, service duration + cleanup buffer, time off and existing bookings) → notes + up to 3 inspiration photos → log in with OTP inline → confirm.
- *Instant* services are confirmed immediately (configurable).
- *Request + quote* services ("price on enquiry") hold the slot; the salon sends a price; the customer accepts in their account.
- Double-booking is impossible even under simultaneous requests: a Postgres `EXCLUDE` constraint on each artist's time ranges (`drizzle/0001_booking_constraints.sql`).

**Customer portal** (`/account`) — upcoming & past appointments, accept/decline quotes, self-cancel up to N hours before, profile (nail preferences, allergies, WhatsApp opt-in), delete account (DPDP: anonymises personal data, cancels future bookings, deletes photos).

**Salon dashboard** (`/admin`, staff/admin/owner roles)
- Today: pending requests, today's schedule, quotes awaiting customers, month stats
- Day calendar per artist; appointment detail with quote / confirm / check-in / complete / no-show / move / cancel and a full history trail
- New booking for phone / WhatsApp / Instagram / walk-in customers
- Customers (visits, spend, no-shows, private notes, block), enquiries inbox
- Gallery upload & management, time off & holidays, opening hours
- Admin-only: services, prices, lengths/sizes, add-ons; staff & dashboard logins; salon details, booking rules, policies

**Under the hood** — Next.js 15 (App Router, server actions), React 19, Tailwind v4 with the demo's colours, Drizzle ORM, Postgres, Zod validation, `sharp` image processing (re-encoded to WebP, metadata/GPS stripped), all times stored UTC and shown in IST.

## Project layout

```
src/
  app/(site)/         public pages, /book, /login, /account
  app/admin/          dashboard pages
  app/api/            availability, cron jobs, health
  app/media/[id]/     serves photos (inspiration photos only to owner + staff)
  actions/            server actions (auth, booking, account, admin) — every one checks the session/role
  server/             domain logic: auth, availability, appointments (state machine), notifications, media, settings
  lib/                pure helpers: slots, time (IST), money (paise), phone, pricing, status rules
  db/                 schema, connection (Postgres or PGlite), migrate, seed
  components/         UI
drizzle/              SQL migrations
tests/                vitest
```

## Hosting (Netlify)

Live preview: **https://blush-nail-atelier.netlify.app** (Netlify project `blush-nail-atelier`).

- **Database** — Netlify Database (managed Postgres). It's provisioned because `@netlify/database` is installed, and the app reads `NETLIFY_DB_URL` automatically. Every deploy applies `netlify/database/migrations/` — the schema plus a one-time `seed_content` migration (menu, styles, gallery, settings).
  After changing `src/db/schema.ts`: `npm run db:generate`, then `npx tsx scripts/netlify-migrations.ts`, commit, deploy. Never edit a migration that's already been applied.
- **Photos** — uploads are stored in Postgres; starter photos are static files in `public/seed-gallery/`.
- **Scheduled jobs** — `netlify/functions/cron-reminders.mjs` (hourly) and `cron-expire.mjs` (every 15 min) call `/api/cron/*` with `CRON_SECRET`.
- **Environment variables** (Netlify → Project configuration → Environment variables): `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `OWNER_PHONE`, and while SMS isn't connected `STAGING_OTP_CODE`.
- **Owner login** — whoever signs in with `OWNER_PHONE` becomes the owner. Set it to the owner's real mobile number.
- **Staging access code** — until MSG91 is set up, the live site can't text codes, so `STAGING_OTP_CODE` (a secret 6-digit code) works as the login code for any number. **Delete it once SMS is live.**
- **Redeploy** — from this folder: ask Claude to deploy, or connect the Git repo in Netlify for automatic deploys on every push.

## Going live (real customers)

1. **Login codes — Firebase Phone Auth (no DLT)** — Firebase console: create a project → Authentication → Sign-in method → enable **Phone** → Settings → Authorized domains → add the site's domain → upgrade to the **Blaze** plan (card required; Google doesn't bill the first 10 SMS/day, India is $0.07/SMS after that — set a budget alert). Copy the web app config into Netlify as `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, redeploy, then **remove `STAGING_OTP_CODE`**. The server verifies Google's ID token (`src/server/firebase.ts`) and starts its own session.
   *Alternative (needs DLT):*  MSG91 account, DLT entity + OTP template registration (TRAI), then set `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID` and **remove `STAGING_OTP_CODE`**.
2. **WhatsApp** — Meta WhatsApp Cloud API (or a BSP). Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`. Create and get approved these **utility templates** (body variables in this order):

   | Template | {{1}} | {{2}} | {{3}} | {{4}} |
   |---|---|---|---|---|
   | `booking_requested` | name | service | date & time | ref |
   | `booking_confirmed` | name | service | date & time | ref |
   | `quote_ready` | name | service | price | link |
   | `booking_cancelled` | name | service | date & time | ref |
   | `booking_rescheduled` | name | service | date & time | ref |
   | `reminder_24h` | name | service | date & time | — |
   | `staff_new_booking` | name | service | date & time | ref |

   Without WhatsApp configured, messages are logged and saved in the `notifications` table.
3. **Owner** — set `OWNER_PHONE` to the owner's real number and sign in once.
4. **Domain** — add the salon's domain in Netlify (Domain management) and update `NEXT_PUBLIC_SITE_URL`.
5. **In the dashboard** — Settings (address, phone, WhatsApp, map, Instagram), Services (real prices and durations: the seeded durations are placeholders and "price on enquiry" is used wherever the demo had no price), Staff, opening hours, and review the policy text.

## Not in Phase 1 (see blueprint roadmap)

Online deposits (Razorpay), verified reviews, two-way chat inbox (web + WhatsApp webhooks), customer self-reschedule (they're pointed to WhatsApp; staff can move bookings), per-artist weekly shifts (artists work salon hours; use time off for leave), email notifications, Redis-backed rate limits for multi-server hosting, loyalty/packages/gift cards.
