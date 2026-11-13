-- 015 -> Meal log: keep the health-baseline flags the AI attached to each food
-- so logged items stay flagged on the dashboard and progress pages.
-- Additive and idempotent. Run in the Supabase SQL editor.

alter table meal_log add column if not exists flag_level text;
alter table meal_log add column if not exists flag_reason text;
