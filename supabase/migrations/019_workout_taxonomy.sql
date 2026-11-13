-- 019 — Simpler workout taxonomy: cardio / strength / mobility / other, plus a
-- self-reported "how you feel" field.
--
-- The old activity_type enum (walking/running/cycling/strength/sports/other)
-- was derived from a free-text name. The new log form asks for an explicit
-- category and a type, so the enum collapses to four obvious buckets. Legacy
-- rows are mapped losslessly:
--   walking / running / cycling / sports  ->  cardio
--   strength                             ->  strength
--   anything else                        ->  other
--
-- Additive and idempotent (safe to re-run).

-- ── activities ──────────────────────────────────────────────────────────
alter table activities drop constraint if exists activities_activity_type_check;

update activities
  set activity_type = case activity_type
    when 'walking' then 'cardio'
    when 'running' then 'cardio'
    when 'cycling' then 'cardio'
    when 'sports' then 'cardio'
    when 'strength' then 'strength'
    else 'other'
  end;

alter table activities add constraint activities_activity_type_check
  check (activity_type in ('cardio', 'strength', 'mobility', 'other'));

-- ── How the workout felt afterwards ────────────────────────────────────
alter table activities add column if not exists feel text;
alter table activities drop constraint if exists activities_feel_check;
alter table activities add constraint activities_feel_check
  check (feel is null or feel in ('great', 'good', 'okay', 'tired', 'sore'));

-- ── activity_plans ─────────────────────────────────────────────────────
-- This table only exists when the group-plans migration (011) was applied, so
-- guard it instead of failing when it's absent.
do $$
begin
  if to_regclass('public.activity_plans') is not null then
    alter table activity_plans
      drop constraint if exists activity_plans_activity_type_check;

    update activity_plans
      set activity_type = case activity_type
        when 'walking' then 'cardio'
        when 'running' then 'cardio'
        when 'cycling' then 'cardio'
        when 'sports' then 'cardio'
        when 'strength' then 'strength'
        else 'other'
      end;

    alter table activity_plans add constraint activity_plans_activity_type_check
      check (activity_type in ('cardio', 'strength', 'mobility', 'other'));
  end if;
end
$$;
