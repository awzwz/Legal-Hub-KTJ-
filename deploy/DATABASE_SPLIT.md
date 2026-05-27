# Разделение БД (IAM / Workspace / Legal)

Скрипт `docker/postgres-init/01-databases.sh` при **первом** создании тома Postgres создаёт БД `legalhub_iam`, `legalhub_workspace`, `legalhub_legal`.

## Переменные

| Переменная | Назначение |
|------------|------------|
| `IAM_DATABASE_URL` | Отдельная БД для `app.entrypoints.iam` (пользователи, refresh). Включите `bootstrap_iam_tables` + сид через `app.domain.iam_seed`. |
| `WORKSPACE_DATABASE_URL` | Отдельная БД для уведомлений/аудита; используйте `app.db.workspace_session.get_workspace_db` в роутерах после переноса таблиц. |
| `LEGAL_DATABASE_URL` | Отдельная БД дел; `app.db.legal_read_session.get_legal_db` для read-модели / реплики. |

## Синхронизация пользователей в IAM

При включении отдельной IAM БД данные пользователей в основной БД `legalhub` не копируются автоматически. Варианты: одноразовый `pg_dump -t users ... | psql legalhub_iam`, либо собственный ETL. После копирования выставьте `IAM_DATABASE_URL` для `svc-iam` и **не** запускайте на IAM полный `alembic` со всей схемой — используйте `create_iam_tables_if_needed` (см. `app/db/iam_session.py`) или отдельную цепочку миграций.

## FK cases → users

Миграция `011_drop_lawyer_fk` снимает FK `assigned_lawyer_id` для подготовки к автономной legal_db.
