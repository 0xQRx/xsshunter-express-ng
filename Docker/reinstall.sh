#!/bin/bash
#
# Reinstall XSS Hunter Express from GitHub while keeping its data.
#
# Preserves: Postgres data, payload fire screenshots, Let's Encrypt certs (ssldata)
# and your customised docker-compose.yml.
#
# Usage: sudo ./reinstall.sh [--no-start] [--foreground]
#   --no-start     reinstall and restore data, but don't start the containers
#   --foreground   run docker compose in the foreground (as the old one-liner did)
#
# Settings can be overridden with environment variables, e.g.
#   sudo BRANCH=dev ./reinstall.sh

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/xsshunter-express-ng}"
REPO_URL="${REPO_URL:-git@github.com:0xQRx/xsshunter-express-ng.git}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE_SRC="${COMPOSE_FILE_SRC:-/opt/docker-compose.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/xsshunter-backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
SERVICE="${SERVICE:-xsshunterexpress}"

# Data directories, relative to INSTALL_DIR
DATA_DIRS=(
    "Docker/postgres-db-data"
    "server-ng/payload-fire-images"
    "Docker/ssldata"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()  { echo -e "\n${BLUE}==>${NC} $*"; }

NO_START=false
FOREGROUND=false
for arg in "$@"; do
    case $arg in
        --no-start)   NO_START=true ;;
        --foreground) FOREGROUND=true ;;
        --help|-h)    sed -n '3,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            error "Unknown option: $arg (see --help)"; exit 1 ;;
    esac
done

# This script deletes INSTALL_DIR, and bash reads scripts as it runs them,
# so never run from inside it: re-exec from a temporary copy instead.
SCRIPT_PATH="$(readlink -f "$0")"
if [[ "$SCRIPT_PATH" == "$(readlink -f "$INSTALL_DIR")"/* ]]; then
    TMP_SCRIPT="$(mktemp /tmp/xsshunter-reinstall.XXXXXX.sh)"
    cp "$SCRIPT_PATH" "$TMP_SCRIPT"
    chmod +x "$TMP_SCRIPT"
    exec "$TMP_SCRIPT" "$@"
fi

STAGING_DIR="${INSTALL_DIR}.new"
OLD_DIR="${INSTALL_DIR}.old"
BACKUP_DIR="${BACKUP_ROOT}/$(date +%Y%m%d-%H%M%S)"

# Pick docker compose v2 or the legacy docker-compose binary
if docker compose version &>/dev/null; then
    COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
    COMPOSE=(docker-compose)
else
    error "Neither 'docker compose' nor 'docker-compose' is available"
    exit 1
fi

on_error() {
    error "Reinstall failed on line $1."
    if [ -d "$OLD_DIR" ]; then
        echo "  The previous install is kept at: $OLD_DIR"
        echo "  To roll back:  rm -rf $INSTALL_DIR && mv $OLD_DIR $INSTALL_DIR"
        echo "                 cd $INSTALL_DIR/Docker && ${COMPOSE[*]} up -d"
    fi
    if [ -d "$BACKUP_DIR" ]; then
        echo "  Data backup:   $BACKUP_DIR"
    fi
}
trap 'on_error $LINENO' ERR

# ---------------------------------------------------------------------------
step "Pre-flight checks"

command -v git &>/dev/null || { error "git is not installed"; exit 1; }
[ -f "$COMPOSE_FILE_SRC" ] || { error "Compose file not found: $COMPOSE_FILE_SRC"; exit 1; }

for dir in "${DATA_DIRS[@]}"; do
    path="$INSTALL_DIR/$dir"
    if [ -d "$path" ] && [ -n "$(find "$path" ! -readable -print -quit 2>&1)" ]; then
        error "Cannot read everything in $path (Postgres data is owned by the container user). Re-run with sudo."
        exit 1
    fi
done

# Rough space check: the backup needs about as much space as the data
DATA_KB=0
for dir in "${DATA_DIRS[@]}"; do
    [ -d "$INSTALL_DIR/$dir" ] && DATA_KB=$((DATA_KB + $(du -sk "$INSTALL_DIR/$dir" | cut -f1)))
done
mkdir -p "$BACKUP_ROOT"
FREE_KB=$(df -Pk "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
if [ "$FREE_KB" -lt $((DATA_KB + 1048576)) ]; then
    error "Not enough free space in $BACKUP_ROOT: need ~$((DATA_KB / 1024 + 1024)) MB, have $((FREE_KB / 1024)) MB"
    exit 1
fi
info "Data to back up: $((DATA_KB / 1024)) MB, free: $((FREE_KB / 1024)) MB"

# ---------------------------------------------------------------------------
step "Cloning $REPO_URL ($BRANCH)"

# Clone before touching anything, so a bad SSH key or network issue
# leaves the running install untouched
rm -rf "$STAGING_DIR"
git clone --branch "$BRANCH" "$REPO_URL" "$STAGING_DIR"
info "Cloned commit: $(git -C "$STAGING_DIR" log -1 --format='%h %s')"

# ---------------------------------------------------------------------------
step "Stopping containers"

# Postgres must be stopped so the data directory is copied consistently
if [ -f "$INSTALL_DIR/Docker/docker-compose.yml" ]; then
    (cd "$INSTALL_DIR/Docker" && "${COMPOSE[@]}" down)
else
    warn "No existing docker-compose.yml in $INSTALL_DIR/Docker, nothing to stop"
fi

# ---------------------------------------------------------------------------
step "Backing up data to $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"
for dir in "${DATA_DIRS[@]}"; do
    src="$INSTALL_DIR/$dir"
    if [ -d "$src" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname "$dir")"
        # -a keeps ownership and permissions (Postgres refuses a data dir it doesn't own)
        cp -a "$src" "$BACKUP_DIR/$dir"
        info "Backed up $dir ($(du -sh "$src" | cut -f1))"
    else
        warn "Skipping $dir (not present)"
    fi
done

# ---------------------------------------------------------------------------
step "Installing new version"

rm -rf "$OLD_DIR"
if [ -d "$INSTALL_DIR" ]; then
    mv "$INSTALL_DIR" "$OLD_DIR"
fi
mv "$STAGING_DIR" "$INSTALL_DIR"
cp "$COMPOSE_FILE_SRC" "$INSTALL_DIR/Docker/docker-compose.yml"
info "Copied $COMPOSE_FILE_SRC"

# ---------------------------------------------------------------------------
step "Restoring data"

for dir in "${DATA_DIRS[@]}"; do
    src="$BACKUP_DIR/$dir"
    dest="$INSTALL_DIR/$dir"
    [ -d "$src" ] || continue
    # Copy contents with "src/." so a directory the repo already ships
    # (payload-fire-images/.keep) is merged, not nested inside itself
    mkdir -p "$dest"
    cp -a "$src/." "$dest/"
    info "Restored $dir"
done

# Earlier "cp -r" reinstalls nested screenshots in payload-fire-images/payload-fire-images-temp/
# where the app can't see them; move any nested screenshots back to the top level
IMAGES_DIR="$INSTALL_DIR/server-ng/payload-fire-images"
NESTED_COUNT=$(find "$IMAGES_DIR" -mindepth 2 -type f -name '*.png.gz' 2>/dev/null | wc -l)
if [ "$NESTED_COUNT" -gt 0 ]; then
    find "$IMAGES_DIR" -mindepth 2 -type f -name '*.png.gz' -exec mv -n {} "$IMAGES_DIR/" \;
    find "$IMAGES_DIR" -mindepth 1 -type d -empty -delete
    info "Moved $NESTED_COUNT nested screenshot(s) back into payload-fire-images/"
fi

# Sanity check: same number of files restored as backed up
for dir in "${DATA_DIRS[@]}"; do
    [ -d "$BACKUP_DIR/$dir" ] || continue
    backed_up=$(find "$BACKUP_DIR/$dir" -type f | wc -l)
    restored=$(find "$INSTALL_DIR/$dir" -type f | wc -l)
    if [ "$restored" -lt "$backed_up" ]; then
        error "$dir: restored $restored files but backed up $backed_up"
        false
    fi
done

rm -rf "$OLD_DIR"

# Keep only the newest KEEP_BACKUPS backups
mapfile -t OLD_BACKUPS < <(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)))
for old in "${OLD_BACKUPS[@]}"; do
    rm -rf "$old"
    info "Removed old backup $old"
done

trap - ERR
info "Reinstall complete. Backup kept at $BACKUP_DIR"

# ---------------------------------------------------------------------------
if [ "$NO_START" = true ]; then
    info "Skipping start (--no-start). To start: cd $INSTALL_DIR/Docker && ${COMPOSE[*]} up -d --build"
    exit 0
fi

step "Building and starting containers"
cd "$INSTALL_DIR/Docker"
if [ "$FOREGROUND" = true ]; then
    exec "${COMPOSE[@]}" up --build --force-recreate "$SERVICE"
fi

"${COMPOSE[@]}" up -d --build --force-recreate "$SERVICE"
info "Containers started. Following logs (Ctrl+C stops following, not the containers)..."
"${COMPOSE[@]}" logs -f "$SERVICE"
