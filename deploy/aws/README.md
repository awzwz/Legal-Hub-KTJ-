# Деплой LegalHUB КТЖ на AWS — single-EC2 demo

Цель: за 30-60 минут получить рабочий https://-стенд для демонстрации заказчику.

## Архитектура

```
                 Internet
                    │
                    ▼
            ┌───────────────┐
            │ Caddy (TLS)   │   80 / 443  ← Let's Encrypt автоматом
            └───────┬───────┘
                    │
            ┌───────▼───────┐
            │  web (nginx)  │   /  → SPA
            └───┬───┬───┬───┘   /api/v1/* → микросервис по префиксу
                │   │   │
       ┌────────┘   │   └────────┐
       ▼            ▼            ▼
  svc-iam     svc-legal     svc-workspace / svc-reporting
       │            │            │
       └────────────┴────────────┘
                    │
            ┌───────▼───────┐
            │ Postgres 15   │   /opt/legalhub/pgdata (bind-mount)
            │ Redis 7       │   /opt/legalhub/redisdata
            └───────────────┘
```

Стоимость в `eu-central-1` (ориентир на ноябрь 2025):

| Ресурс | Тип | Стоимость |
|---|---|---|
| EC2 | t3.medium (2 vCPU, 4 GB RAM) on-demand | ~$30/мес |
| EBS | gp3, 30 GB | ~$2.4/мес |
| Elastic IP | привязан к работающему instance | $0 |
| Трафик | первые 100 GB out/мес | $0 |
| **Итого** | | **~$33/мес** |

> Если включить EC2 через Savings Plan на 1 год → ещё минус ~30%.

---

## Шаг 1. Подготовка в AWS Console (15 минут)

> Регион в правом верхнем углу — **EU (Frankfurt) eu-central-1**.

### 1.1 Создать ключ SSH

`EC2 → Network & Security → Key Pairs → Create key pair`

- Name: `legalhub-demo`
- Type: `RSA`
- Format: `.pem` (для macOS/Linux) или `.ppk` (Windows + PuTTY)

Скачается файл `legalhub-demo.pem`. Сохраните его в `~/.ssh/` и сразу:

```bash
chmod 400 ~/.ssh/legalhub-demo.pem
```

### 1.2 Создать Security Group

`EC2 → Network & Security → Security Groups → Create security group`

- Name: `legalhub-demo-sg`
- VPC: default

**Inbound rules**:

| Type | Protocol | Port | Source | Description |
|---|---|---|---|---|
| SSH | TCP | 22 | **My IP** | Доступ для администрирования |
| HTTP | TCP | 80 | 0.0.0.0/0 | Редирект на HTTPS + ACME challenge |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Основной трафик |

> Ничего больше не открывайте. Postgres / Redis / 8001-8004 видны только внутри docker-сети.

**Outbound rules** — оставить default (`All traffic` → `0.0.0.0/0`).

### 1.3 Запустить EC2-инстанс

`EC2 → Instances → Launch instances`

| Параметр | Значение |
|---|---|
| Name | `legalhub-demo` |
| AMI | **Amazon Linux 2023** (бесплатнее обновления) |
| Architecture | x86_64 |
| Instance type | **t3.medium** (минимум для билда фронта + 4 микросервисов) |
| Key pair | `legalhub-demo` (созданный выше) |
| Network → Security group | выбрать существующий → `legalhub-demo-sg` |
| Storage | 1 × **30 GB gp3** |

`Launch instance`. Подождите 1-2 минуты, пока статус не станет `Running` / `2/2 checks passed`.

### 1.4 Закрепить публичный IP (Elastic IP)

Чтобы IP не менялся после reboot:

`EC2 → Elastic IPs → Allocate Elastic IP address` → `Allocate`.

Затем у созданного EIP: `Actions → Associate Elastic IP address` → выбрать инстанс `legalhub-demo`.

Запишите этот IP — он понадобится дальше. Допустим, это `3.72.10.15`.

---

## Шаг 2. Подключение к серверу

```bash
ssh -i ~/.ssh/legalhub-demo.pem ec2-user@3.72.10.15
```

При первом подключении подтвердите fingerprint (`yes`).

---

## Шаг 3. Bootstrap сервера (5 минут)

На самом сервере:

```bash
sudo dnf install -y git
sudo mkdir -p /opt/legalhub
sudo chown ec2-user:ec2-user /opt/legalhub

git clone https://github.com/<ВАШ_ORG>/legalhub-project-ktz.git /opt/legalhub/app
cd /opt/legalhub/app

sudo bash deploy/aws/setup.sh
```

**Вместо `git clone`** (если репозиторий ещё не на GitHub или нужна точная копия вашей локальной копии):

на своём Mac из корня проекта выполните:

```bash
chmod +x deploy/aws/sync-from-mac.sh
./deploy/aws/sync-from-mac.sh <ваш_Elastic_IP>
```

Ключ по умолчанию берётся из `~/Downloads/legalhub-demo.pem`. После rsync подключитесь по SSH и выполните `sudo bash deploy/aws/setup.sh`, затем шаги с `.env.prod`.

Скрипт `setup.sh` поставит Docker + compose plugin, добавит ec2-user в группу `docker`, поднимет 4 GB swap, настроит автообновления.

После `setup.sh` **разлогинитесь и зайдите снова**, чтобы группа `docker` подхватилась:

```bash
exit
ssh -i ~/.ssh/legalhub-demo.pem ec2-user@3.72.10.15
docker version   # должно работать без sudo
```

---

## Шаг 4. Настроить секреты `.env.prod`

```bash
cd /opt/legalhub/app/deploy/aws
cp .env.prod.example .env.prod

# Сгенерировать сильные секреты разом:
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "INTERNAL_API_KEY=$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
```

Откройте `.env.prod` в `vim` или `nano` и заполните:

```ini
POSTGRES_USER=legalhub
POSTGRES_PASSWORD=<вставьте_сгенерированный>
POSTGRES_DB=legalhub

JWT_SECRET=<сгенерированный_hex32>
INTERNAL_API_KEY=<сгенерированный_hex24>

# nip.io даёт реальный домен под IP бесплатно — Let's Encrypt сразу выдаст сертификат.
LEGALHUB_DOMAIN=3-72-10-15.nip.io
LETS_ENCRYPT_EMAIL=admin@ktzh.kz

CORS_ORIGINS=https://3-72-10-15.nip.io
```

> Когда у вас появится реальный домен — измените `LEGALHUB_DOMAIN` и `CORS_ORIGINS`, перезапустите Caddy:
> `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d caddy`.

---

## Шаг 5. Запуск стенда

```bash
cd /opt/legalhub/app/deploy/aws
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Первая сборка ~3-5 минут. Следить:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=50 caddy
```

Caddy сам пройдёт ACME-challenge и поднимет HTTPS. После `successfully obtained certificate` открывайте в браузере:

```
https://3-72-10-15.nip.io
```

Должна появиться страница входа LegalHUB.

---

## Шаг 6. Создать админа и наполнить демо-данными

Поскольку `RELAX_AUTH=false` в проде, нужно создать первого пользователя руками — IAM-сидер сделает это автоматически при старте, если БД пустая.

Проверим, что сидер создал директора:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec svc-iam python -c "
import asyncio, sys
from sqlalchemy import select
from app.db.session import async_engine
from app.models import User
async def main():
    async with async_engine.connect() as c:
        rows = (await c.execute(select(User.email, User.role))).all()
        for r in rows: print(r)
asyncio.run(main())
"
```

Дефолтные креды демо-сидера:

| Email | Пароль | Роль |
|---|---|---|
| `director@company.kz` | `legalhub123` | director |
| `chief@company.kz`    | `legalhub123` | chief_lawyer |
| `kasymov@company.kz`  | `legalhub123` | branch_lawyer |

> **Сразу зайдите как директор и смените пароли** через `Настройки → Пользователи` (это та функциональность, которую мы уже реализовали).

### Импорт PIR-демо данных (опционально)

Если хотите загрузить тот же набор из 188 дел, что и локально:

```bash
# С локальной машины скопируйте Excel-шаблон на сервер:
scp -i ~/.ssh/legalhub-demo.pem \
  "Копия Отчет ПИР за 2025г .xlsx" \
  ec2-user@3.72.10.15:/opt/legalhub/app/

# На сервере:
docker compose -f /opt/legalhub/app/deploy/aws/docker-compose.prod.yml \
  --env-file /opt/legalhub/app/deploy/aws/.env.prod \
  exec svc-legal python /app/scripts/import_pir_demo_from_xlsx.py \
    --xlsx "/Копия Отчет ПИР за 2025г .xlsx"
```

(Точный путь и флаги — смотрите в `backend/scripts/import_pir_demo_from_xlsx.py`.)

---

## Шаг 7. Бэкапы

```bash
sudo cp /opt/legalhub/app/deploy/aws/backup.sh /usr/local/bin/legalhub-backup
sudo chmod +x /usr/local/bin/legalhub-backup

# Прогнать вручную, проверить что отрабатывает:
sudo POSTGRES_USER=legalhub POSTGRES_DB=legalhub /usr/local/bin/legalhub-backup

# Cron: каждый день в 03:00 UTC.
echo "0 3 * * * root POSTGRES_USER=legalhub POSTGRES_DB=legalhub /usr/local/bin/legalhub-backup >> /var/log/legalhub-backup.log 2>&1" \
  | sudo tee /etc/cron.d/legalhub-backup
```

Дампы лежат в `/opt/legalhub/backups/legalhub-<дата>.sql.gz`, ротация автоматом — 7 последних дней.

> **Production**: складывайте бэкапы в S3. Минимум: создать bucket `legalhub-backups-<acc>`, дать EC2 IAM-роль с `s3:PutObject` на этот bucket и в конце `backup.sh` добавить `aws s3 cp "$OUT" s3://legalhub-backups-<acc>/`.

---

## Эксплуатация

| Что нужно | Команда |
|---|---|
| Логи всех сервисов | `docker compose -f docker-compose.prod.yml logs -f --tail=100` |
| Логи одного сервиса | `docker compose -f docker-compose.prod.yml logs -f svc-legal` |
| Рестарт одного | `docker compose -f docker-compose.prod.yml restart svc-legal` |
| Применить новую версию | `git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` |
| Откат | `git checkout <prev-sha> && ... up -d --build` |
| Войти в shell контейнера | `docker compose -f docker-compose.prod.yml exec svc-legal bash` |
| Запустить миграцию вручную | `docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate` |
| Подключиться к БД | `docker compose -f docker-compose.prod.yml exec db psql -U legalhub` |

Размер свободного места:

```bash
df -h /opt/legalhub
docker system df
```

Если место кончается — `docker image prune -af` уберёт старые слои сборок.

---

## Чек-лист безопасности перед демо заказчику

- [ ] В Security Group SSH (22) доступен **только с IP администраторов**, не с `0.0.0.0/0`.
- [ ] В `.env.prod` НЕ остались дефолтные значения. Файл в `.gitignore`.
- [ ] Сменили пароль у `director@company.kz` через UI.
- [ ] Удалили или деактивировали лишних seed-юзеров через UI «Настройки → Пользователи».
- [ ] HTTPS живой: `curl -I https://<домен>` возвращает `200 OK` с валидным сертификатом.
- [ ] `docker compose ps` все сервисы в `Up (healthy)` или `Up`.
- [ ] Cron бэкапа создал хотя бы один файл.
- [ ] Включён CloudWatch billing alert (Console → Billing → Budgets) — чтобы не получить сюрприз в счёте.

---

## Расширение в дальнейшем (когда понадобится)

| Задача | Решение |
|---|---|
| Своё имя домена (`legalhub.ktz.kz`) | Route 53 → A-запись на Elastic IP. В `.env.prod` поменять `LEGALHUB_DOMAIN` и `CORS_ORIGINS`, перезапустить Caddy. |
| Postgres вынести из контейнера | RDS PostgreSQL 15 (db.t4g.small) → поменять `DATABASE_URL` в `.env.prod`, удалить сервис `db` из compose, мигрировать дампом. |
| Redis отдельно | ElastiCache Redis 7. Аналогично — поменять `REDIS_URL`, удалить сервис. |
| HA / Multi-AZ | Перейти на ECS Fargate / EKS, см. готовые манифесты в `deploy/k8s/`. |
| Мониторинг | Запустить `docker-compose.obs.yml` (Prometheus + OTel collector + Grafana) рядом, либо подключить CloudWatch agent. |
| Хранилище экспортов | S3 bucket + IAM-роль на EC2; переменные `S3_BUCKET`, `S3_ENDPOINT_URL` уже поддержаны бекендом. |
