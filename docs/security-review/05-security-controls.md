# Меры защиты

| Контроль | Статус | Реализация или действие |
|---|---|---|
| HTTPS | Реализовано в deploy-конфиге | Caddy, TLS-сертификат |
| Ограничение внешних IP | Реализовано в deploy-конфиге | `SITE_ALLOWED_IPS` |
| Защита cookie | Реализовано | Production не запускается без `COOKIE_SECURE=true` |
| Запрет слабых секретов | Реализовано | Production guard для JWT и internal key |
| Отключение demo seed | Реализовано | Seed только opt-in, в production запрещён |
| RBAC мутаций | Реализовано | Read-only роль не изменяет претензии и дедлайны |
| Ограничение login | Реализовано на edge | nginx: rate limit по IP |
| Публичный internal API | Закрыто на edge | nginx возвращает `404` |
| Readiness | Реализовано | `/readyz` проверяет PostgreSQL и Redis |
| Ротация логов | Реализовано в Compose | Docker logging driver `local`, лимиты размера |
| Антивирус файлов | До включения файлов | Требуется при добавлении загрузки документов |
| MFA или SSO | На согласование | Решение владельца системы и ИБ |
