# LUNA для CapRover: одно приложение = сайт + API + бот + напоминания.
# Любой упавший тест останавливает сборку — на сервере остаётся прежняя рабочая версия.

# 1. Сборка приложения (Vite)
FROM node:20-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build

# 2. Сервер (FastAPI + aiogram), он же отдаёт собранное приложение
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    STATIC_DIR=/app/static
WORKDIR /app
COPY server/requirements.txt server/requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY server/app ./app
COPY server/tests ./tests
RUN python -m pytest -q -p no:warnings && rm -rf tests .pytest_cache && pip uninstall -y -q pytest
COPY --from=web /app/dist ./static
EXPOSE 80
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80", "--proxy-headers", "--forwarded-allow-ips", "*"]
