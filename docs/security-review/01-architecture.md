# Архитектура

## Границы системы

Первый промышленный запуск планируется на одном on-premise сервере в защищённом контуре.
Отказоустойчивость уровня нескольких физических узлов не заявляется. Внешний доступ разрешается
только через корпоративную сеть или VPN.

```mermaid
flowchart LR
    U[Пользователь] -->|HTTPS 443| C[Caddy]
    C --> W[nginx + frontend]
    W --> I[IAM API]
    W --> L[Legal API]
    W --> R[Reporting API]
    W --> S[Workspace API]
    I --> P[(PostgreSQL)]
    L --> P
    R --> P
    S --> P
    L --> Q[(Redis)]
    S --> Q
    M[Prometheus] --> E[Exporters и /metrics]
    G[Grafana] --> M
    A[Alertmanager] --> N[Уведомления]
```

## Планируемые дополнения перед промышленным запуском

- PgBouncer между API и PostgreSQL после настройки и нагрузочного теста.
- Prometheus, Grafana, Alertmanager, node-exporter, cAdvisor, postgres-exporter, redis-exporter.
- Выделенное объектное хранилище при включении загрузки файлов.
- Внешняя резервная копия за пределами основного сервера.
