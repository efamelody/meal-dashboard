-- 014 -> Store the user's structured check-up baseline separately from fitness targets.

create table if not exists health_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table health_profiles enable row level security;

drop policy if exists "health_profiles_all_own" on health_profiles;
create policy "health_profiles_all_own" on health_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on health_profiles to authenticated;
