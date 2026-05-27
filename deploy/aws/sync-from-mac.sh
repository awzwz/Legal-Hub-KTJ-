#!/usr/bin/env bash
# Загрузить код LegalHUB на EC2 с вашего Mac одним запуском.
#
# Использование:
#   chmod +x deploy/aws/sync-from-mac.sh
#   ./deploy/aws/sync-from-mac.sh <ELASTIC_IP>
#
# Ключ по умолчанию: ~/Downloads/legalhub-demo.pem
# Переопределить:
#   SSH_KEY=~/.ssh/legalhub-demo.pem ./deploy/aws/sync-from-mac.sh 1.2.3.4
#
set -euo pipefail

HOST="${1:?Укажите публичный IP или Elastic IP инстанса.\n  Использование: $0 <IP>\n}"
KEY="${SSH_KEY:-$HOME/Downloads/legalhub-demo.pem}"

if [[ ! -f "$KEY" ]]; then
  echo "Не найден ключ: $KEY"
  echo "Положите legalhub-demo.pem в Downloads или задайте SSH_KEY=/path/to/key.pem"
  exit 1
fi

chmod 400 "$KEY" 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "==> Ключ: $KEY"
echo "==> Сервер: ec2-user@$HOST"
echo "==> Каталог проекта: $ROOT"
echo

# Подготовка каталога на сервере
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "ec2-user@$HOST" \
  "sudo mkdir -p /opt/legalhub && sudo chown ec2-user:ec2-user /opt/legalhub && mkdir -p /opt/legalhub/app"

# Синхронизация (без тяжёлых артефактов; без секретов с машины)
rsync -avz --progress \
  --exclude node_modules \
  --exclude frontend/node_modules \
  --exclude backend/.venv \
  --exclude '.venv-pir' \
  --exclude '.claude' \
  --exclude '**/__pycache__' \
  --exclude dist \
  --exclude '.git/objects' \
  --exclude deploy/aws/.env.prod \
  --exclude '*.pem' \
  --exclude 'Копия Отчет ПИР*.xlsx' \
  -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
  "$ROOT/" "ec2-user@$HOST:/opt/legalhub/app/"

echo
echo "=========================================="
echo "Готово: код на сервере в /opt/legalhub/app"
echo
echo "Дальше на сервере (или одной командой ssh ниже):"
echo "  1) sudo bash /opt/legalhub/app/deploy/aws/setup.sh     # первый раз: Docker + swap"
echo "  2) cd /opt/legalhub/app/deploy/aws"
echo "  3) cp .env.prod.example .env.prod && vim .env.prod     # секреты + LEGALHUB_DOMAIN"
echo "  4) docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
echo "=========================================="
echo
echo "Подключение:"
echo "  ssh -i \"$KEY\" ec2-user@$HOST"
