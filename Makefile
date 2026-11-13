# Keyhaven on your own PostgreSQL 18 (DATABASE_URL in backend/.env):
#   make setup   — install, migrate, seed (once)
#   make dev     — backend (:3000) + frontend (:5180) together; Ctrl-C stops both
#   make check   — every pipeline step of both packages, tests included
# With Docker instead: docker compose up --build (README → Quick start).
SHELL := /bin/bash
.PHONY: setup dev check backend frontend seed

setup:
	@test -f backend/.env || { cp backend/.env.example backend/.env && echo "backend/.env created from .env.example — set DATABASE_URL if yours differs"; }
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	cd backend && npm ci && npm run db:migrate:deploy && npm run db:seed
	cd frontend && npm ci

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
