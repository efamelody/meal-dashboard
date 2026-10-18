-- 004 — Distinguish plan-derived grocery rows from user-added manual rows
-- so regenerating from the meal plan never erases manual entries.
-- Additive and idempotent (safe to re-run).

alter table grocery_list add column if not exists source text not null default 'plan';
alter table grocery_list drop constraint if exists grocery_list_source_check;
alter table grocery_list add constraint grocery_list_source_check
  check (source in ('plan', 'manual'));
