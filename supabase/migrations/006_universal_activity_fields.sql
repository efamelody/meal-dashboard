-- 006 — Universal activity logging: free-text name, distance, intensity,
-- details, and an explicit share marker.
--
-- Why this migration is needed: the form in src/pages/ActivityLogPage.tsx lets
-- people log *any* activity (swimming, hiking, badminton, yoga …). The existing
-- `activities` table only stores a fixed category (walking/running/cycling/
-- strength/sports/other) plus duration/notes, which cannot hold a specific
-- activity name, distance, intensity, or whether the user chose to share it.
--
-- Additive and idempotent (safe to re-run). Run in the Supabase SQL Editor
-- or with psql against the project database. Until it is applied the app keeps
-- working: src/lib/db.ts falls back to the legacy columns and folds the extra
-- values into `notes`.

-- Specific activity name as typed by the user (e.g. "Badminton", "Open-water swim").
alter table activities add column if not exists name text;

-- Optional distance. No unit conversion is done here — the app stores km.
alter table activities add column if not exists distance_km numeric;
alter table activities drop constraint if exists activities_distance_km_check;
alter table activities add constraint activities_distance_km_check
  check (distance_km is null or distance_km >= 0);

-- Self-reported effort. 'unknown' means the user (or the description) did not
-- say — the app must not invent an intensity.
alter table activities add column if not exists intensity text;
alter table activities drop constraint if exists activities_intensity_check;
alter table activities add constraint activities_intensity_check
  check (intensity is null or intensity in ('easy','moderate','vigorous','unknown'));

-- Context-specific specifics: laps, elevation, exercises/sets/reps, etc.
alter table activities add column if not exists details text;

-- Set only when the user explicitly chose to share this record. Activities are
-- private by default, so null means private.
alter table activities add column if not exists shared_at timestamptz;
