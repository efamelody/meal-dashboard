-- 005 — Community: public profiles, friend connections, and the shared feed.
-- Additive and idempotent (safe to re-run).

-- ── Public profiles (lightweight, separate from the private health profile)
create table if not exists app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  handle text not null unique,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Friend requests: requester → addressee, accepted by addressee
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_uniq
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- ── Feed posts: a text update or a snapshot of a meal/recipe/activity
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('meal', 'recipe', 'activity', 'update')),
  content text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ── Indexes for feed / lookup paths
create index if not exists posts_author_created_idx on posts (author_id, created_at desc);
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists friendships_addressee_idx on friendships (addressee_id, status);
create index if not exists friendships_requester_idx on friendships (requester_id, status);
create index if not exists post_likes_user_idx on post_likes (user_id);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);

-- ── Friendship check used inside visibility policies.
-- security definer so selecting friendships inside policies doesn't recurse
-- through RLS; owner (postgres) bypasses RLS, search_path pinned.
create or replace function are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ── RLS
alter table app_profiles enable row level security;
alter table friendships enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;

drop policy if exists "app_profiles_select_all" on app_profiles;
create policy "app_profiles_select_all" on app_profiles
  for select to authenticated using (true);

drop policy if exists "app_profiles_insert_own" on app_profiles;
create policy "app_profiles_insert_own" on app_profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "app_profiles_update_own" on app_profiles;
create policy "app_profiles_update_own" on app_profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "app_profiles_delete_own" on app_profiles;
create policy "app_profiles_delete_own" on app_profiles
  for delete to authenticated using (auth.uid() = id);

drop policy if exists "friendships_select_involved" on friendships;
create policy "friendships_select_involved" on friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert_own" on friendships;
create policy "friendships_insert_own" on friendships
  for insert to authenticated
  with check (auth.uid() = requester_id);

-- Only the addressee can accept/decline (update the status).
drop policy if exists "friendships_update_addressee" on friendships;
create policy "friendships_update_addressee" on friendships
  for update to authenticated
  using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

-- Either side can cancel/remove (delete the row).
drop policy if exists "friendships_delete_involved" on friendships;
create policy "friendships_delete_involved" on friendships
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "posts_select_visible" on posts;
create policy "posts_select_visible" on posts
  for select to authenticated
  using (auth.uid() = author_id or are_friends(auth.uid(), author_id));

drop policy if exists "posts_insert_own" on posts;
create policy "posts_insert_own" on posts
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "posts_update_own" on posts;
create policy "posts_update_own" on posts
  for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on posts;
create policy "posts_delete_own" on posts
  for delete to authenticated using (auth.uid() = author_id);

drop policy if exists "post_likes_select_visible" on post_likes;
create policy "post_likes_select_visible" on post_likes
  for select to authenticated
  using (exists (
    select 1 from posts p
    where p.id = post_id
      and (p.author_id = auth.uid() or are_friends(auth.uid(), p.author_id))
  ));

drop policy if exists "post_likes_insert_own" on post_likes;
create policy "post_likes_insert_own" on post_likes
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "post_likes_delete_own" on post_likes;
create policy "post_likes_delete_own" on post_likes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "post_comments_select_visible" on post_comments;
create policy "post_comments_select_visible" on post_comments
  for select to authenticated
  using (exists (
    select 1 from posts p
    where p.id = post_id
      and (p.author_id = auth.uid() or are_friends(auth.uid(), p.author_id))
  ));

drop policy if exists "post_comments_insert_own" on post_comments;
create policy "post_comments_insert_own" on post_comments
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "post_comments_delete_own" on post_comments;
create policy "post_comments_delete_own" on post_comments
  for delete to authenticated using (auth.uid() = author_id);

-- ── Grants (explicit; harmless if defaults already cover them)
grant select, insert, update, delete
  on app_profiles, friendships, posts, post_likes, post_comments
  to authenticated;
grant execute on function are_friends(uuid, uuid) to authenticated;
