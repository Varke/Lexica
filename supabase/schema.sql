-- ============================================================================
-- Gymex Anki — схема БД для интервального повторения (FSRS)
-- Выполнить ОДИН РАЗ в Supabase: Dashboard → SQL Editor → New query → Run.
-- Безопасно запускать повторно (idempotent).
-- ============================================================================

-- Расширение для gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Колоды
-- ----------------------------------------------------------------------------
create table if not exists public.decks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Карточки (слово/перевод + состояние FSRS)
-- state: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
-- ----------------------------------------------------------------------------
create table if not exists public.cards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references public.decks (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  front          text not null,                       -- слово (англ.)
  back           text not null,                       -- перевод
  -- поля планировщика FSRS
  due            timestamptz not null default now(),
  stability      double precision not null default 0,
  difficulty     double precision not null default 0,
  elapsed_days   integer not null default 0,
  scheduled_days integer not null default 0,
  reps           integer not null default 0,
  lapses         integer not null default 0,
  learning_steps integer not null default 0,
  state          smallint not null default 0,
  last_review    timestamptz,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Журнал повторений (для статистики и графиков)
-- ----------------------------------------------------------------------------
create table if not exists public.review_logs (
  id                uuid primary key default gen_random_uuid(),
  card_id           uuid not null references public.cards (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  rating            smallint not null,                 -- 1 Again, 2 Hard, 3 Good, 4 Easy
  state             smallint not null,
  due               timestamptz not null,
  stability         double precision not null,
  difficulty        double precision not null,
  elapsed_days      integer not null,
  last_elapsed_days integer not null,
  scheduled_days    integer not null,
  learning_steps    integer not null default 0,
  review            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Индексы
-- ----------------------------------------------------------------------------
create index if not exists idx_decks_user        on public.decks (user_id);
create index if not exists idx_cards_user_deck    on public.cards (user_id, deck_id);
create index if not exists idx_cards_user_due     on public.cards (user_id, due);
create index if not exists idx_review_user_review on public.review_logs (user_id, review);

-- ----------------------------------------------------------------------------
-- Row Level Security: каждый пользователь видит только свои данные
-- ----------------------------------------------------------------------------
alter table public.decks       enable row level security;
alter table public.cards       enable row level security;
alter table public.review_logs enable row level security;

-- decks
drop policy if exists "decks_select" on public.decks;
drop policy if exists "decks_insert" on public.decks;
drop policy if exists "decks_update" on public.decks;
drop policy if exists "decks_delete" on public.decks;
create policy "decks_select" on public.decks for select using (auth.uid() = user_id);
create policy "decks_insert" on public.decks for insert with check (auth.uid() = user_id);
create policy "decks_update" on public.decks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decks_delete" on public.decks for delete using (auth.uid() = user_id);

-- cards
drop policy if exists "cards_select" on public.cards;
drop policy if exists "cards_insert" on public.cards;
drop policy if exists "cards_update" on public.cards;
drop policy if exists "cards_delete" on public.cards;
create policy "cards_select" on public.cards for select using (auth.uid() = user_id);
create policy "cards_insert" on public.cards for insert with check (auth.uid() = user_id);
create policy "cards_update" on public.cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cards_delete" on public.cards for delete using (auth.uid() = user_id);

-- review_logs
drop policy if exists "review_logs_select" on public.review_logs;
drop policy if exists "review_logs_insert" on public.review_logs;
create policy "review_logs_select" on public.review_logs for select using (auth.uid() = user_id);
create policy "review_logs_insert" on public.review_logs for insert with check (auth.uid() = user_id);
