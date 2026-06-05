<div align="center">

# 📚 Lexica

**Учите английские слова по науке — интервальное повторение в стиле Anki, прямо в браузере.**

Карточки «слово → перевод», импорт целых колод за секунды и планировщик
**FSRS** — тот самый алгоритм, что стал штатным в Anki. Плюс озвучка,
тренировка в обе стороны, режим ввода и автоматический контекст слова.

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)
![FSRS](https://img.shields.io/badge/FSRS-ts--fsrs-8B5CF6)

</div>

---

## Зачем это нужно

Зубрить списки слов неэффективно: половина забывается к следующему дню.
**Интервальное повторение** показывает слово ровно тогда, когда вы вот-вот его
забудете, — так в памяти остаётся максимум при минимуме повторений. Lexica
берёт на себя расписание (FSRS) и даёт удобный цикл «вставил список → учишь →
видишь прогресс». В комплекте уже лежит готовая колода на **3000 самых нужных
слов** с уклоном в IT — можно начать за минуту.

## Возможности

**Учёба**
- 🧠 Планировщик **FSRS** (`ts-fsrs`): оценки *Снова / Трудно / Хорошо / Легко*,
  карточки в заучивании возвращаются в текущую сессию
- 🔊 **Озвучка слова** (Web Speech API) — автопроизношение + кнопка повтора
- 🔁 **Направление на выбор**: EN→RU, RU→EN или микс (стабильно по карточке)
- ⌨️ **Режим ввода**: печатаете перевод, проверка учитывает синонимы
- 📝 **Контекст слова**: транскрипция и пример предложения подтягиваются
  автоматически из открытого словаря и кэшируются
- ⚡ Мгновенный переход между карточками (оптимистичный, без ожидания сети)

**Колоды и карточки**
- 🗂️ Колоды: создание, переименование, удаление
- 📥 Импорт: вставкой текста, загрузкой **CSV/TSV** или по одной; авто-определение
  разделителя и дедупликация
- ✏️ Поиск, инлайн-редактирование и удаление карточек
- 📦 Готовая колода [`public/3000-most-used-eng.csv`](./public/3000-most-used-eng.csv)

**Аккаунт и данные**
- 🔐 Авторизация email + пароль на **Supabase Auth**, подтверждение почты и
  **сброс пароля**
- 🛡️ Row Level Security: каждый пользователь видит только свои данные
- 📊 Статистика: распределение слов (выучено / средне / плохо / изучается / новые)
  и график повторений за неделю

## Технологии

**Next.js 16** (App Router, Server Actions) · **React 19** · **TypeScript** ·
**Supabase** (Auth + Postgres + RLS) · **ts-fsrs** · **Tailwind CSS v4** ·
**shadcn/ui** (Radix) · **Recharts** · React Hook Form + Zod · Papa Parse

## Быстрый старт

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → вставьте [`supabase/schema.sql`](./supabase/schema.sql)
   и нажмите **Run** (создаст таблицы `decks`, `cards`, `review_logs`, колонки
   контекста слова и политики RLS — запускать можно повторно).
3. Чтобы recovery- и confirm-ссылки работали, в **Authentication → Emails**
   замените `{{ .ConfirmationURL }}` на
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}`.
4. Для быстрого теста можно выключить **Confirm email**
   (*Authentication → Sign In / Providers → Email*).
5. Скопируйте из **Project Settings → API**: `Project URL` и `anon`-ключ.

### 2. Переменные окружения

```bash
cp .env.local.example .env.local
```

```dotenv
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

1. Зарегистрируйтесь и войдите.
2. **Колоды → Новая колода**, затем откройте её → **Импорт слов**.
   Вставьте список (по строке на карточку) или загрузите CSV/TSV:
   ```
   apple - яблоко
   to run — бежать
   serendipity	случайная удача
   book; книга
   ```
   Разделитель определяется сам (`таб`, ` - `, ` — `, `;`, `|`, `,`).
   Можно сразу взять готовый файл на 3000 слов из `public/`.
3. **Учить** — пробелом показываете ответ, клавишами `1`–`4` оцениваете память.
   В панели сессии переключаются направление, режим ввода и звук.
4. **Статистика** — следите за прогрессом.

## Структура

```
src/
  app/
    (app)/              # защищённые страницы: dashboard, decks, study
    actions/            # server actions: decks, cards, review, context
    auth/, login,       # авторизация, подтверждение и сброс пароля
    forgot-password,
    reset-password
  components/           # UI (shadcn) + экраны (study-session, cards-list, …)
  lib/
    fsrs.ts             # обёртка ts-fsrs (расписание, превью интервалов)
    import-parse.ts     # парсер импорта «слово — перевод»
    answer-check.ts     # проверка ответа в режиме ввода
    tts.ts              # озвучка через Web Speech API
    stats.ts            # корзины запоминания и метрики
    supabase/           # клиенты Supabase + fetchAll (обход лимита 1000 строк)
  proxy.ts              # обновление сессии + защита маршрутов (Next 16)
scripts/                # генератор словаря (vocab_data.txt → CSV)
supabase/schema.sql     # схема БД + RLS
```

## Как работает алгоритм

Для каждой карточки хранится состояние памяти FSRS
(`stability`, `difficulty`, `state`, `due` …). После оценки
[`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) пересчитывает дату
следующего показа, а событие пишется в `review_logs` — на этих данных строится
статистика. Расчёт идёт и на клиенте (мгновенный переход), и на сервере
(источник истины), по одному и тому же алгоритму.

---

<div align="center">
<sub>Учебный pet-проект. PR и идеи приветствуются.</sub>
</div>
