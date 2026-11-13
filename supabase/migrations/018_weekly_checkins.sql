-- 018 -> Saved weekly progress check-ins (one per week).
-- Stores the durable metric snapshot plus the AI's progress score and report,
-- so the user can look back at past weeks and see the score trend over time.

create table if not exists weekly_checkins (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_start       date not null,
  weight_delta_kg  numeric(6,2),
  avg_calories     integer,
  avg_protein_g    numeric(6,1),
  activity_min     integer,
  rating           integer not null check (rating between 1 and 5),
  rating_label     text not null default '',
  note             text,
  report           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_checkins_user_idx on weekly_checkins (user_id, week_start);

alter table weekly_checkins enable row level security;

drop policy if exists "weekly_checkins_all_own" on weekly_checkins;
create policy "weekly_checkins_all_own" on weekly_checkins
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on weekly_checkins to authenticated;
