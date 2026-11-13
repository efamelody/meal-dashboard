-- 016 -> Shared household pantry: households + household_members + inventory.household_id.
-- Additive and idempotent. Run in the Supabase SQL editor.
-- One household per user (enforced by a unique index) so "my pantry" is unambiguous.

-- ── Households ─────────────────────────────────────────────────────────
create table if not exists households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Membership: one row per (household, user) ─────────────────────────
create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Each user belongs to at most one household.
create unique index if not exists household_members_user_uniq
  on household_members (user_id);

-- ── Inventory becomes household-scoped (nullable for personal rows) ───
alter table inventory add column if not exists household_id uuid references households(id) on delete set null;
create index if not exists inventory_household_idx on inventory (household_id);

-- ── RLS helpers (security definer so policies don't recurse) ──────────
create or replace function is_household_member(h uuid, u uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = h and user_id = u
  );
$$;

create or replace function household_owner(h uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select created_by from households where id = h;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────
alter table households enable row level security;
alter table household_members enable row level security;

drop policy if exists "households_select_member" on households;
create policy "households_select_member" on households
  for select to authenticated
  using (is_household_member(id, auth.uid()));

drop policy if exists "households_insert_creator" on households;
create policy "households_insert_creator" on households
  for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "households_update_member" on households;
create policy "households_update_member" on households
  for update to authenticated
  using (is_household_member(id, auth.uid()))
  with check (is_household_member(id, auth.uid()));

drop policy if exists "households_delete_owner" on households;
create policy "households_delete_owner" on households
  for delete to authenticated
  using (auth.uid() = created_by);

drop policy if exists "household_members_select_member" on household_members;
create policy "household_members_select_member" on household_members
  for select to authenticated
  using (is_household_member(household_id, auth.uid()));

-- Members can be added three ways: the owner adds a friend, a friend
-- self-joins via a share link, or the creator registers themselves.
drop policy if exists "household_members_insert_member" on household_members;
create policy "household_members_insert_member" on household_members
  for insert to authenticated
  with check (
    (is_household_member(household_id, auth.uid()) and are_friends(auth.uid(), user_id))
    or (auth.uid() = user_id and are_friends(auth.uid(), household_owner(household_id)))
    or (auth.uid() = user_id and household_owner(household_id) = auth.uid())
  );

-- A member can leave; the owner can remove any member.
drop policy if exists "household_members_delete_member" on household_members;
create policy "household_members_delete_member" on household_members
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from household_members hm
      where hm.household_id = household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- Replace the per-user inventory policy with household scoping.
-- Personal rows (household_id null) stay private to their owner.
drop policy if exists "inventory_all_own" on inventory;
drop policy if exists "inventory_via_household" on inventory;
create policy "inventory_via_household" on inventory
  for all to authenticated
  using (
    (household_id is not null and is_household_member(household_id, auth.uid()))
    or (household_id is null and user_id = auth.uid())
  )
  with check (
    (household_id is not null and is_household_member(household_id, auth.uid()))
    or (household_id is null and user_id = auth.uid())
  );

-- ── Grants ────────────────────────────────────────────────────────────
grant select, insert, update, delete on households to authenticated;
grant select, insert, update, delete on household_members to authenticated;
grant execute on function is_household_member(uuid, uuid) to authenticated;
grant execute on function household_owner(uuid) to authenticated;
