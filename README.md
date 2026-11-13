<div align="center">

# Keyhaven

**Long-term rentals, done properly** — tenants find a home and book a viewing; landlords and
agents manage listings and viewings; Keyhaven admins keep the site clean.

![Node.js](https://img.shields.io/badge/Node.js-26-5FA04E?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MUI](https://img.shields.io/badge/MUI-9-007FFF?logo=mui&logoColor=white)

A public demo product · US market · English UI · fictional data only

![Keyhaven — Browse homes: a grid of listing cards with photos, rent, beds and baths, city filter and sorting](docs/browse.jpg)

[Quick start](#quick-start) · [Demo accounts](#demo-accounts) · [What works today](#what-works-today-m0) ·
[Architecture](#architecture) · [Development](#development) · [Roadmap](#roadmap)

</div>

---

## Quick start

Two ways to run it. Both end at a seeded database with ~1,000 listings and four demo accounts.

### A. Your own PostgreSQL 18 (one command)

Requires Node.js 26 (`.nvmrc`) and a PostgreSQL 18 server you can create databases on.

```bash
# once: a role and three databases (app, shadow for schema checks, test)
psql -h localhost -d postgres -c "CREATE ROLE keyhaven LOGIN PASSWORD 'keyhaven';" \
  -c "CREATE DATABASE keyhaven OWNER keyhaven;" \
  -c "CREATE DATABASE keyhaven_shadow OWNER keyhaven;" \
  -c "CREATE DATABASE keyhaven_test OWNER keyhaven;"

make setup   # installs both packages, applies the migrations, seeds the demo data
make dev     # backend on :3000, frontend on :5180 — Ctrl-C stops both
```

Then open **http://localhost:5180** and sign in with a [demo account](#demo-accounts).

`make setup` copies `backend/.env.example` to `backend/.env` (git-ignored) — edit `DATABASE_URL`
there if your server, role or password differ. Emails (verification, password reset) are printed
to the backend's log in local development; set `EMAIL_TRANSPORT=smtp` and `SMTP_URL` to send them.

### B. Docker Compose (everything in containers)

Requires Docker with Compose v2. Set `DATABASE_PASSWORD` in `.env` before the first start.

```bash
cp .env.example .env
docker compose up --build -d
docker compose run --rm migrate npm run db:seed
```

Then open **http://localhost:8080**. `docker compose logs backend` shows the emails. `docker compose
down -v` deletes the data.

## Demo accounts

Every password is **`Keyhaven-Demo-2026!`** (all people and homes are fictional).

| Role | Account | Lands on |
|---|---|---|
| **Tenant** | `maya.lopez@keyhaven.example` | Browse homes — published listings, city filter, sorting |
| **Landlord** | `daniel.reyes@keyhaven.example` | Their listings — counts per status, publish / unpublish |
| **Agent** (Harborline Realty) | `priya.nair@harborline.example` | The agency's listings — same dashboard, shared with the other agents |
| **Admin** | `alex.morgan@keyhaven.example` | All listings — and the power to suspend one |

Any visitor can create their own tenant or landlord account at `/signup`; the verification link is
in the backend log (or your inbox with SMTP configured).

## What works today (M0)

- **Accounts:** sign-up (tenant or landlord), email verification, sign-in, forgot / reset password,
  password change, sessions ("sign out everywhere"), a security log — server-side sessions, no JWT.
- **Roles, enforced on the server:** tenants browse; landlords manage their own listings; agents
  manage their agency's; admins see everything and can suspend a listing. A foreign listing answers
  403 (or 404 when the caller should not learn it exists) — see `backend/test/access.spec.ts`.
- **Listings (read side):** ~1,000 seeded homes across Austin, Denver, Seattle, Chicago, Atlanta and
  Phoenix with photos; browse page with city filter, sorting and paging; listing page with gallery,
  facts and the landlord / agency card. **The exact address is hidden** until a viewing is
  confirmed (M2) — only the owner and admins see it today.
- **Dashboard (owner side):** counts per status, filters and search in the URL, publish /
  unpublish (verified email required), admin suspension with a confirmation.

  ![A listing's management page: photos, status badge, the exact address, Suspend listing for an admin and the landlord's contact card](docs/manage.jpg)
- **Operations:** one `docker compose up`, health endpoints, Prometheus metrics (admins), structured
  logs with trace ids, rate limits on every auth endpoint, CSRF double-submit, strict headers.

## Architecture

```
frontend/   React 19 + TypeScript · Vite · MUI 9 + Tailwind 4 · TanStack Query · React Router ·
            React Hook Form + Zod · react-i18next · types and runtime response schemas generated
            from backend/openapi.json
backend/    NestJS 11 (Express) · Prisma 7 on PostgreSQL 18 · Zod 4 (validation, OpenAPI,
            response serialisation) · pino · argon2id · rate-limiter-flexible (PostgreSQL store) ·
            nodemailer (SMTP) · Jest + supertest integration tests
```

- **Modular monolith:** `user`, `audit`, `email`, `auth`, `listing`. Controller → service →
  repository; only repositories touch Prisma; every query has an explicit `select`.
- **Security by default:** every handler is `@Public()` or `@Authorize(policy)` — the app refuses
  to start otherwise. Policies live in one file (`backend/src/common/security/policies.ts`); ownership
  checks in one service. Sessions are revocable rows; cookies are `HttpOnly` + `SameSite=Lax`.
- **No tenant hierarchy:** Keyhaven is a marketplace — a listing belongs to a landlord *or* an
  agency (a database CHECK), and agents act for their agency.
- **Contract first:** `backend/openapi.json` is generated from the Zod DTOs and committed; the
  frontend regenerates its types and runtime schemas from it (`npm run generate:api`), and every
  response is checked against them at runtime.
- **Email as a port:** `EmailSender` with a `log` adapter (local) and an `smtp` adapter; sent
  after the database transaction committed.

## Development

```bash
make check                     # every pipeline step of both packages, tests included

cd backend
npm run start:dev              # watch mode on :3000 (Swagger UI at /docs in dev)
npm test                       # integration tests on TEST_DATABASE_URL (migrated from scratch)
npm run db:migrate:create -- --name <module>_<description>   # then edit the SQL + write down.sql
npm run db:migrate:dev | db:check | db:seed
npm run openapi:generate       # after an API change (commit openapi.json)

cd frontend
npm run dev                    # Vite on :5180, /api proxied to :3000 (same-origin cookies)
npm run generate:api           # after openapi.json changed
npm run build                  # includes the bundle budget check
```

**Pipeline** (backend): `format:check` → `lint` → `typecheck` → `build` → `db:check` →
`i18n:check` → `openapi:check` → `test` → `audit`. (frontend): `lint` → `format:check` →
`typecheck` → `build` → `i18n:check`.

### Environment variables (backend)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | The PostgreSQL 18 connection (`postgresql://user:pass@host:5432/db`) |
| `SHADOW_DATABASE_URL`, `TEST_DATABASE_URL` | Local schema checks; the tests' own database (its name must contain `test`) |
| `APP_URL` | Where the app opens — links in emails point here |
| `EMAIL_TRANSPORT`, `SMTP_URL`, `EMAIL_FROM` | `log` (default) or `smtp` |
| `SESSION_*`, `COOKIE_*`, `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS` | Sessions and HTTP security |
| `DEMO_MODE`, `DEMO_PROTECTED_EMAILS` | Public demo: the showcase accounts cannot change their password or end their sessions |
| `LOG_LEVEL`, `DB_QUERY_LOG`, `DB_POOL_SIZE` | Observability and the pool |

All of them, with local values, are in `backend/.env.example`.

## Roadmap

| Milestone | Scope |
|---|---|
| **M0 — Foundation** (this release) | Accounts, roles, seed, dashboards by role, access tests |
| **M1 — Listings and search** | Search with filters, sorting and typo-tolerant text; saved listings and searches with daily emails; create / edit listings with photo upload; views and saves |
| **M2 — Viewing booking** | Weekly viewing hours and slots, booking without double booking (proved by a test), confirm / decline / cancel, reminders, calendars |

Not planned for M0–M2: applications, payments, property management, map search, mobile apps.
