-- 017 -> Weigh-in history so weekly progress can measure real weight change.
-- Additive and idempotent. Run in the Supabase SQL editor.

create table if not exists weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5,1) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists weight_logs_user_date_idx on weight_logs (user_id, date);

alter table weight_logs enable row level security;

drop policy if exists "weight_logs_all_own" on weight_logs;
create policy "weight_logs_all_own" on weight_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on weight_logs to authenticated;
