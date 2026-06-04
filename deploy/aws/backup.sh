#!/usr/bin/env bash
# Ежедневный pg_dump в /opt/legalhub/backups + ротация (7 дней).
# Cron: 0 3 * * * /opt/legalhub/app/deploy/aws/backup.sh >> /var/log/legalhub-backup.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/legalhub/backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/legalhub-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Compose сам находит контейнер сервиса независимо от имени проекта.
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" --env-file "$SCRIPT_DIR/.env.prod" \
  exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$OUT"

gzip -t "$OUT"
echo "[$(date -Is)] saved $OUT ($(du -h "$OUT" | cut -f1))"

# Удаляем дампы старше 7 суток.
find "$BACKUP_DIR" -name 'legalhub-*.sql.gz' -mtime +7 -delete
