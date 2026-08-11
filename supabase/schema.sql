-- Meal Dashboard schema for Supabase
-- Run this once in the Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run.
-- Note: the `create type ... as enum` lines fail on a second run; everything else is
-- safe to re-run after dropping the enums if you ever need to recreate.

-- ── Enums ──────────────────────────────────────────────────────────────
create type meal_type as enum ('Breakfast', 'Lunch', 'Dinner', 'Snack');

-- ── Meals ──────────────────────────────────────────────────────────────
create table meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  calories   integer      not null default 0 check (calories >= 0),
  protein_g  numeric(8,2) not null default 0 check (protein_g >= 0),
  carbs_g    numeric(8,2) not null default 0 check (carbs_g >= 0),
  fat_g      numeric(8,2) not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

-- ── Meal ingredients (child of meals) ─────────────────────────────────
create table meal_ingredients (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references meals (id) on delete cascade,
  item_name  text not null,
  quantity   numeric(8,2) not null default 0 check (quantity >= 0),
  unit       text not null default 'g'
);

-- ── Inventory ──────────────────────────────────────────────────────────
create table inventory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  item_name    text not null,
  quantity     numeric(8,2) check (quantity >= 0),
  unit         text,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low', 'out')),
  created_at   timestamptz not null default now()
);

-- ── Meal plan (one row per date x meal-type slot) ─────────────────────
create table meal_plan (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  date                    date not null,
  meal_type               meal_type   not null,
  meal_id                 uuid references meals (id) on delete set null,
  google_calendar_event_id text, -- future Google Calendar sync hook
  created_at              timestamptz not null default now(),
  unique (user_id, date, meal_type)
);

-- ── Grocery list (one list per week, regenerated wholesale) ───────────
create table grocery_list (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  week_start date not null default (date_trunc('week', current_date)::date),
  item_name  text not null,
  quantity   numeric(8,2) not null default 0 check (quantity >= 0),
  unit       text not null default 'g',
  is_bought  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Fitness profile (one row per user; recommendation recomputed on save) ─
create table user_profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  age                  integer not null check (age between 10 and 120),
  sex                  text not null check (sex in ('male', 'female')),
  height_cm            numeric(5,1) not null check (height_cm > 0),
  weight_kg            numeric(5,1) not null check (weight_kg > 0),
  goal                 text not null check (goal in ('lose', 'maintain', 'build')),
  activity_level       text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  bmr_kcal             numeric(8,1) not null default 0,
  tdee_kcal            numeric(8,1) not null default 0,
  daily_calorie_target integer not null default 0,
  protein_g_target     numeric(8,1) not null default 0,
  carbs_g_target       numeric(8,1) not null default 0,
  fat_g_target         numeric(8,1) not null default 0,
  ai_notes             text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────
create index meals_user_id_idx            on meals (user_id);
create index meal_ingredients_meal_id_idx on meal_ingredients (meal_id);
create index inventory_user_id_idx        on inventory (user_id);
create index meal_plan_user_id_idx        on meal_plan (user_id);
create index meal_plan_user_date_idx      on meal_plan (user_id, date);
create index grocery_list_user_id_idx     on grocery_list (user_id);
create index grocery_list_user_week_idx   on grocery_list (user_id, week_start);

-- ── Row Level Security (per-user) ─────────────────────────────────────
alter table meals           enable row level security;
alter table meal_ingredients enable row level security;
alter table inventory       enable row level security;
alter table meal_plan       enable row level security;
alter table grocery_list    enable row level security;
alter table user_profiles   enable row level security;

create policy "meals_all_own" on meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ingredients_via_meal_owner" on meal_ingredients
  for all using (
    exists (select 1 from meals m where m.id = meal_ingredients.meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from meals m where m.id = meal_ingredients.meal_id and m.user_id = auth.uid())
  );

create policy "inventory_all_own" on inventory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_plan_all_own" on meal_plan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "grocery_all_own" on grocery_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_profiles_all_own" on user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Grants (the browser app uses the anon key now, not the service-role key) ──
-- The anon key respects Postgres grants + RLS; RLS still limits every role to
-- its own rows (auth.uid() = user_id), so `authenticated` can touch all tables.
-- `anon` gets nothing: login goes through Supabase Auth, never these tables.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
