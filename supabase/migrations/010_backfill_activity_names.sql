-- 010 — Backfill legacy activity rows whose name / distance / intensity were
-- folded into `notes` while migration 006 was missing.
--
-- While 006 was not applied, src/lib/db.ts wrote these fields into `notes` as:
--
--   "Name · 5 km · moderate\n<details>\n<notes>"
--
-- so nothing the user typed was lost. Migration 006 added the real columns but
-- did not move existing values across — this migration does that.
--
-- Scope is deliberately narrow and safe:
--   * only rows where `name` is still empty (idempotent — safe to re-run);
--   * only rows whose first line uses the packed " · " separator *and* carries
--     a recognisable "N km" or easy/moderate/vigorous marker, so free-form
--     notes are never mistaken for an activity name;
--   * generic placeholders ("Sports", "Other", …) are not written into `name`.
--
-- Rows with a bare name and no distance/intensity marker (e.g. notes =
-- "Swimming") are intentionally left untouched: in SQL they are
-- indistinguishable from a free-form note, and the app already recovers them
-- at read time via unpackLegacyActivityNotes() in src/lib/db.ts.

with legacy as (
  select
    id,
    notes,
    btrim(split_part(notes, E'\n', 1)) as head,
    case
      when strpos(notes, E'\n') > 0
        then nullif(btrim(substring(notes from strpos(notes, E'\n') + 1)), '')
      else null
    end as body,
    regexp_split_to_array(
      btrim(split_part(notes, E'\n', 1)),
      E'\\s*·\\s*'
    ) as parts
  from activities
  where (name is null or name = '')
    and notes is not null
    and strpos(split_part(notes, E'\n', 1), '·') > 0
),
unpacked as (
  select
    l.id,
    btrim(l.parts[1]) as name_candidate,
    (
      select (regexp_match(btrim(t.part), E'^(\\d+(?:[.,]\\d+)?)\\s*km$', 'i'))[1]
      from unnest(l.parts[2:array_length(l.parts, 1)]) with ordinality as t(part, ord)
      where btrim(t.part) ~* E'^\\d+(?:[.,]\\d+)?\\s*km$'
      order by t.ord
      limit 1
    ) as distance_text,
    (
      select lower(btrim(t.part))
      from unnest(l.parts[2:array_length(l.parts, 1)]) with ordinality as t(part, ord)
      where lower(btrim(t.part)) in ('easy', 'moderate', 'vigorous')
      order by t.ord
      limit 1
    ) as intensity_val,
    l.body
  from legacy l
  where array_length(l.parts, 1) > 1
)
update activities a
set
  name = u.name_candidate,
  distance_km = replace(u.distance_text, ',', '.')::numeric,
  intensity = u.intensity_val,
  notes = u.body
from unpacked u
where a.id = u.id
  and u.name_candidate is not null
  and u.name_candidate <> ''
  and lower(u.name_candidate) not in (
    'sport', 'sports', 'other', 'activity', 'exercise', 'session',
    'training', 'unknown', 'null'
  )
  and (u.distance_text is not null or u.intensity_val is not null);

-- Verify (run manually after applying):
--   select id, name, distance_km, intensity, notes
--   from activities
--   where notes like '%·%';
