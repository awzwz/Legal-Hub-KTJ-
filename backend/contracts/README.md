# OpenAPI артефакты

Генерация из кода:

```bash
cd backend && PYTHONPATH=. python scripts/export_openapi.py
```

Файлы появляются в `contracts/openapi/*.openapi.json`. Их можно проверять в CI (diff) или подключать к Pact / Spectral.
