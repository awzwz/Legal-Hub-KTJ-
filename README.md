# LegalHUB КТЖ

**LegalHUB КТЖ** — это современная корпоративная веб-система для управления судебными делами АО «НК «КТЖ». Приложение предназначено для юристов, директоров филиалов и бухгалтеров, предоставляя мощный и удобный инструмент для отслеживания судебных процессов, аналитики, контроля исполнительных производств и работы с документами.

## Особенности системы (Features)

- 📊 **Интерактивный Дашборд**: Наглядная аналитика, финансовые показатели (суммы исков, штрафы, представительские расходы, оплаты) с графиками и диаграммами.
- 🗂 **Управление судебными делами**: Полный цикл судебного дела — от регистрации иска до исполнительного производства и закрытия.
- 💼 **Детализированные карточки дел**: Трекинг статусов, ролей, исходов, а также блок работы с документами и финансовым балансом.
- 👥 **Ролевая модель и доступ**: Разграничение доступа по филиалам и центральному аппарату.
- 📉 **Умная выгрузка отчетов (Excel)**: Экспорт данных с учетом строго заданного периода (с поддержкой пресетов: Месяц, Квартал, Год).
- **Данные из API**: при обычном запуске дела, уведомления, аудит и заявки на отчёты загружаются из PostgreSQL; при недоступности API показывается уведомление, без скрытого перехода на статические моки.

## Технологический стек

- **Core**: React 18, TypeScript, Vite
- **Стилизация**: Tailwind CSS, shadcn/ui (Radix UI)
- **Иконки & Анимации**: Lucide React, Framer Motion
- **Работа с формами**: React Hook Form + Zod
- **API & Состояние**: TanStack Query (React Query)
- **Утилиты**: date-fns (Даты), Recharts (Графики)

## Структура проекта

- `frontend/` — SPA (React, Vite): `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/data/`, `frontend/src/hooks/`.
- `backend/app/entrypoints/` — точки входа **микросервисов** (Docker: отдельный `uvicorn` на домен); `app/main.py` — монолит для локальной разработки.

## Запуск приложения

Убедитесь, что у вас установлен Node.js (рекомендуется v18+).

1. **Установка зависимостей**
   ```bash
   cd frontend && npm install
   ```

2. **Запуск в режиме разработки**
   ```bash
   cd frontend && npm run dev
   ```

3. **Сборка для продакшена**
   ```bash
   cd frontend && npm run build
   ```

### Docker Compose

Полный стек из корня репозитория:

```bash
docker compose up -d --build
```

После изменений в **`frontend/`** или **`backend/`** обязательно пересобирайте образы (`--build` при `up` или отдельно `docker compose build`). Иначе контейнер `web` продолжит отдавать старый Vite-бандл, а сервисы `svc-*` — старый Python-код. Только SPA: `docker compose build web && docker compose up -d web`.

### Офлайн-демо (`VITE_FORCE_MOCK=true`)

В `.env`:

```env
VITE_FORCE_MOCK=true
```

SPA не запрашивает дела с API: используется набор из `frontend/src/data/offlineMockData.ts`, переключатель пользователей — из `frontend/src/data/offlineUsers.ts`. Без этой переменной источник правды — бэкенд; при ошибке сети список дел пустой и показывается toast.

Эталон для сида БД: `backend/demo/demo_dataset.json` (перегенерация: `python backend/scripts/extract_demo_json.py`, читает `frontend/src/data/offlineMockData.ts`).

### Backend: переменные окружения

Минимально:

| Переменная | Назначение | Пример |
| --- | --- | --- |
| `ENV` | `dev` / `staging` / `production`. В `production` валидация настроек жёсткая. | `production` |
| `DATABASE_URL` | Async URL Postgres. | `postgresql+asyncpg://user:pass@host/db` |
| `IAM_DATABASE_URL` / `LEGAL_DATABASE_URL` / `WORKSPACE_DATABASE_URL` | Опционально, для разделения доменов. | пусто → используется `DATABASE_URL` |
| `REDIS_URL` | Для blacklist refresh-токенов и кэша. | `redis://redis:6379/0` |
| `JWT_SECRET` | Подпись JWT. **Обязателен** в проде. | `$(openssl rand -hex 32)` |
| `INTERNAL_API_KEY` | Заголовок `X-Internal-Key` для интеграций (1С). | случайная строка |
| `RELAX_AUTH` | dev-режим без токена. Запрещён при `ENV=production`. | `false` |
| `AUTO_DDL` | Создавать таблицы на старте. Запрещён при `ENV=production`. | `false` |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | Атрибуты refresh-cookie. На HTTPS-проде — `true` / `strict`. | `true` / `strict` |
| `CORS_ORIGINS` | Список origin'ов через запятую. | `https://app.example.kz` |

### Backend: миграции и запуск

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload  # монолит для dev
```

В Docker миграции выполняет отдельный сервис `migrate` (см. `docker-compose.yml`).

### Backend: тесты

```bash
cd backend
pytest -q
```

### Relax-auth и `X-Dev-User-Email`

При `RELAX_AUTH=true` на API можно вызывать эндпоинты без JWT. Выбранный в UI пользователь хранится в `localStorage` под ключом из `USER_STORAGE_KEY` в `mockData.ts`; `apiAuthHeaders()` добавляет **`X-Dev-User-Email`**, чтобы бэкенд сопоставил запрос с тем же пользователем.

### Только JWT

Если сохранён `legalhub_access_token` (логин `POST /api/v1/auth/login`), профиль берётся из **`GET /api/v1/auth/me`**, переключатель ролей не используется.
**Maxot Sariyev**
