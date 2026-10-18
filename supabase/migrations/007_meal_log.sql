-- 007 — Meal log: what the user actually ate, keyed (user_id, date, meal_type).
-- Moves the log out of per-device localStorage so it follows the account
-- across devices. Additive and idempotent (safe to re-run).
-- Run once in the Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run.

create table if not exists meal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null
    check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  food text not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_log_user_date_type_key unique (user_id, date, meal_type)
);

create index if not exists meal_log_user_date_idx on meal_log (user_id, date);

-- ── RLS
alter table meal_log enable row level security;

drop policy if exists "meal_log_select_own" on meal_log;
create policy "meal_log_select_own" on meal_log
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "meal_log_insert_own" on meal_log;
create policy "meal_log_insert_own" on meal_log
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "meal_log_update_own" on meal_log;
create policy "meal_log_update_own" on meal_log
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meal_log_delete_own" on meal_log;
create policy "meal_log_delete_own" on meal_log
  for delete to authenticated using (auth.uid() = user_id);
