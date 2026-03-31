# SFIA Skills Intelligence Platform

A web application that ingests CV documents, maps extracted skills to the **SFIA v9 framework** using NLP inference, and provides a human-in-the-loop validation workflow for building a structured, auditable skills register.

---

## Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Services](#services)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Database](#database)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Windows (PowerShell)

```powershell
# 1. Clone and enter the project
git clone <repo-url>
cd cv-platform

# 2. First-time setup
.\start.ps1 setup

# 3. Start development environment
.\start.ps1 dev
```

### macOS / Linux / WSL

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd cv-platform

# 2. Make startup script executable
chmod +x start.sh

# 3. First-time setup
./start.sh setup

# 4. Start development environment
./start.sh dev
```

### Using Make (any OS with Make installed)

```bash
make setup
make dev
```

**First run takes 5–10 minutes** — Docker pulls base images and the HuggingFace models (~1.3 GB) are downloaded into the `sfia-hf-cache` volume. Subsequent starts take under 30 seconds.

Once running:

| Service     | URL                          |
|-------------|------------------------------|
| Viewer App  | http://localhost:5173        |
| API         | http://localhost:8000        |
| API Docs    | http://localhost:8000/docs   |
| Health      | http://localhost:8000/health |
| PostgreSQL  | localhost:5432               |

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Docker Desktop | 4.x | Windows / macOS: download from docker.com |
| Docker Compose | v2 | Included with Docker Desktop |
| RAM | 4 GB free | Models load ~1.3 GB into RAM at startup |
| Disk | 10 GB free | Images (~4 GB) + model cache (~1.3 GB) + data |

### Windows-specific

- Docker Desktop must use the **WSL 2 backend** (Settings → General → Use WSL 2 based engine)
- Enable WSL integration for your distro: Settings → Resources → WSL Integration
- All project files should live **inside WSL** (`~/projects/cv-platform`) not on the Windows filesystem (`C:\...`) — bind mount performance is significantly better

### macOS-specific

- Docker Desktop for Mac works out of the box — no WSL required
- Apple Silicon (M1/M2/M3) is fully supported — images use `linux/amd64` emulation via Rosetta

### Linux-specific

```bash
# Install Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out and back in after this
```

---

## Project Structure

```
cv-platform/
├── docker-compose.yml           # Development orchestration
├── docker-compose.prod.yml      # Production overrides
├── .env.example                 # Environment variable template
├── Makefile                     # Cross-platform command runner
├── start.sh                     # Unix/macOS startup script
├── start.ps1                    # Windows PowerShell startup script
│
├── parser/                      # Parser API (FastAPI + HuggingFace)
│   ├── Dockerfile               # Multi-stage: development | production
│   ├── requirements.txt         # Python dependencies (pinned)
│   ├── main.py                  # FastAPI app, all route handlers
│   ├── config.py                # Settings via pydantic-settings
│   ├── database.py              # SQLAlchemy engine and session
│   ├── models.py                # ORM models (candidates, profiles, skills, audit)
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── parser_core.py           # NLP pipeline (JobBERT NER + DistilBART NLI)
│   └── sfia_reference.py        # SFIA v9 skill codes and level hypotheses
│
├── viewer/                      # Viewer frontend (React + Vite)
│   ├── Dockerfile               # Multi-stage: development | production (nginx)
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite config with API proxy
│   ├── nginx-spa.conf           # Nginx config for production SPA serving
│   └── src/                     # React source (build out here)
│       ├── main.jsx
│       ├── App.jsx
│       └── components/
│
├── db/
│   ├── init.sql                 # Schema DDL — runs on first container start
│   └── seed.sql                 # Sample data for development
│
└── scripts/
    └── nginx.conf               # Nginx reverse proxy (production)
```

---

## Services

### `db` — PostgreSQL 16

- **Image**: `postgres:16-alpine`
- **Port**: `5432` (dev only — not exposed in production)
- **Volume**: `sfia-pgdata` — persists across restarts
- **Init**: `db/init.sql` runs automatically on first start (when volume is empty)
- **Seed**: `db/seed.sql` inserts one sample candidate for immediate testing

### `parser` — FastAPI API

- **Port**: `8000`
- **Models loaded at startup**:
  - `jjzha/jobbert-base-cased` — NER for skill extraction (~400 MB)
  - `valhalla/distilbart-mnli-12-3` — zero-shot SFIA level estimation (~900 MB)
- **Volume**: `sfia-hf-cache` — caches model weights, survives rebuilds
- **Hot-reload**: source bind-mounted in dev; changes apply instantly

### `viewer` — React + Vite

- **Port**: `5173` (dev HMR) / `80` (prod nginx)
- **Hot-reload**: full HMR in development via Vite
- **Volume**: `sfia-viewer-modules` — isolates `node_modules` inside the container (avoids Windows path issues)

---

## Environment Variables

Copy `.env.example` to `.env` and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `DB_USER` | `sfiauser` | PostgreSQL username |
| `DB_PASSWORD` | `sfiapass_change_in_production` | PostgreSQL password — **change this** |
| `DB_NAME` | `sfiadb` | PostgreSQL database name |
| `DB_PORT` | `5432` | Host port for PostgreSQL |
| `PARSER_PORT` | `8000` | Host port for Parser API |
| `VIEWER_PORT` | `5173` | Host port for Viewer (dev only) |
| `LOG_LEVEL` | `info` | Uvicorn log level |
| `API_PUBLIC_URL` | *(prod only)* | Public URL of the API for production frontend build |

---

## Development Workflow

### Starting and stopping

```bash
# Start (foreground — see logs)
./start.sh dev          # or: make dev

# Start (background)
./start.sh dev-bg       # or: make dev-d

# Stop
./start.sh down         # or: make down

# Full reset (destroys database)
./start.sh reset        # or: make reset
```

### Viewing logs

```bash
./start.sh logs         # all services
./start.sh logs-api     # parser only
./start.sh logs-db      # postgres only
```

### Accessing the database

```bash
./start.sh psql
# or: docker exec -it sfia-db psql -U sfiauser -d sfiadb
```

### Accessing the parser shell

```bash
./start.sh shell
# or: docker exec -it sfia-parser /bin/bash
```

### Rebuilding after dependency changes

```bash
# After editing parser/requirements.txt or viewer/package.json:
docker compose up --build
```

### Running a fresh database

```bash
# Destroys pgdata volume and re-runs init.sql + seed.sql
docker compose down -v
docker compose up --build
```

---

## Production Deployment

Production uses the `docker-compose.prod.yml` override which:
- Builds optimised images (`production` target in each Dockerfile)
- Adds an Nginx reverse proxy on ports 80 / 443
- Removes development bind mounts
- Sets `TRANSFORMERS_OFFLINE=1` (models must be pre-cached)
- Does not expose the PostgreSQL port publicly

```bash
# Build and start production
make prod
# or:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Pre-cache models before production deploy

Models are downloaded on first parser startup. For production, cache them first in dev, then the `sfia-hf-cache` volume carries them forward:

```bash
# 1. Run dev once to populate hf_cache volume
make dev-d
# Wait for parser to log "Both models loaded and ready."
make down

# 2. Deploy production — models already in hf_cache
make prod
```

### TLS / HTTPS

Edit `scripts/nginx.conf` and uncomment the HTTPS server block. Place your certificates at `scripts/certs/fullchain.pem` and `scripts/certs/privkey.pem`. For Let's Encrypt, use Certbot with the nginx plugin.

---

## Database

### Schema overview

| Table | Purpose |
|---|---|
| `candidates` | PII and raw CV text (90-day retention on `raw_cv_text`) |
| `skills_profiles` | One per CV submission; tracks overall validation status |
| `sfia_skill_records` | One per identified skill; stores AI estimate and human-validated level |
| `audit_log` | Immutable event log of all skill record changes |

### Running migrations

The schema is applied via `db/init.sql` on first start. For schema changes in an existing deployment, use Alembic:

```bash
docker exec -it sfia-parser alembic revision --autogenerate -m "description"
docker exec -it sfia-parser alembic upgrade head
```

### Resetting to a clean database

```bash
docker compose down -v     # removes pgdata volume
docker compose up --build  # re-runs init.sql and seed.sql
```

---

## API Reference

Full interactive documentation: **http://localhost:8000/docs**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check — returns DB and model status |
| `POST` | `/parse` | Upload CV; returns candidate ID and skills count |
| `GET` | `/candidates` | List all candidates; supports `?status=PENDING` filter |
| `GET` | `/candidates/{id}` | Full candidate record with profiles and skill records |
| `GET` | `/profiles/{id}` | Full profile with all SFIA skill records |
| `PATCH` | `/profiles/{id}/skills/{skill_id}` | Validate (confirm/correct/reject) one skill record |
| `POST` | `/profiles/{id}/approve` | Approve entire profile — sets status to VALIDATED |
| `GET` | `/dashboard/skills` | Aggregate skills stats across validated profiles |

---

## Troubleshooting

### Docker Desktop not starting (Windows)

Enable virtualisation in BIOS (Intel VT-x or AMD-V). Ensure Hyper-V and WSL 2 features are enabled in Windows Features.

### `docker: command not found` inside WSL

Open Docker Desktop → Settings → Resources → WSL Integration → enable your Ubuntu distro → Apply & Restart.

### Parser takes forever to start on first run

The HuggingFace models are downloading (~1.3 GB). Check progress with `./start.sh logs-api`. Subsequent starts use the cached `sfia-hf-cache` volume and take under 30 seconds.

### `Cannot connect to database` error in parser logs

PostgreSQL takes 5–10 seconds to initialise. The `depends_on: condition: service_healthy` and `restart: unless-stopped` handle this automatically — the parser will retry until the DB is ready.

### Vite HMR not working (Windows/WSL)

This is a known Docker Desktop for Windows polling issue. Add to `vite.config.js`:

```js
server: {
  watch: { usePolling: true, interval: 1000 }
}
```

### Port already in use

```powershell
# Windows — find process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :8000
kill -9 <PID>
```

Or change the port in `.env` (`PARSER_PORT=8001`) and restart.

### `init.sql` not running (empty database)

The init script only runs when the `pgdata` volume is **empty**. Reset the volume:

```bash
docker compose down -v
docker compose up --build
```

### Out of disk space

```bash
# Remove unused Docker images and build cache
docker system prune -af
# Check volume sizes
docker system df -v
```
