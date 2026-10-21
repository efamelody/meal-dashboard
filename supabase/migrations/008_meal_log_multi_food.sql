-- 008 -> Meal log: allow more than one food per meal slot.
-- The `meal_log_user_date_type_key` unique constraint made every slot a
-- single row, which capped a meal at one food. Each row is now one food item
-- and `id` identifies it; rows for the same (user_id, date, meal_type) belong
-- to the same slot. Existing rows are already single-food rows, so no data
-- backfill is required. Additive and idempotent (safe to re-run).
-- Run once in the Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run.

alter table meal_log drop constraint if exists meal_log_user_date_type_key;

alter table meal_log add column if not exists sort_order int not null default 0;

create index if not exists meal_log_user_date_type_idx
  on meal_log (user_id, date, meal_type);
