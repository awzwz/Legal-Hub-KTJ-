FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
# Демо-набор для seed (app/services/demo_seed.py → /app/demo/demo_dataset.json)
COPY demo ./demo
# PIR Excel template (see app/services/pir_excel_fill.py → /app/templates/...)
COPY templates ./templates
COPY scripts ./scripts

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DATABASE_URL=postgresql+asyncpg://legalhub:legalhub@db:5432/legalhub \
    RELAX_AUTH=true \
    AUTO_DDL=false \
    JWT_SECRET=docker-dev-only-change-me \
    INTERNAL_API_KEY=docker-internal-key \
    CORS_ORIGINS=http://127.0.0.1:8080,http://localhost:8080

EXPOSE 8000

CMD sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
