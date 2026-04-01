#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  SFIA Skills Intelligence Platform — Unix/macOS Startup Script
#  Wraps docker compose with sensible defaults.
#
#  Usage:
#    ./start.sh          — show menu
#    ./start.sh setup    — first-time setup
#    ./start.sh dev      — start dev environment (foreground)
#    ./start.sh dev-bg   — start dev environment (background)
#    ./start.sh down     — stop all services
#    ./start.sh reset    — full reset (destroys DB data)
#    ./start.sh status   — show container status and URLs
#    ./start.sh logs     — tail all logs
#    ./start.sh psql     — open database shell
#    ./start.sh shell    — open parser bash shell
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m';  BLUE='\033[0;34m';  RESET='\033[0m'
BOLD='\033[1m'

info()  { echo -e "${CYAN}  [info]  $*${RESET}"; }
ok()    { echo -e "${GREEN}  [ok]    $*${RESET}"; }
warn()  { echo -e "${YELLOW}  [warn]  $*${RESET}"; }
err()   { echo -e "${RED}  [error] $*${RESET}"; }

banner() {
  echo ""
  echo -e "${BLUE}${BOLD}  ╔══════════════════════════════════════════════╗${RESET}"
  echo -e "${BLUE}${BOLD}  ║   SFIA Skills Intelligence Platform          ║${RESET}"
  echo -e "${BLUE}${BOLD}  ║   Docker Environment Manager                 ║${RESET}"
  echo -e "${BLUE}${BOLD}  ╚══════════════════════════════════════════════╝${RESET}"
  echo ""
}

# ── Prerequisite checks ───────────────────────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found. Install from https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker compose version &>/dev/null; then
    err "Docker Compose v2 not found. Update Docker Desktop or install the plugin."
    exit 1
  fi
  if ! docker info &>/dev/null; then
    err "Docker daemon is not running. Start Docker Desktop or the Docker service."
    exit 1
  fi
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',') is running."
}

# ── Commands ──────────────────────────────────────────────────────
do_setup() {
  info "Running first-time setup..."
  if [ ! -f .env ]; then
    cp .env.example .env
    ok ".env created from .env.example"
    warn "Edit .env and update passwords before production use."
  else
    info ".env already exists — skipping."
  fi
  ok "Setup complete. Run './start.sh dev' to start."
}

do_dev() {
  [ -f .env ] || { err ".env not found. Run './start.sh setup' first."; exit 1; }
  info "Starting development environment..."
  info "First run may take several minutes (model download ~1.3GB)"
  docker compose up --build
}

do_dev_bg() {
  [ -f .env ] || { err ".env not found. Run './start.sh setup' first."; exit 1; }
  info "Starting development environment (background)..."
  docker compose up --build -d
  echo ""
  ok "Services started!"
  print_urls
}

do_down() {
  info "Stopping all services..."
  docker compose down
  ok "All services stopped."
}

do_reset() {
  warn "WARNING: This will destroy ALL database data and volumes."
  read -rp "  Type 'yes' to confirm: " confirm
  [ "$confirm" = "yes" ] || { info "Reset cancelled."; return; }
  docker compose down -v
  ok "All volumes removed. Run './start.sh dev' to start fresh."
}

do_status() {
  echo ""
  echo -e "${BLUE}${BOLD}  ── Container Status ────────────────────────────${RESET}"
  docker compose ps
  echo ""
  print_urls
}

do_logs()        { docker compose logs -f; }
do_logs_parser() { docker compose logs -f parser; }
do_logs_db()     { docker compose logs -f db; }
do_logs_viewer() { docker compose logs -f viewer; }

do_psql() {
  info "Opening PostgreSQL shell..."
  docker exec -it sfia-db psql -U sfiauser -d sfiadb
}

do_shell() {
  info "Opening bash shell in parser container..."
  docker exec -it sfia-parser /bin/bash
}

print_urls() {
  echo -e "${BLUE}${BOLD}  ── Service URLs ────────────────────────────────${RESET}"
  echo -e "     Viewer App:   ${CYAN}http://localhost:5173${RESET}"
  echo -e "     API:          ${CYAN}http://localhost:8000${RESET}"
  echo -e "     API Docs:     ${CYAN}http://localhost:8000/docs${RESET}"
  echo -e "     Health Check: ${CYAN}http://localhost:8000/health${RESET}"
  echo ""
}

show_menu() {
  banner
  echo -e "${BOLD}  Commands:${RESET}"
  echo "    setup      First-time setup (.env creation)"
  echo "    dev        Start development environment (foreground)"
  echo "    dev-bg     Start development environment (background)"
  echo "    down       Stop all services"
  echo "    reset      Full reset — destroys database volume"
  echo "    status     Show container health and URLs"
  echo "    logs       Tail all service logs"
  echo "    logs-api   Tail parser API logs"
  echo "    logs-db    Tail database logs"
  echo "    psql       Open database shell"
  echo "    shell      Open parser bash shell"
  echo ""
  echo -e "  ${YELLOW}Example: ./start.sh dev${RESET}"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────
banner
check_docker

CMD="${1:-menu}"

case "$CMD" in
  setup)     do_setup ;;
  dev)       do_dev ;;
  dev-bg)    do_dev_bg ;;
  down)      do_down ;;
  reset)     do_reset ;;
  status)    do_status ;;
  logs)      do_logs ;;
  logs-api)  do_logs_parser ;;
  logs-db)   do_logs_db ;;
  logs-viewer) do_logs_viewer ;;
  psql)      do_psql ;;
  shell)     do_shell ;;
  urls)      print_urls ;;
  *)         show_menu ;;
esac
