# ─────────────────────────────────────────────────────────────────
#  SFIA Skills Intelligence Platform — Windows PowerShell Helper
#  For users without Make or Git Bash installed.
#
#  Usage:
#    .\start.ps1            — show menu
#    .\start.ps1 setup      — first-time setup
#    .\start.ps1 dev        — start dev environment
#    .\start.ps1 down       — stop all services
#    .\start.ps1 reset      — full reset (destroys DB data)
#    .\start.ps1 status     — show container status
#    .\start.ps1 logs       — tail all logs
#    .\start.ps1 psql       — open database shell
# ─────────────────────────────────────────────────────────────────

param(
    [string]$Command = "menu"
)

$ErrorActionPreference = "Stop"

# ── Colour helpers ────────────────────────────────────────────────
function Info  { param($msg) Write-Host "  [info]  $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "  [ok]    $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "  [warn]  $msg" -ForegroundColor Yellow }
function Err   { param($msg) Write-Host "  [error] $msg" -ForegroundColor Red }

function Print-Banner {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "  ║   SFIA Skills Intelligence Platform          ║" -ForegroundColor Blue
    Write-Host "  ║   Docker Environment Manager (Windows)       ║" -ForegroundColor Blue
    Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
}

# ── Prerequisite checks ───────────────────────────────────────────
function Check-Docker {
    try {
        $null = docker --version 2>&1
        $null = docker compose version 2>&1
        Ok "Docker and Docker Compose are available."
    } catch {
        Err "Docker not found. Install Docker Desktop from https://docker.com/products/docker-desktop/"
        exit 1
    }

    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Err "Docker Desktop is not running. Please start it and try again."
        exit 1
    }
}

# ── Commands ──────────────────────────────────────────────────────
function Do-Setup {
    Info "Running first-time setup..."
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Ok ".env created from .env.example"
        Warn "Review .env and update passwords before production use."
    } else {
        Info ".env already exists — skipping."
    }
    Ok "Setup complete. Run '.\start.ps1 dev' to start."
}

function Do-Dev {
    if (-not (Test-Path ".env")) {
        Err ".env not found. Run '.\start.ps1 setup' first."
        exit 1
    }
    Info "Starting development environment..."
    Info "This may take several minutes on first run (model download ~1.3GB)"
    docker compose up --build
}

function Do-DevDetached {
    if (-not (Test-Path ".env")) {
        Err ".env not found. Run '.\start.ps1 setup' first."
        exit 1
    }
    Info "Starting development environment (background)..."
    docker compose up --build -d
    Write-Host ""
    Ok "Services started!"
    Print-Urls
}

function Do-Down {
    Info "Stopping all services..."
    docker compose down
    Ok "All services stopped."
}

function Do-Reset {
    Warn "WARNING: This will destroy ALL database data and volumes."
    $confirm = Read-Host "  Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Info "Reset cancelled."
        return
    }
    docker compose down -v
    Ok "All volumes removed. Run '.\start.ps1 dev' to start fresh."
}

function Do-Status {
    Write-Host ""
    Write-Host "  ── Container Status ────────────────────────────" -ForegroundColor Blue
    docker compose ps
    Write-Host ""
    Print-Urls
}

function Do-Logs {
    Info "Tailing all service logs (Ctrl+C to stop)..."
    docker compose logs -f
}

function Do-LogsParser {
    docker compose logs -f parser
}

function Do-Psql {
    Info "Opening PostgreSQL shell..."
    docker exec -it sfia-db psql -U sfiauser -d sfiadb
}

function Do-Shell {
    Info "Opening bash shell in parser container..."
    docker exec -it sfia-parser /bin/bash
}

function Print-Urls {
    Write-Host "  ── Service URLs ────────────────────────────────" -ForegroundColor Blue
    Write-Host "     Viewer App:   " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
    Write-Host "     API:          " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Cyan
    Write-Host "     API Docs:     " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "     Health Check: " -NoNewline; Write-Host "http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Print-Banner
    Write-Host "  Commands:" -ForegroundColor White
    Write-Host "    setup    First-time setup (.env creation)"
    Write-Host "    dev      Start development environment (foreground)"
    Write-Host "    dev-bg   Start development environment (background)"
    Write-Host "    down     Stop all services"
    Write-Host "    reset    Full reset — destroys database"
    Write-Host "    status   Show container health and URLs"
    Write-Host "    logs     Tail all service logs"
    Write-Host "    logs-api Tail parser API logs"
    Write-Host "    psql     Open database shell"
    Write-Host "    shell    Open parser bash shell"
    Write-Host ""
    Write-Host "  Example: .\start.ps1 dev" -ForegroundColor Yellow
    Write-Host ""
}

# ── Main ──────────────────────────────────────────────────────────
Print-Banner
Check-Docker

switch ($Command.ToLower()) {
    "setup"    { Do-Setup }
    "dev"      { Do-Dev }
    "dev-bg"   { Do-DevDetached }
    "down"     { Do-Down }
    "reset"    { Do-Reset }
    "status"   { Do-Status }
    "logs"     { Do-Logs }
    "logs-api" { Do-LogsParser }
    "psql"     { Do-Psql }
    "shell"    { Do-Shell }
    default    { Show-Menu }
}
