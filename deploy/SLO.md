# SLO / SLI (LegalHUB)

Рекомендуемые целевые показатели для тысяч пользователей:

| SLI | SLO (цель) | Измерение |
|-----|--------------|-----------|
| Доступность API (2xx/все) | 99.9% / 30 дней | Prometheus `legalhub_http_requests_total` |
| Latency p99 чтения списка дел | &lt; 500 ms | Histogram `legalhub_http_request_duration_seconds` |
| Ошибки 5xx | &lt; 0.1% RPS | По меткам status |

Алерты: Grafana на p99, error rate, Redis down, Postgres connections, outbox backlog (`outbox_events` с `published_at IS NULL`).
