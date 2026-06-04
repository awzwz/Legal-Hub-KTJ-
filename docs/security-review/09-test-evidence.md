# Подтверждения проверок

Дата фиксации результатов: 2026-06-01.

## Выполнено

| Проверка | Результат |
|---|---|
| Публичный TLS тестового стенда | Успешно |
| API без токена | Возвращает `401` |
| Frontend production build | Успешно |
| Frontend lint | Успешно без ошибок, остаются warnings |
| Vitest | Успешно, включая генерацию XLSX и защиту Excel-выгрузки от formula injection |
| Frontend dependencies | Уязвимый `xlsx` удалён, `postcss` обновлён; повторить сетевой `npm audit --omit=dev` в CI |
| Backend unit pytest в Python 3.12 container | Успешно, `25 passed` |
| Backend pytest без тяжёлых Excel-тестов | Успешно, `34 passed` |
| Backend ruff | Успешно |
| Backend integration pytest | Успешно, `9 passed`, включая RBAC |
| `/readyz` с PostgreSQL и Redis | Успешно, HTTP `200`, обе зависимости `ok` |
| nginx config test | Успешно |
| Python compileall | Успешно |
| AWS/on-premise Compose parse | Успешно |
| Shell syntax backup и setup scripts | Успешно |

## Требует выполнения перед пилотом

- Проверка `/readyz` в целевом контуре.
- Restore drill из внешней резервной копии.
- Нагрузочный тест основных сценариев на `20/50/100` параллельных пользователей.
- Проверка конфигурации firewall и сканирование доступных портов из пользовательской подсети.

## Известные ограничения проверки

Локальная машина использует Python 3.14, а закреплённые backend-зависимости рассчитаны на Python
3.12. Поэтому backend pytest выполнен в контейнере Python 3.12; CI должен использовать тот же runtime.
