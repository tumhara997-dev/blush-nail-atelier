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
| `npm run gallery:extract -- <demo.html>` | Re-extract photos from the old demo file into `seed-assets/gallery` |

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

## Going live

1. **Database** — create Postgres (Supabase / Neon / any), set `DATABASE_URL`, run `npm run db:setup` once with the owner's real `OWNER_PHONE`.
2. **Photo storage** — uploads are written to `STORAGE_DIR` on local disk. Host on something with a **persistent disk** (Railway, Render, Fly.io, a VPS) for Phase 1. Serverless hosts like Vercel have no persistent disk: add an S3/Supabase-Storage adapter in `src/server/media.ts` before deploying there.
3. **SMS OTP (required for login in production)** — MSG91 account, DLT entity + OTP template registration (TRAI), then set `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID`. Without it, production login refuses to send codes.
4. **WhatsApp** — Meta WhatsApp Cloud API (or a BSP). Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`. Create and get approved these **utility templates** (body variables in this order):

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
5. **Scheduled jobs** — call with `Authorization: Bearer $CRON_SECRET`: `GET /api/cron/reminders` hourly and `GET /api/cron/expire` every 15 minutes. `vercel.json` wires these on Vercel; elsewhere use any cron service.
6. **Secrets** — set `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (https domain).
7. **In the dashboard** — Settings (address, phone, WhatsApp, map, Instagram), Services (real prices and durations: the seeded durations are placeholders and "price on enquiry" is used wherever the demo had no price), Staff, opening hours, and review the policy text.

## Not in Phase 1 (see blueprint roadmap)

Online deposits (Razorpay), verified reviews, two-way chat inbox (web + WhatsApp webhooks), customer self-reschedule (they're pointed to WhatsApp; staff can move bookings), per-artist weekly shifts (artists work salon hours; use time off for leave), email notifications, cloud photo storage adapter, Redis-backed rate limits for multi-server hosting, loyalty/packages/gift cards.
