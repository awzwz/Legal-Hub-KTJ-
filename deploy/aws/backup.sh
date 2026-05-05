#!/usr/bin/env bash
# Ежедневный pg_dump в /opt/legalhub/backups + ротация (7 дней).
# Cron: 0 3 * * * /opt/legalhub/app/deploy/aws/backup.sh >> /var/log/legalhub-backup.log 2>&1
set -euo pipefail

BACKUP_DIR=/opt/legalhub/backups
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/legalhub-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Контейнер БД называется так же, как сервис в docker-compose.prod.yml
docker exec -t "$(docker ps -qf name=^db$|head -n1)" \
  pg_dump -U "${POSTGRES_USER:-legalhub}" "${POSTGRES_DB:-legalhub}" | gzip -9 > "$OUT"

echo "[$(date -Is)] saved $OUT ($(du -h "$OUT" | cut -f1))"

# Удаляем дампы старше 7 суток.
find "$BACKUP_DIR" -name 'legalhub-*.sql.gz' -mtime +7 -delete
