# LUNA — Telegram Mini App (трекер цикла)

Текущий этап: **фронтенд-конструктор** (только русский язык, без Telegram, без backend).
Данные временно хранятся в `localStorage` браузера через единый слой `src/store/useLunaStore.ts` —
при подключении backend меняется только он.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173 (и адрес в локальной сети — открыть с телефона)
npm test         # юнит-тесты движка цикла
npm run build    # production-сборка в dist/
```

В профиле есть кнопка «Заполнить демо-данными» (только в dev-режиме).

## Структура

- `src/features/cycle/engine.ts` — расчёт цикла и прогнозы (медиана + диапазон, без ML), тесты рядом
- `src/features/insights/rules.ts` — инсайты на правилах
- `src/features/analytics/stats.ts` — статистика для экрана аналитики
- `src/content/articles.ts` — статьи (медицинская проверка текстов не проводилась)
- `src/i18n/ru.ts` — все строки интерфейса
- `src/components/art` — SVG-заглушки иллюстраций (заменить на картинки из `public/art/`)
- `src/pages` — экраны

## Дальше

1. Иллюстрации: лотос, цветы (сейчас SVG-заглушки).
2. Backend (FastAPI + PostgreSQL) и авторизация через Telegram initData.
3. Telegram-бот: /start, кнопка открытия, напоминания.
4. Деплой.
