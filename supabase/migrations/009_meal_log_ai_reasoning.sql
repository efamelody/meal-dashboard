-- 009 -> Meal log: keep the AI's reasoning and the user's correction.
-- A photo log only carried the four numbers, so a wrong estimate could not be
-- explained or challenged. Each food row now keeps what the AI thought it saw
-- (dish, portion, justification, confidence) and what the user said about it.
-- Additive and idempotent (safe to re-run).
-- Run once in the Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run.

alter table meal_log add column if not exists ai_dish text;
alter table meal_log add column if not exists ai_portion text;
alter table meal_log add column if not exists ai_justification text;
alter table meal_log add column if not exists ai_confidence text;
alter table meal_log add column if not exists user_correction text;
alter table meal_log add column if not exists source text;

alter table meal_log drop constraint if exists meal_log_source_check;
alter table meal_log add constraint meal_log_source_check
  check (source is null or source in ('ai', 'corrected', 'manual'));

alter table meal_log drop constraint if exists meal_log_ai_confidence_check;
alter table meal_log add constraint meal_log_ai_confidence_check
  check (ai_confidence is null or ai_confidence in ('low', 'medium', 'high'));
