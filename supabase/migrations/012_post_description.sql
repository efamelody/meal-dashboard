-- 012 — Add an optional description (headline) to community posts.
-- Additive and idempotent (safe to re-run).

alter table posts add column if not exists description text not null default '';
