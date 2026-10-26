-- 011 — Group activity plans: friends plan activities together with RSVPs.
-- Additive and idempotent (safe to re-run).

-- ── Plans ──────────────────────────────────────────────────────────────
create table if not exists activity_plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  activity_type text not null default 'other'
    check (activity_type in ('walking', 'running', 'cycling', 'strength', 'sports', 'other')),
  plan_date date not null,
  plan_time text,
  location text,
  details text,
  duration_min integer not null default 60 check (duration_min >= 1),
  created_at timestamptz not null default now()
);

-- ── Participants (creator + invited friends) ──────────────────────────
create table if not exists plan_participants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references activity_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rsvp text not null default 'invited'
    check (rsvp in ('invited', 'going', 'maybe', 'declined')),
  activity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

-- ── Plan discussion ────────────────────────────────────────────────────
create table if not exists plan_comments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references activity_plans(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_plans_creator_idx on activity_plans (creator_id, plan_date);
create index if not exists plan_participants_plan_idx on plan_participants (plan_id);
create index if not exists plan_participants_user_idx on plan_participants (user_id);
create index if not exists plan_comments_plan_idx on plan_comments (plan_id, created_at);

-- ── Visibility helper: is `u` the creator of or a participant in `p`? ──
-- security definer so selecting participants inside policies doesn't recurse
-- through RLS; owner (postgres) bypasses RLS, search_path pinned.
create or replace function is_plan_member(p uuid, u uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from activity_plans pl
    where pl.id = p and pl.creator_id = u
  ) or exists (
    select 1 from plan_participants pp
    where pp.plan_id = p and pp.user_id = u
  );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────
alter table activity_plans enable row level security;
alter table plan_participants enable row level security;
alter table plan_comments enable row level security;

drop policy if exists "activity_plans_select_member" on activity_plans;
create policy "activity_plans_select_member" on activity_plans
  for select to authenticated
  using (is_plan_member(id, auth.uid()));

drop policy if exists "activity_plans_insert_own" on activity_plans;
create policy "activity_plans_insert_own" on activity_plans
  for insert to authenticated
  with check (auth.uid() = creator_id);

drop policy if exists "activity_plans_update_creator" on activity_plans;
create policy "activity_plans_update_creator" on activity_plans
  for update to authenticated
  using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists "activity_plans_delete_creator" on activity_plans;
create policy "activity_plans_delete_creator" on activity_plans
  for delete to authenticated using (auth.uid() = creator_id);

drop policy if exists "plan_participants_select_member" on plan_participants;
create policy "plan_participants_select_member" on plan_participants
  for select to authenticated
  using (is_plan_member(plan_id, auth.uid()));

-- Only the plan creator invites people.
drop policy if exists "plan_participants_insert_creator" on plan_participants;
create policy "plan_participants_insert_creator" on plan_participants
  for insert to authenticated
  with check (
    exists (select 1 from activity_plans p where p.id = plan_id and p.creator_id = auth.uid())
  );

-- Each user updates their own RSVP (and the synced activity id).
drop policy if exists "plan_participants_update_own" on plan_participants;
create policy "plan_participants_update_own" on plan_participants
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A user can leave; the creator can remove anyone.
drop policy if exists "plan_participants_delete_involved" on plan_participants;
create policy "plan_participants_delete_involved" on plan_participants
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from activity_plans p where p.id = plan_id and p.creator_id = auth.uid())
  );

drop policy if exists "plan_comments_select_member" on plan_comments;
create policy "plan_comments_select_member" on plan_comments
  for select to authenticated
  using (is_plan_member(plan_id, auth.uid()));

drop policy if exists "plan_comments_insert_member" on plan_comments;
create policy "plan_comments_insert_member" on plan_comments
  for insert to authenticated
  with check (auth.uid() = author_id and is_plan_member(plan_id, auth.uid()));

drop policy if exists "plan_comments_delete_own" on plan_comments;
create policy "plan_comments_delete_own" on plan_comments
  for delete to authenticated using (auth.uid() = author_id);

-- ── Grants ─────────────────────────────────────────────────────────────
grant select, insert, update, delete
  on activity_plans, plan_participants, plan_comments
  to authenticated;
grant execute on function is_plan_member(uuid, uuid) to authenticated;
