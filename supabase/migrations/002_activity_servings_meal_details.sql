-- 002 — Activity tracking, plan servings, profile activity target, meal details.
-- Additive and idempotent (safe to re-run). Run in the Supabase SQL Editor
-- or with psql against the project database.

-- ── Meal plan: per-slot servings (ingredient demand scales with this) ──
alter table meal_plan add column if not exists servings integer not null default 1;
alter table meal_plan drop constraint if exists meal_plan_servings_check;
alter table meal_plan add constraint meal_plan_servings_check check (servings > 0);

-- ── Fitness profile: user-selected daily activity target (minutes) ─────
alter table user_profiles add column if not exists daily_activity_min integer not null default 0;
alter table user_profiles drop constraint if exists user_profiles_daily_activity_min_check;
alter table user_profiles add constraint user_profiles_daily_activity_min_check check (daily_activity_min >= 0);

-- ── Meals: optional recipe detail fields ───────────────────────────────
alter table meals add column if not exists description text;
alter table meals add column if not exists prep_time_min integer;
alter table meals add column if not exists instructions text;
alter table meals drop constraint if exists meals_prep_time_min_check;
alter table meals add constraint meals_prep_time_min_check check (prep_time_min is null or prep_time_min >= 0);

-- ── Activities: manual planned/completed sessions ──────────────────────
create table if not exists activities (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  date           date not null,
  activity_type  text not null check (activity_type in ('walking','running','cycling','strength','sports','other')),
  duration_min   integer not null check (duration_min > 0),
  status         text not null default 'planned' check (status in ('planned','completed')),
  scheduled_time text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists activities_user_date_idx on activities (user_id, date);

alter table activities enable row level security;

drop policy if exists "activities_all_own" on activities;
create policy "activities_all_own" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on activities to authenticated;
