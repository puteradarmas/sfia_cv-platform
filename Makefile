# ─────────────────────────────────────────────────────────────────
#  SFIA Skills Intelligence Platform — Makefile
#  Works on: Linux, macOS, Windows (via Git Bash or WSL)
#
#  Common commands:
#    make setup   — first-time setup (copy .env, create dirs)
#    make dev     — start development environment
#    make prod    — start production environment
#    make down    — stop all services
#    make reset   — full reset including database volume
#    make logs    — tail all service logs
#    make shell   — open a shell in the parser container
#    make psql    — open psql in the database container
#    make status  — show container status
# ─────────────────────────────────────────────────────────────────

.PHONY: help setup dev prod down reset logs logs-parser logs-db \
        shell psql status build-prod clean check-env

# ── Detect OS ─────────────────────────────────────────────────────
ifeq ($(OS),Windows_NT)
  DETECTED_OS := Windows
  COPY_CMD    := copy
  ENV_EXISTS  := if not exist .env
else
  DETECTED_OS := $(shell uname -s)
  COPY_CMD    := cp
  ENV_EXISTS  := test ! -f .env &&
endif

COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

# ── Default target ────────────────────────────────────────────────
help:
	@echo ""
	@echo "  SFIA Skills Intelligence Platform"
	@echo "  ─────────────────────────────────"
	@echo "  make setup       First-time project setup"
	@echo "  make dev         Start development environment (hot-reload)"
	@echo "  make prod        Start production environment"
	@echo "  make down        Stop all running services"
	@echo "  make reset       Full reset — destroys database volume"
	@echo "  make logs        Tail all service logs"
	@echo "  make logs-parser Tail parser API logs only"
	@echo "  make logs-db     Tail database logs only"
	@echo "  make shell       Open bash in parser container"
	@echo "  make psql        Open psql in database container"
	@echo "  make status      Show container health and ports"
	@echo "  make clean       Remove stopped containers and dangling images"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────
setup:
	@echo "[setup] Detected OS: $(DETECTED_OS)"
	@$(ENV_EXISTS) $(COPY_CMD) .env.example .env && echo "[setup] Created .env from .env.example" || echo "[setup] .env already exists — skipping"
	@echo "[setup] Done. Edit .env if needed, then run: make dev"

# ── Development ───────────────────────────────────────────────────
dev: check-env
	@echo "[dev] Starting development environment..."
	$(COMPOSE) up --build

dev-d: check-env
	@echo "[dev] Starting development environment (detached)..."
	$(COMPOSE) up --build -d
	@echo "[dev] Services started. Viewer: http://localhost:5173  API: http://localhost:8000/docs"

# ── Production ────────────────────────────────────────────────────
prod: check-env
	@echo "[prod] Building and starting production environment..."
	$(COMPOSE_PROD) up --build -d
	@echo "[prod] Production started."

build-prod:
	@echo "[prod] Building production images..."
	$(COMPOSE_PROD) build

# ── Stop ──────────────────────────────────────────────────────────
down:
	@echo "[down] Stopping all services..."
	$(COMPOSE) down

# ── Reset (destroys DB data) ──────────────────────────────────────
reset:
	@echo "[reset] WARNING: This will destroy all database data."
	@echo "[reset] Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	$(COMPOSE) down -v
	@echo "[reset] All volumes removed. Run 'make dev' to start fresh."

# ── Logs ──────────────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f

logs-parser:
	$(COMPOSE) logs -f parser

logs-db:
	$(COMPOSE) logs -f db

logs-viewer:
	$(COMPOSE) logs -f viewer

# ── Shell access ──────────────────────────────────────────────────
shell:
	docker exec -it sfia-parser /bin/bash

psql:
	docker exec -it sfia-db psql -U sfiauser -d sfiadb

# ── Status ────────────────────────────────────────────────────────
status:
	@echo ""
	@echo "── Container Status ──────────────────────────────────────"
	$(COMPOSE) ps
	@echo ""
	@echo "── Service URLs ──────────────────────────────────────────"
	@echo "   Viewer:     http://localhost:5173"
	@echo "   API:        http://localhost:8000"
	@echo "   API Docs:   http://localhost:8000/docs"
	@echo "   Health:     http://localhost:8000/health"
	@echo "   PostgreSQL: localhost:5432"
	@echo ""

# ── Clean ─────────────────────────────────────────────────────────
clean:
	docker system prune -f
	docker image prune -f

# ── Guard: .env must exist ────────────────────────────────────────
check-env:
	@test -f .env || (echo "[error] .env file not found. Run 'make setup' first." && exit 1)
