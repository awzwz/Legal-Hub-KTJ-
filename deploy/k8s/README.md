# Kubernetes (пример для legal-core)

Примеры манифестов для продакшена: отдельный Deployment на сервис, Service, HPA, отдельный ConfigMap для PgBouncer.

## Порядок

1. Создайте namespace `legalhub-prod`.
2. Секреты: `kubectl create secret generic legalhub-secrets --from-env-file=...` (`DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `INTERNAL_API_KEY`).
3. Примените `deployment-legal.yaml`, `service-legal.yaml`, `hpa-legal.yaml`.
4. PgBouncer: `pgbouncer-configmap.yaml` + Deployment sidecar или отдельный сервис перед Postgres.

## Миграции

Запускайте `alembic upgrade head` **одним** Job с `ttlSecondsAfterFinished` и аннотацией `helm.sh/hook-weight` при Helm, либо initContainer с `restartPolicy: Never` и проверкой лидер-лока.

## SLO (кратко)

См. [SLO.md](SLO.md). Целевые p99 API read &lt; 500 ms, доступность 99.9%.
