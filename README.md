# Lexica — интервальное повторение английских слов

Веб-приложение в стиле Anki: карточки «слово → перевод», импорт колод и
повторение по алгоритму **FSRS** (тот самый, что стал штатным планировщиком Anki).

## Возможности

- 🔐 Авторизация (email + пароль) на **Supabase Auth**
- 🗂️ Колоды: создание, переименование, удаление
- 📥 Импорт карточек: пачкой (вставка текста), загрузкой CSV/TSV и по одной
- 🧠 Повторение по **FSRS** (`ts-fsrs`): оценки Снова / Трудно / Хорошо / Легко,
  карточки в стадии заучивания возвращаются в текущую сессию
- 📊 Статистика: распределение слов (выучено / средне / плохо / изучается / новые),
  метрики и график повторений за неделю

## Технологии

Next.js 16 (App Router) · TypeScript · Supabase (Auth + Postgres) ·
ts-fsrs · Tailwind CSS v4 · shadcn/ui · Recharts

## Настройка

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor → New query**, вставьте содержимое
   [`supabase/schema.sql`](./supabase/schema.sql) и нажмите **Run** (создаст
   таблицы `decks`, `cards`, `review_logs` и политики RLS).
3. (Для удобного теста) **Authentication → Sign In / Providers → Email** →
   выключите **Confirm email**, чтобы входить сразу после регистрации.
4. Скопируйте из **Project Settings → API**:
   - `Project URL`
   - `anon` / `publishable` ключ

### 2. Переменные окружения

```bash
cp .env.local.example .env.local
```

Заполните `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-или-publishable-ключ>
```

### 3. Запуск

```bash
pnpm install
pnpm dev
```

Откройте <http://localhost:3000>.

## Как пользоваться

1. Зарегистрируйтесь → войдите.
2. **Колоды → Новая колода**.
3. Откройте колоду → **Импорт слов**. Вставьте список, по строке на карточку:
   ```
   apple - яблоко
   to run — бежать
   serendipity	случайная удача
   book; книга
   ```
   Разделитель определяется автоматически (`таб`, ` - `, ` — `, `;`, `|`, `,`).
   Либо загрузите CSV/TSV, либо добавьте карточку вручную на вкладке «По одной».
4. **Учить** — показывайте перевод (`Пробел`) и оценивайте память клавишами
   `1`–`4`. Интервалы рассчитывает FSRS.
5. **Статистика** — следите за прогрессом.

## Структура

```
src/
  app/
    (app)/            # защищённые страницы: dashboard, decks, study
    actions/          # server actions: decks, cards, review
    login, signup     # авторизация
  components/         # UI (shadcn) + экраны
  lib/
    fsrs.ts           # обёртка ts-fsrs (расписание, превью интервалов)
    import-parse.ts   # парсер импорта «слово — перевод»
    stats.ts          # корзины запоминания и метрики
    supabase/         # клиенты Supabase (server/client/proxy)
  proxy.ts            # обновление сессии + защита маршрутов (Next 16)
supabase/schema.sql   # схема БД + RLS
```

## Алгоритм

Используется [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) — для
каждой карточки хранится состояние памяти (`stability`, `difficulty`, `state`,
`due` и т.д.). После оценки `ts-fsrs` пересчитывает дату следующего показа, а
история пишется в `review_logs` для статистики.
