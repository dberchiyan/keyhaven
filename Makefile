# Keyhaven on your own PostgreSQL 18 (DATABASE_URL in backend/.env):
#   make setup   — install, migrate, seed, provision the photo store (once)
#   make dev     — backend (:3000) + frontend (:5180) together; Ctrl-C stops both
#   make storage — the S3-compatible photo store (RustFS in Docker) on :9000
#   make check   — every pipeline step of both packages, tests included
# With Docker instead: docker compose up --build (README → Quick start).
SHELL := /bin/bash
.PHONY: setup dev check backend frontend seed storage

setup: storage
	@test -f backend/.env || { cp backend/.env.example backend/.env && echo "backend/.env created from .env.example — set DATABASE_URL if yours differs"; }
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	cd backend && npm ci && npm run db:migrate:deploy && npm run db:seed && npm run storage:init
	cd frontend && npm ci

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

seed:
	cd backend && npm run db:seed

check:
	cd backend && npm run format:check && npm run lint && npm run typecheck && npm run build && npm run db:check && npm run i18n:check && npm run openapi:check && npm test && npm run audit
	cd frontend && npm run lint && npm run format:check && npm run typecheck && npm run build && npm run i18n:check
