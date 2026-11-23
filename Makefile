# Keyhaven on your own PostgreSQL 18 (DATABASE_URL in backend/.env):
#   make setup   — install, migrate, seed, provision the photo store (once)
#   make install — the root tooling and its pre-commit hook (lint-staged in every package)
#   make dev     — backend (:3000) + frontend (:5180) together; Ctrl-C stops both
#   make storage — the S3-compatible photo store (RustFS in Docker) on :9000
#   make landing — the public landing page (Astro) on :4321
#   make check   — every pipeline step of all packages, tests included
#   make e2e     — the end-to-end tests: they build and start their own stack on a test database
# With Docker instead: docker compose up --build (README → Quick start).
SHELL := /bin/bash
.PHONY: install setup dev check backend frontend landing seed storage e2e

# The pre-commit hook runs each package's own Prettier and ESLint on its staged files (root package.json).
install:
	npm ci
	npx simple-git-hooks

setup: install storage
	@test -f backend/.env || { cp backend/.env.example backend/.env && echo "backend/.env created from .env.example — set DATABASE_URL if yours differs"; }
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	cd backend && npm ci && npm run db:migrate:deploy && npm run db:seed && npm run storage:init
	cd frontend && npm ci
	cd landing && npm ci
	cd e2e && npm ci && npx playwright install chromium

# Uploaded photos go to an S3-compatible store; locally that is RustFS from docker compose.
storage:
	@test -f .env || cp .env.example .env
	docker compose up -d storage

dev:
	@trap 'kill 0' EXIT INT TERM; \
	(cd backend && npm run start:dev) & \
	(cd frontend && npm run dev) & \
	wait

backend:
	cd backend && npm run start:dev

frontend:
	cd frontend && npm run dev

# The signed-out home page; in production nginx serves it at / (frontend/nginx.conf).
landing:
	cd landing && npm run dev

# End-to-end tests (Playwright, root e2e/): API, UI and landing against their own stack on E2E_DATABASE_URL (keyhaven_test).
e2e:
	cd e2e && npm test

seed:
	cd backend && npm run db:seed

check:
	cd backend && npm run format:check && npm run lint && npm run typecheck && npm run build && npm run db:check && npm run i18n:check && npm run openapi:check && npm run audit
	cd frontend && npm run format:check && npm run lint && npm run typecheck && npm run build && npm run i18n:check && npm run api:check
	cd landing && npm run format:check && npm run lint && npm run build
	cd e2e && npm run format:check && npm run lint && npm run typecheck
	cd e2e && npm test
