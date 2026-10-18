-- 003 — Restore RLS policies that schema.sql defines but that were missing
-- on this database (inventory, meal_plan, grocery_list had RLS enabled with
-- no policy, so authenticated users could read/write none of their rows).
-- Additive and idempotent (safe to re-run).

drop policy if exists "inventory_all_own" on inventory;
create policy "inventory_all_own" on inventory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meal_plan_all_own" on meal_plan;
create policy "meal_plan_all_own" on meal_plan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "grocery_all_own" on grocery_list;
create policy "grocery_all_own" on grocery_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
