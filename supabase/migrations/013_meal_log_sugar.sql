-- 013 -> Meal log: preserve sugar estimates so daily sugar context can be calculated.
-- Additive and idempotent. Run in the Supabase SQL editor.

alter table meal_log add column if not exists sugar_g numeric not null default 0;
