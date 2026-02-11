#!/usr/bin/env bash
set -euo pipefail

# Backup helper for a VPS running Postgres.
# Usage examples:
#  ./scripts/backup_vps.sh -h vps.example.com -u ubuntu
#  ./scripts/backup_vps.sh -h vps.example.com -u ubuntu -k ~/.ssh/id_rsa -p "/var/www /etc" -e node_modules -d ./backups

PRINT_USAGE(){
  cat <<EOF
Usage: $0 -h HOST -u USER [options]

Options:
  -h HOST        Remote host (required)
  -u USER        Remote SSH user (required)
  -k SSH_KEY     Path to SSH private key (optional)
  -p PATHS       Space-separated remote paths to include in tar (default: /etc /var/www /home)
  -e EXCLUDE     Exclude pattern for tar (can be repeated, default: node_modules)
  -d BACKUP_DIR  Local directory to store backups (default: ./backups)
  -t TIMESTAMP   Custom timestamp (optional)
  -?             Show this help
EOF
}

HOST=""
USER=""
SSH_KEY=""
REMOTE_PATHS=("/etc" "/var/www" "/home")
EXCLUDES=("node_modules")
BACKUP_DIR="./backups"
TS="$(date +%F_%H%M%S)"

while getopts ":h:u:k:p:e:d:t:?" opt; do
  case $opt in
    h) HOST="$OPTARG" ;;
    u) USER="$OPTARG" ;;
    k) SSH_KEY="$OPTARG" ;;
    p) IFS=' ' read -r -a REMOTE_PATHS <<< "$OPTARG" ;;
    e) EXCLUDES+=("$OPTARG") ;;
    d) BACKUP_DIR="$OPTARG" ;;
    t) TS="$OPTARG" ;;
    ?) PRINT_USAGE; exit 0 ;;
  esac
done

if [[ -z "$HOST" || -z "$USER" ]]; then
  PRINT_USAGE
  exit 1
fi

SSH_OPTS=()
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=( -i "$SSH_KEY" )
fi

mkdir -p "$BACKUP_DIR"

REMOTE_SQL="/tmp/all_dbs_${TS}.sql"
REMOTE_TAR="/tmp/vps_backup_${TS}.tar.gz"

# Build tar exclude flags
TAR_EXC=""
for ex in "${EXCLUDES[@]}"; do
  TAR_EXC+=" --exclude=$ex"
done

# Build tar include list
TAR_PATHS=""
for p in "${REMOTE_PATHS[@]}"; do
  TAR_PATHS+=" $p"
done

echo "[backup] creating PostgreSQL dump and tarball on ${USER}@${HOST}"
ssh ${SSH_OPTS[*]} "$USER@$HOST" \
  "set -euo pipefail; sudo -u postgres pg_dumpall -c > ${REMOTE_SQL}; sudo tar -C / -czf ${REMOTE_TAR} ${TAR_EXC} ${TAR_PATHS}"

echo "[backup] downloading files to ${BACKUP_DIR}"
scp ${SSH_OPTS[*]} "$USER@$HOST:${REMOTE_SQL}" "${BACKUP_DIR}/all_dbs_${TS}.sql"
scp ${SSH_OPTS[*]} "$USER@$HOST:${REMOTE_TAR}" "${BACKUP_DIR}/vps_backup_${TS}.tar.gz"

echo "[backup] cleaning temporary files on remote"
ssh ${SSH_OPTS[*]} "$USER@$HOST" "rm -f ${REMOTE_SQL} ${REMOTE_TAR}"

echo "[backup] done: ${BACKUP_DIR}/vps_backup_${TS}.tar.gz and all_dbs_${TS}.sql"

exit 0
