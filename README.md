<div align="center">

# Keyhaven

**Homes to rent and to buy, done properly** — anyone browses the catalogue, tenants save homes and
book viewings; landlords and agents manage listings; Keyhaven admins keep the site clean.

![Node.js](https://img.shields.io/badge/Node.js-26-5FA04E?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MUI](https://img.shields.io/badge/MUI-9-007FFF?logo=mui&logoColor=white)

A public demo product · US market · English UI · fictional data only

![Keyhaven — the landing page at a signed-out /: the brand, Rent, Buy and Houses tabs, a headline, a search box with a Rent / Buy switch and the six cities](docs/landing.jpg)

![Keyhaven — the public catalogue: a header with Rent, Buy and Houses tabs, a search box, the city, a Filters button and the sort in one row; the active filters as removable chips; a grid of listing cards with a heart on each](docs/browse.jpg)

[Quick start](#quick-start) · [Demo accounts](#demo-accounts) · [What works today](#what-works-today-m0--m1) ·
[Architecture](#architecture) · [Development](#development) · [Roadmap](#roadmap)

</div>

---

## Quick start

Two ways to run it. Both end at a seeded database with ~1,300 listings (1,000 for rent, 300 for
sale), four demo accounts and an S3-compatible photo store (RustFS in Docker) for uploads.

### A. Your own PostgreSQL 18 (one command)

Requires Node.js 26 (`.nvmrc`), a PostgreSQL 18 server you can create databases on, and Docker
(only for the photo store — `make setup` starts it).

```bash
# once: a role and three databases (app, shadow for schema checks, test)
psql -h localhost -d postgres -c "CREATE ROLE keyhaven LOGIN PASSWORD 'keyhaven';" \
  -c "CREATE DATABASE keyhaven OWNER keyhaven;" \
  -c "CREATE DATABASE keyhaven_shadow OWNER keyhaven;" \
  -c "CREATE DATABASE keyhaven_test OWNER keyhaven;"

make setup   # starts the photo store, installs both packages, applies the migrations, seeds the demo data
make dev     # backend on :3000, frontend on :5180 — Ctrl-C stops both
```

Then open **http://localhost:5180** — the catalogue needs no account; sign in with a
[demo account](#demo-accounts) to save homes or to manage listings. The public landing page
(`landing/`, Astro) runs separately with `make landing` on **http://localhost:4321**.

`make setup` copies `backend/.env.example` to `backend/.env` (git-ignored) — edit `DATABASE_URL`
there if your server, role or password differ. Emails (verification, password reset, the daily
saved-search digest) are printed to the backend's log in local development; set
`EMAIL_TRANSPORT=smtp` and `SMTP_URL` to send them. Uploaded photos go to the RustFS container on
:9000 (`make storage` starts it alone); point the `R2_*` variables at Cloudflare R2 or any
S3-compatible bucket instead.

### B. Docker Compose (everything in containers)

Requires Docker with Compose v2. Set `DATABASE_PASSWORD` in `.env` before the first start.

```bash
cp .env.example .env
docker compose up --build -d
docker compose run --rm migrate npm run db:seed
```

Then open **http://localhost:8080**: the landing page for a visitor, the app once signed in (nginx
picks by the session cookie — `frontend/nginx.conf`). `docker compose logs backend` shows the
emails; photos go to the bundled RustFS (`storage`, provisioned by `storage-init`).
`docker compose down -v` deletes the data.

## Demo accounts

Every password is **`Keyhaven-Demo-2026!`** (all people and homes are fictional). Browsing needs no
account; a tenant account adds saved homes and searches.

| Role | Account | Lands on |
|---|---|---|
| **Tenant** | `maya.lopez@keyhaven.example` | The catalogue — save homes and searches, a daily email with new matches |
| **Landlord** | `daniel.reyes@keyhaven.example` | Their listings — for rent or for sale: create, edit, photos, publish / unpublish, views and saves |
| **Agent** (Harborline Realty) | `priya.nair@harborline.example` | The agency's listings — same dashboard, shared with the other agents |
| **Admin** | `alex.morgan@keyhaven.example` | All listings — and the power to suspend one |

Any visitor can create their own tenant or landlord account at `/signup`; the verification link is
in the backend log (or your inbox with SMTP configured).

## What works today (M0 + M1 + the public catalogue)

- **Accounts:** sign-up (tenant or landlord), email verification, sign-in, forgot / reset password,
  password change, sessions ("sign out everywhere"), a security log — server-side sessions, no JWT.
- **Roles, enforced on the server:** tenants browse; landlords manage their own listings; agents
  manage their agency's; admins see everything and can suspend a listing. A foreign listing answers
  403 (or 404 when the caller should not learn it exists) — see `backend/test/access.spec.ts`.
- **A public catalogue:** homes **for rent and for sale** across Austin, Denver, Seattle, Chicago,
  Atlanta and Phoenix, open to anyone — the Rent, Buy and Houses tabs lead the search. City,
  type of home, price range, beds, baths, pets / furnished / parking, move-in date and a
  **typo-tolerant text search** over title, neighborhood, ZIP and city (PostgreSQL `pg_trgm` word
  similarity: "Walingford" finds Wallingford); sort by newest or rent; everything in the URL, so a
  search is a link. The detailed filters live in a side sheet whose button already says how many
  homes they would show; active ones come back as removable chips. Listing page with gallery, facts and the landlord / agency card. **The exact
  address is hidden** until a viewing is confirmed (M2) — only the owner and admins see it today.
- **Saved homes and saved searches** (a tenant account): a heart on every card and listing page —
  a visitor who presses it is asked to sign in and comes back; a search can be saved under a name
  and, when alerts are on, a **daily email** (08:00 UTC) lists the homes published since the last
  one — at most ten, with a link to the full results. Both live under **Saved**.

  ![Saved searches: each one shows its filters as chips, when the last email went out, a switch for the daily email and a delete button](docs/saved.jpg)
- **Dashboard (owner side):** counts per status, filters and search in the URL, **create and edit
  listings** for rent (monthly rent, move-in day) or for sale (asking price), **photo upload**
  straight from the browser to the object store (presigned URLs,
  JPEG / PNG / WebP up to 10 MB, 20 per listing, reorder and remove, the first one is the cover),
  publish / unpublish (verified email and at least one photo required), admin suspension with a
  confirmation, **views and saves** per listing — visitors without an account count too, once a
  day each.

  ![A listing's management page: the photo manager with a cover badge, move and remove buttons, Edit details, the views and saves count](docs/manage.jpg)
- **Operations:** one `docker compose up`, health endpoints, Prometheus metrics (admins), structured
  logs with trace ids, rate limits on every auth endpoint, CSRF double-submit, strict headers.

### Search speed

Measured on the full seed (1,300 listings, 1,063 published) with `npm run bench:search` in
`backend/` — 30 runs per query against the running app over HTTP, one warm-up run, local
PostgreSQL 18 on a laptop:

| Query | Results | p50 | p95 | max |
|---|---|---|---|---|
| newest, no filters | 827 | 7.5 ms | 15.6 ms | 17.3 ms |
| city + rent range | 43 | 6.4 ms | 7.4 ms | 7.5 ms |
| city + beds + baths + amenities | 19 | 5.6 ms | 7.3 ms | 10.7 ms |
| available by date, rent high to low | 486 | 6.6 ms | 14.1 ms | 15.2 ms |
| homes for sale, houses, price low to high | 25 | 4.7 ms | 5.6 ms | 6.0 ms |
| text search, one typo | 17 | 10.2 ms | 15.8 ms | 23.7 ms |
| text search, two terms + filters | 29 | 8.0 ms | 16.5 ms | 16.8 ms |
| page 40 of newest | 827 | 3.4 ms | 4.4 ms | 5.0 ms |

One SQL statement returns the page's ids and the total (`count(*) over ()`), Prisma loads the
cards by id; partial indexes on the published rows, each led by the kind (price, published date,
bedrooms, move-in date, type of home) and a trigram GIN index on the search text.

## Architecture

```
landing/    Astro static site — the public page at a signed-out `/`: SEO, share image, sitemap; links
            into the catalogue (/browse) and sign-up; no client framework, no API calls
frontend/   React 19 + TypeScript · Vite · MUI 9 + Tailwind 4 · TanStack Query · React Router ·
            React Hook Form + Zod · react-i18next · types and runtime response schemas generated
            from backend/openapi.json
backend/    NestJS 11 (Express) · Prisma 7 on PostgreSQL 18 · Zod 4 (validation, OpenAPI,
            response serialisation) · pino · argon2id · rate-limiter-flexible (PostgreSQL store) ·
            nodemailer (SMTP) · Jest + supertest integration tests
```

- **Modular monolith:** `user`, `audit`, `email`, `auth`, `storage`, `listing`, `saved-search`.
  Controller → service → repository; only repositories touch Prisma; every query has an explicit
  `select`.
- **Security by default:** every handler is `@Public()` or `@Authorize(policy)` — the app refuses
  to start otherwise. The catalogue's policies are `public`-scoped: they run for a visitor too, a
  session only adds "saved"; a visitor's views count by a daily hash, never an address in clear. Policies live in one file (`backend/src/common/security/policies.ts`); ownership
  checks in one service. Sessions are revocable rows; cookies are `HttpOnly` + `SameSite=Lax`.
- **No tenant hierarchy:** Keyhaven is a marketplace — a listing belongs to a landlord *or* an
  agency (a database CHECK), and agents act for their agency.
- **Contract first:** `backend/openapi.json` is generated from the Zod DTOs and committed; the
  frontend regenerates its types and runtime schemas from it (`npm run generate:api`), and every
  response is checked against them at runtime.
- **Email as a port:** `EmailSender` with a `log` adapter (local) and an `smtp` adapter; sent
  after the database transaction committed.
- **Photos as a port:** `ObjectStorage` (presigned upload, head, delete, public URL) with one S3
  adapter that talks to RustFS locally and Cloudflare R2 in production. The browser uploads straight
  to the store; the backend confirms the object (size and image signature) before the photo shows.
- **Daily digest:** a cron in the app (`@nestjs/schedule`), no queue — one process, one run a day;
  an admin endpoint triggers it on demand.

## Development

```bash
make check                     # every pipeline step of both packages, tests included

cd backend
npm run start:dev              # watch mode on :3000 (Swagger UI at /docs in dev)
npm test                       # integration tests on TEST_DATABASE_URL (migrated from scratch)
npm run db:migrate:create -- --name <module>_<description>   # then edit the SQL + write down.sql
npm run db:migrate:dev | db:check | db:seed
npm run openapi:generate       # after an API change (commit openapi.json)
npm run bench:search           # the search timings above, against a running backend
npm run storage:init           # bucket, public-read policy and CORS on the photo store

cd frontend
npm run dev                    # Vite on :5180, /api proxied to :3000 (same-origin cookies)

cd landing
npm run dev                    # Astro on :4321; npm run build = astro check + static output
npm run generate:api           # after openapi.json changed
npm run build                  # includes the bundle budget check
```

**Pipeline** (backend): `format:check` → `lint` → `typecheck` → `build` → `db:check` →
`i18n:check` → `openapi:check` → `test` → `audit`. (frontend): `lint` → `format:check` →
`typecheck` → `build` → `i18n:check`. (landing): `lint` → `format:check` → `build`.

### Environment variables (backend)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | The PostgreSQL 18 connection (`postgresql://user:pass@host:5432/db`) |
| `SHADOW_DATABASE_URL`, `TEST_DATABASE_URL` | Local schema checks; the tests' own database (its name must contain `test`) |
| `APP_URL` | Where the app opens — links in emails point here |
| `EMAIL_TRANSPORT`, `SMTP_URL`, `EMAIL_FROM` | `log` (default) or `smtp` |
| `SESSION_*`, `COOKIE_*`, `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS` | Sessions and HTTP security |
| `R2_ENDPOINT`, `R2_INTERNAL_ENDPOINT`, `R2_REGION`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_PUBLIC_URL` | The S3-compatible photo store: RustFS locally (`us-east-1`), Cloudflare R2 in production (`auto`) |
| `DEMO_MODE`, `DEMO_PROTECTED_EMAILS` | Public demo: the showcase accounts cannot change their password or end their sessions |
| `LOG_LEVEL`, `DB_QUERY_LOG`, `DB_POOL_SIZE` | Observability and the pool |

All of them, with local values, are in `backend/.env.example`.

## Roadmap

| Milestone | Scope |
|---|---|
| **M0 — Foundation** | Accounts, roles, seed, dashboards by role, access tests |
| **M1 — Listings and search** | Search with filters, sorting and typo-tolerant text; saved listings and searches with daily emails; create / edit listings with photo upload; views and saves |
| **Public catalogue** (this release) | Browsing without an account, homes for sale beside rentals, a landing page at a signed-out `/` |
| **M2 — Viewing booking** | Weekly viewing hours and slots, booking without double booking (proved by a test), confirm / decline / cancel, reminders, calendars |

Not planned for M0–M2: applications, payments, property management, map search, mobile apps.
