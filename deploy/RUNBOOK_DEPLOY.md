# Runbook: деплой и откат

## Деплой микросервиса

1. Сборка образа с тегом semver.
2. `alembic upgrade head` Job (один под, до success).
3. Rolling update Deployment (maxUnavailable 0, maxSurge 1).
4. Проверка `/readyz` и smoke-тест `/api/v1/branches`.

## Откат

1. `kubectl rollout undo deployment/legalhub-legal`.
2. При необходимости `alembic downgrade` отдельным Job (только если миграция обратима).

## Инциденты

- **Redis недоступен**: outbox копится в Postgres; включите Redis — dispatcher догонит. Уведомления по stream временно не создаются.
- **502 на edge**: проверить `kubectl get pods`, логи nginx ingress, цепочку до `svc-legal`.
