# LegalHUB Backend (FastAPI)

Python **3.12+**. REST API under `/api/v1`, internal integrations under `/api/internal`.

## Docker (рекомендуется: всё сразу)

Из **корня репозитория** (без `npm run dev` / Vite):

```bash
docker compose up -d --build
```

Сервис **`migrate`** один раз выполняет `alembic upgrade head`; микросервисы только поднимают uvicorn (без гонки миграций). Nginx в `web` резолвит имена через `127.0.0.11`, чтобы после пересоздания контейнеров не оставались «битые» upstream-IP.

- **UI:** http://127.0.0.1:8080/ — статика React + **nginx как edge**: `/api/*` маршрутизируется на микросервисы по префиксу (см. `docker/nginx-spa.conf`).
- **Redis:** `redis://redis:6379/0` — кэш, blacklist refresh JWT, transactional outbox → stream `legalhub:case_events`.
- **Наблюдаемость:** `GET /metrics` (Prometheus), JSON-логи (`LOG_JSON=true`), опционально OTLP (`OTEL_EXPORTER_OTLP_ENDPOINT`). Пример стека: `docker compose -f docker-compose.yml -f docker-compose.obs.yml up -d`.
- **Контракты API:** `cd backend && PYTHONPATH=. python scripts/export_openapi.py` → `contracts/openapi/*.openapi.json` (см. [contracts/README.md](contracts/README.md)).
- **Разделение БД (опционально):** [../deploy/DATABASE_SPLIT.md](../deploy/DATABASE_SPLIT.md), пример `docker-compose.micro-advanced.yml`.
- **Микросервисы (порты хоста для Swagger и отладки):**
  - `svc-legal` (дела, филиалы, дашборд, `/api/internal`) — http://127.0.0.1:8002/docs
  - `svc-iam` (auth, users) — http://127.0.0.1:8001/docs
  - `svc-workspace` (notifications, audit) — http://127.0.0.1:8003/docs
  - `svc-reporting` (reports, ПИР Excel) — http://127.0.0.1:8004/docs
- Код: общая фабрика `app/factory.py`, точки входа `app/entrypoints/*.py`; **монолит** для локальной разработки остаётся `app.main:app` (один процесс, все маршруты).

Vite в этом сценарии **не нужен**; для HMR: `cd ../frontend && npm run dev` (по умолчанию прокси на монолит `:8000`; при необходимости — `VITE_API_MICRO=true` и четыре процесса `uvicorn app.entrypoints.*`).

---

## Quick start (local)

1. Start PostgreSQL (from repo root):

   ```bash
   docker compose up -d db
   ```

2. Configure environment:

   ```bash
   cd backend
   cp .env.example .env
   ```

   Adjust `DATABASE_URL` if needed (default matches `docker-compose.yml`).

3. Create virtualenv, install dependencies, run migrations:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   ```

4. Run API:

   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Тесты ПИР / выгрузки Excel** (без поднятого API, нужен только шаблон `templates/pir_report_2025_template.xlsx`):

   ```bash
   cd backend
   pip install -r requirements.txt
   PYTHONPATH=. pytest tests/test_pir_excel_export.py -v
   ```

6. **Frontend dev**: in the Vite app (`frontend/`), `fetch("/api/v1/...")` is proxied to this server (see `frontend/vite.config.ts`).

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Async URL, e.g. `postgresql+asyncpg://legalhub:legalhub@127.0.0.1:5432/legalhub` |
| `IAM_DATABASE_URL` | Optional separate DB for IAM (`svc-iam`); enables `create_iam_tables_if_needed` + identity seed. |
| `WORKSPACE_DATABASE_URL` | Optional separate DB for workspace (hooks in `app.db.workspace_session`). |
| `LEGAL_DATABASE_URL` | Optional separate DB / replica for legal core (`app.db.legal_read_session`). |
| `JWT_SECRET` | HS256 secret for access/refresh JWT |
| `INTERNAL_API_KEY` | Value for header `X-Internal-Key` on `/api/internal/*` |
| `REDIS_URL` | e.g. `redis://127.0.0.1:6379/0` — refresh blacklist, outbox→stream, optional dashboard cache. |
| `LOG_JSON` | `true` for structured JSON logs to stdout. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | e.g. `otel-collector:4317` — distributed tracing (gRPC). |
| `S3_ENDPOINT_URL`, `S3_BUCKET`, `AWS_*` | Optional: duplicate PIR exports to S3 (`X-Export-Storage` response header). |
| `RELAX_AUTH` | If `true`, requests act as `director@company.kz` without `Authorization` (local only). |
| `AUTO_DDL` | If `true`, creates tables on startup via SQLAlchemy `create_all` (dev convenience). Use `false` in production and rely on **Alembic** only. |

### Default users (after seed)

Password for all: **`legalhub123`**

- `director@company.kz` — director (all branches)
- `kasymov@company.kz` — branch lawyer, Северный
- `nurlanova@company.kz` — branch lawyer, Южный
- `akhmetov@company.kz` — branch lawyer, Центральный (филиал)
- `accountant@company.kz` — accountant (read-only mutations blocked at router when implemented)

## API contract (frontend)

`GET /api/v1/cases` returns a JSON array of objects shaped like **`LegalCase`** in `frontend/src/data/mockData.ts` (types; sample rows mirror `frontend/src/data/offlineMockData.ts` / `backend/demo/demo_dataset.json`, camelCase, including `companyBIN`).

OpenAPI: **http://127.0.0.1:8000/docs**

## Отчёт ПИР (Excel по шаблону КТЖ)

- **Шаблон:** `backend/templates/pir_report_2025_template.xlsx` — официальный бланк (листы, объединения ячеек, стили). При обновлении формы со стороны КТЖ замените файл в этом пути.
- **Выгрузка:** `GET /api/v1/reports/pir.xlsx?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` — ответ: файл Excel. Учитываются права доступа к филиалам как у списка дел. В аудит пишется событие выгрузки.
- **Данные:** строки собираются из `cases` / `case_finances`, текстовые поля инстанций — из `case_litigation`, исполнительное производство — из `enforcement_proceedings`, дебиторка — из `debt_recovery_entries` (см. эндпоинты под `/api/v1/cases/{id}/...`).
- **Зависимость:** `openpyxl` (см. `requirements.txt`).
- **Запись в файл:** в зоне строк данных на листах **истец / ответчик / 3-лицо** и вспомогательных листах перед очисткой и записью **снимаются только объединения ячеек, начинающиеся с первой строки данных** (иначе openpyxl не даёт писать в `MergedCell`). Шапки выше этой строки и их merge **не меняются**. Поэтому число `merged_cells` на листе «истец»/«ответчик» после выгрузки может быть **меньше**, чем в исходном шаблоне, — это ожидаемо.
- **Тесты:** `PYTHONPATH=. pytest tests/test_pir_excel_export.py -v` — проверяют наличие шаблона, совпадение шапок с оригиналом при пустой выгрузке, корректность строк по синтетическому делу и сверку структуры с шаблоном.
- **Опциональный импорт демо-строк из файла:** `python scripts/import_pir_demo_from_xlsx.py --xlsx templates/pir_report_2025_template.xlsx --limit 3` (из каталога `backend/` с активированным venv).

## Auth

- `POST /api/v1/auth/login` — body `{ "email", "password" }`; JSON `{ "access_token", "token_type" }` and **HttpOnly** cookie `refresh_token` (path `/api/v1/auth`).
- `POST /api/v1/auth/refresh` — sends cookie; **rotates** refresh server-side (`refresh_tokens` table: old row `revoked_at`, new `jti`); returns new `access_token`.

## Internal / 1C-style payments

`POST /api/internal/payments/sync` with header `X-Internal-Key: <INTERNAL_API_KEY>`.

Idempotency key: `document_number` + `payer_bin` + calendar day of `payment_date` (table `internal_sync_dedupe`).

## `paid_amount` strategy

`case_finances.paid_amount` is **materialized**: on each payment insert/sync, `recalculate_paid_amount()` sets it to `SUM(payments.amount)` for that case in the same transaction.

## Dashboard Redis keys

- Stats: `legalhub:dashboard:stats:v1:{userId}:{hash(role+id)}` — TTL **300s** (5 min).
- Charts: `legalhub:dashboard:charts:v1:{userId}:{hash}` — TTL **300s**.

Keys include **user id** so privileged users never share cache with branch-scoped users.

## AWS deployment (outline)

- **RDS PostgreSQL** (Multi-AZ) — same schema as Alembic migrations.
- **ElastiCache Redis** — set `REDIS_URL`; optional in dev.
- **ECS Fargate** or **EKS** — run `uvicorn` (or gunicorn+uvicorn workers) behind **ALB**; terminate TLS at ALB.
- **Secrets Manager** — `JWT_SECRET`, `INTERNAL_API_KEY`, DB credentials.
- **EventBridge + SQS/Lambda** — replace in-process cron for deadline checks / archival (see ТЗ).
- **S3** — document storage (MinIO-compatible); presigned uploads; virus scan before accept (ClamAV sidecar or managed alternative).

Production: `RELAX_AUTH=false`, `AUTO_DDL=false`, strong `JWT_SECRET`, HTTPS-only cookies (`secure=True`).
