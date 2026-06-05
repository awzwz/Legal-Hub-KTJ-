#!/usr/bin/env bash
# Ежедневный pg_dump + архив прикреплённых документов в /opt/legalhub/backups.
# Ротация: 7 дней.
# Cron: 0 3 * * * /opt/legalhub/app/deploy/aws/backup.sh >> /var/log/legalhub-backup.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/legalhub/backups}"
DOCUMENTS_DIR="${DOCUMENTS_DIR:-/opt/legalhub/case_documents}"
STAMP=$(date +%Y%m%d-%H%M%S)
DB_OUT="$BACKUP_DIR/legalhub-$STAMP.sql.gz"
DOCS_OUT="$BACKUP_DIR/legalhub-documents-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

# Compose сам находит контейнер сервиса независимо от имени проекта.
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" --env-file "$SCRIPT_DIR/.env.prod" \
  exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$DB_OUT"

gzip -t "$DB_OUT"
echo "[$(date -Is)] saved $DB_OUT ($(du -h "$DB_OUT" | cut -f1))"

if [ -d "$DOCUMENTS_DIR" ]; then
  tar -C "$DOCUMENTS_DIR" -czf "$DOCS_OUT" .
  tar -tzf "$DOCS_OUT" >/dev/null
  echo "[$(date -Is)] saved $DOCS_OUT ($(du -h "$DOCS_OUT" | cut -f1))"
else
  echo "[$(date -Is)] documents directory not found: $DOCUMENTS_DIR"
fi

# Удаляем дампы старше 7 суток.
find "$BACKUP_DIR" -name 'legalhub-*.sql.gz' -mtime +7 -delete
find "$BACKUP_DIR" -name 'legalhub-documents-*.tar.gz' -mtime +7 -delete
