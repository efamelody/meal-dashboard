-- Week-aware meal plan + per-week grocery lists.
-- Run this once in the Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run.
-- Existing meal_plan rows are backfilled into the current (Monday-start) week.
-- Hardened to be re-runnable: every step is guarded so a partial previous run
-- resumes instead of failing.

-- ── meal_plan: replace day_of_week with a concrete date ─────────────────
alter table meal_plan add column if not exists date date;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'meal_plan'
      and column_name = 'day_of_week'
  ) then
    update meal_plan
    set date = date_trunc('week', current_date)::date
      + case day_of_week::text
          when 'Mon' then 0
          when 'Tue' then 1
          when 'Wed' then 2
          when 'Thu' then 3
          when 'Fri' then 4
          when 'Sat' then 5
          when 'Sun' then 6
        end;

    alter table meal_plan alter column date set not null;
    -- Dropping day_of_week also drops the unique constraint that depends on it.
    alter table meal_plan drop constraint if exists meal_plan_user_id_day_of_week_meal_type_key;
    alter table meal_plan drop column day_of_week;
  end if;
end $$;

alter table meal_plan drop constraint if exists meal_plan_user_date_type_key;
alter table meal_plan add constraint meal_plan_user_date_type_key
  unique (user_id, date, meal_type);

create index if not exists meal_plan_user_date_idx on meal_plan (user_id, date);

-- Hook for future Google Calendar sync (nullable, unused for now).
alter table meal_plan add column if not exists google_calendar_event_id text;

-- ── grocery_list: scope rows to a week ──────────────────────────────────
alter table grocery_list add column if not exists week_start date
  not null default (date_trunc('week', current_date)::date);

create index if not exists grocery_list_user_week_idx on grocery_list (user_id, week_start);

-- ── Optional cleanup (safe once the day_of_week column is gone) ─────────
-- drop type day_of_week;
