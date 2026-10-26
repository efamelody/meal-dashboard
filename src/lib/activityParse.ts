// Rule-based interpretation of a free-text activity description.
//
// This module is deliberately pure (no network, no browser APIs) so it can be
// used as the offline fallback for src/lib/activityAi.ts and unit-tested on
// its own. It never invents values: every field it returns is present in the
// source text, and anything not stated comes back as null.

import { toISODate } from "./dates"
import type { ActivityType, Intensity, ISODate } from "./types"
import { inferActivityCategory } from "./activityMeta"

export interface ActivityDraft {
  /** Specific activity name ("Swimming"), or null when not stated. */
  name: string | null
  category: ActivityType | null
  duration_min: number | null
  /** True when the text hedged the duration ("around", "about", "roughly"). */
  duration_approximate: boolean
  distance_km: number | null
  /** null = not stated. Never guessed. */
  intensity: Intensity | null
  /** Exercise specifics (laps, sets/reps, elevation, pace…). */
  details: string | null
  /** Context/conditions (steep trail, breaks, weather, how it felt…). */
  notes: string | null
  date: ISODate | null
  time: string | null
}

export const EMPTY_DRAFT: ActivityDraft = {
  name: null,
  category: null,
  duration_min: null,
  duration_approximate: false,
  distance_km: null,
  intensity: null,
  details: null,
  notes: null,
  date: null,
  time: null,
}

/* ── Activity name detection ─────────────────────────────────────────── */

interface NamePattern {
  re: RegExp
  name: string
}

/** Longer phrases first so "table tennis" wins over "tennis". */
const NAME_PATTERNS: NamePattern[] = [
  { re: /\b(table tennis|ping[- ]?pong)\b/i, name: "Table tennis" },
  { re: /\b(open[- ]water swim(ming)?)\b/i, name: "Open-water swim" },
  { re: /\b(aqua aerobics|water aerobics)\b/i, name: "Aqua aerobics" },
  { re: /\b(reformer pilates|mat pilates)\b/i, name: "Pilates" },
  {
    re: /\b(strength train(ing)?|weight train(ing)?|angkat berat)\b/i,
    name: "Strength training",
  },
  {
    re: /\b(hiit|high[- ]intensity interval training)\b/i,
    name: "HIIT",
  },
  {
    re: /\b(circuit train(ing)?|circuit class)\b/i,
    name: "Circuit training",
  },
  { re: /\b(boot ?camp)\b/i, name: "Bootcamp" },
  { re: /\b(crossfit)\b/i, name: "CrossFit" },
  {
    re: /\b(calisthenics|bodyweight workout)\b/i,
    name: "Calisthenics",
  },
  {
    re: /\b(rock climbing|bouldering|indoor climbing)\b/i,
    name: "Rock climbing",
  },
  { re: /\b(kayak(ing)?)\b/i, name: "Kayaking" },
  { re: /\b(paddle ?board(ing)?)\b/i, name: "Paddleboarding" },
  { re: /\b(snowboard(ing)?)\b/i, name: "Snowboarding" },
  { re: /\b(ski(ing)?)\b/i, name: "Skiing" },
  {
    re: /\b(rollerblad(e|ing)|roller skat(ing|e))\b/i,
    name: "Rollerblading",
  },
  { re: /\b(skateboard(ing)?)\b/i, name: "Skateboarding" },
  { re: /\b(skat(ing|e))\b/i, name: "Skating" },
  {
    re: /\b(stair climbing|stairmaster|stair master)\b/i,
    name: "Stair climbing",
  },
  { re: /\b(muay thai)\b/i, name: "Muay Thai" },
  { re: /\b(kickboxing)\b/i, name: "Kickboxing" },
  { re: /\b(boxing|tinju)\b/i, name: "Boxing" },
  { re: /\b(martial arts?)\b/i, name: "Martial arts" },
  { re: /\b(futsal)\b/i, name: "Futsal" },
  { re: /\b(netball)\b/i, name: "Netball" },
  { re: /\b(padel)\b/i, name: "Padel" },
  { re: /\b(cricket)\b/i, name: "Cricket" },
  { re: /\b(golf)\b/i, name: "Golf" },
  { re: /\b(hockey)\b/i, name: "Hockey" },
  { re: /\b(rugby)\b/i, name: "Rugby" },
  { re: /\b(baseball)\b/i, name: "Baseball" },
  { re: /\b(archery|memanah)\b/i, name: "Archery" },
  { re: /\b(barre)\b/i, name: "Barre" },
  { re: /\b(tai chi|taichi)\b/i, name: "Tai chi" },
  { re: /\b(hike|hiking|trek|trekking|mendaki)\b/i, name: "Hiking" },
  { re: /\b(walk|walked|walking|stroll|berjalan)\b/i, name: "Walking" },
  { re: /\b(run|ran|running|jog|jogging|berlari|lari)\b/i, name: "Running" },
  {
    re: /\b(cycl(e|ing)|bike|biking|ride|riding|berbasikal)\b/i,
    name: "Cycling",
  },
  { re: /\b(swim|swam|swimming|berenang)\b/i, name: "Swimming" },
  { re: /\b(gym|strength|weights?|lift(ing)?)\b/i, name: "Gym session" },
  { re: /\b(badminton)\b/i, name: "Badminton" },
  { re: /\b(tennis)\b/i, name: "Tennis" },
  { re: /\b(squash)\b/i, name: "Squash" },
  {
    re: /\b(row(ing)?|erg(ometer)?|mendayung)\b/i,
    name: "Rowing",
  },
  { re: /\b(football|soccer|bola sepak)\b/i, name: "Football" },
  { re: /\b(basketball|bola keranjang)\b/i, name: "Basketball" },
  { re: /\b(volleyball|bola tampar)\b/i, name: "Volleyball" },
  { re: /\b(yoga)\b/i, name: "Yoga" },
  { re: /\b(pilates)\b/i, name: "Pilates" },
  {
    re: /\b(danc(e|ing)|zumba|aerobics|aerobik|menari)\b/i,
    name: "Dancing",
  },
  {
    re: /\b(stretch(ing)?|mobility|regangan)\b/i,
    name: "Stretching",
  },
  { re: /\b(skip(ping)? rope|jump rope)\b/i, name: "Skipping rope" },
  { re: /\b(elliptical|cross trainer)\b/i, name: "Elliptical" },
  { re: /\b(senaman)\b/i, name: "Workout" },
  { re: /\b(swim|swimming) (pool|session)\b/i, name: "Swimming" },
]

/** True when the text names one of the activities this parser recognises. */
export function isKnownActivityName(text: string): boolean {
  const value = text.trim()
  if (!value) return false
  return NAME_PATTERNS.some((pattern) => pattern.re.test(value))
}

/* ── Intensity detection ─────────────────────────────────────────────── */

const INTENSITY_PATTERNS: Array<{
  re: RegExp
  value: Intensity
}> = [
  {
    re: /\b(easy|light|lightly|gentle|leisurely|casual|slow(ly)?|relax(ed)?|recovery|chill)\b/i,
    value: "easy",
  },
  {
    re: /\b(moderate|medium|steady|brisk|tempo|normal pace)\b/i,
    value: "moderate",
  },
  {
    re: /\b(vigorous|hard(ly)?|intense(ly)?|heavy|brutal|fast|quick pace|racing|race|sprint(ing)?|steep|challenging|tough|all[- ]out|max effort|quickly)\b/i,
    value: "vigorous",
  },
]

/* ── Duration ────────────────────────────────────────────────────────── */

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fortyfive: 45,
  fifty: 50,
  sixty: 60,
  ninety: 90,
  hundred: 100,
}

const QUANTITY = String.raw`\d+(?:[.,]\d+)?|${Object.keys(WORD_NUMBERS).join("|")}`

const HOUR_RE = new RegExp(
  String.raw`\b(${QUANTITY})\s*(?:hours?|hrs?)\b`,
  "gi",
)
const MINUTE_RE = new RegExp(
  String.raw`\b(${QUANTITY})\s*(?:minutes?|mins?)\b`,
  "gi",
)

const HEDGE_RE =
  /\b(around|about|roughly|approximately|approx\.?|circa|nearly|almost|~|just over|just under)\b/i

function toNumber(raw: string): number {
  const key = raw.toLowerCase().replace(",", ".")
  if (key in WORD_NUMBERS) return WORD_NUMBERS[key]
  const parsed = Number.parseFloat(key)
  return Number.isFinite(parsed) ? parsed : NaN
}

interface DurationMatch {
  minutes: number
  approximate: boolean
  span: [number, number]
}

/** Widens a span backwards to include a hedging word ("around 40 minutes"). */
function withHedge(text: string, start: number, end: number): [number, number] {
  const lead = text.slice(Math.max(0, start - 24), start)
  const hedge = HEDGE_RE.exec(lead)
  if (!hedge) return [start, end]
  return [Math.max(0, start - 24) + hedge.index, end]
}

function findDuration(text: string): DurationMatch | null {
  // "half an hour" / "an hour and a half" come first so they aren't parsed as
  // a bare hour.
  const special = /\b(half an hour|an? hour and a half)\b/i.exec(text)
  if (special) {
    const isHalfHour =
      /half/i.test(special[1]) && !/and a half/i.test(special[1])
    return {
      minutes: isHalfHour ? 30 : 90,
      approximate: HEDGE_RE.test(
        text.slice(Math.max(0, special.index - 20), special.index),
      ),
      span: withHedge(text, special.index, special.index + special[0].length),
    }
  }

  HOUR_RE.lastIndex = 0
  MINUTE_RE.lastIndex = 0
  const hour = HOUR_RE.exec(text)
  const minute = MINUTE_RE.exec(text)

  let minutes = 0
  let approximate = false
  let start = -1
  let end = -1

  if (hour) {
    const value = toNumber(hour[1])
    if (Number.isFinite(value) && value > 0 && value <= 48) {
      minutes += value * 60
      start = hour.index
      end = hour.index + hour[0].length
      approximate = HEDGE_RE.test(
        text.slice(Math.max(0, hour.index - 20), hour.index),
      )
    }
  }
  if (minute) {
    const value = toNumber(minute[1])
    if (Number.isFinite(value) && value > 0 && value <= 1440) {
      // Only add a minute phrase when no hour phrase already covers it.
      if (minutes === 0) {
        minutes = value
        start = minute.index
        end = minute.index + minute[0].length
        approximate =
          approximate ||
          HEDGE_RE.test(
            text.slice(Math.max(0, minute.index - 20), minute.index),
          )
      } else if (
        start >= 0 &&
        minute.index - end < 20 &&
        !/hours?/i.test(text.slice(end, minute.index))
      ) {
        minutes += value // "2 hours and 10 minutes"
        end = minute.index + minute[0].length
      }
    }
  }

  if (minutes <= 0 || start < 0) return null
  return {
    minutes: Math.round(minutes),
    approximate,
    span: withHedge(text, start, end),
  }
}

/* ── Distance ────────────────────────────────────────────────────────── */

const DISTANCE_RE = new RegExp(
  String.raw`\b(\d+(?:[.,]\d+)?)\s*(kilometers?|kilometres?|km|miles?|mi|metres?|meters?|m|k)\b`,
  "gi",
)

function findDistance(
  text: string,
): {
  km: number
  span: [number, number]
} | null {
  DISTANCE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DISTANCE_RE.exec(text)) !== null) {
    const value = Number.parseFloat(match[1].replace(",", "."))
    if (!Number.isFinite(value) || value <= 0) continue
    const unit = match[2].toLowerCase()
    let km: number
    if (unit.startsWith("k")) km = value
    else if (unit.startsWith("mi")) km = value * 1.60934
    else km = value / 1000 // metres
    if (km < 0.05 || km > 2000) continue
    return {
      km: Math.round(km * 100) / 100,
      span: withHedge(text, match.index, match.index + match[0].length),
    }
  }
  return null
}

/* ── Date / time ─────────────────────────────────────────────────────── */

const DAY_TIME_HINTS: Array<{
  re: RegExp
  time: string
}> = [
  { re: /\b(early morning|this morning|in the morning)\b/i, time: "08:00" },
  { re: /\b(this afternoon|in the afternoon)\b/i, time: "14:00" },
  { re: /\b(this evening|in the evening)\b/i, time: "18:00" },
  { re: /\b(tonight|late evening)\b/i, time: "20:00" },
  { re: /\b(midday|noon)\b/i, time: "12:00" },
]

function findWhen(text: string, today: Date): {
  date: ISODate | null
  time: string | null
} {
  let date: ISODate | null = null
  let time: string | null = null

  if (/\byesterday\b/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    date = toISODate(d)
  } else if (
    /\b(today|tonight|this morning|this afternoon|this evening)\b/i.test(text)
  ) {
    date = toISODate(today)
  }

  const explicit = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i.exec(text)
  if (explicit) {
    let hour = Number(explicit[1])
    const minute = explicit[2] ? Number(explicit[2]) : 0
    const meridiem = explicit[3]?.toLowerCase()
    if (meridiem === "pm" && hour < 12) hour += 12
    if (meridiem === "am" && hour === 12) hour = 0
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    }
  }
  if (!time) {
    for (const hint of DAY_TIME_HINTS) {
      if (hint.re.test(text)) {
        time = hint.time
        break
      }
    }
  }
  return { date, time }
}

/* ── Leftover description ────────────────────────────────────────────── */

const DETAIL_RE =
  /\b(laps?|sets?|reps?|repetitions|freestyle|breaststroke|backstroke|butterfly|intervals?|weights?|incline|elevation|ascent|pace|exercises?|rounds?|drills?|sprints?|heart rate|bpm|pull-?ups?|push-?ups?)\b/i

function cleanClause(raw: string, isFirst: boolean): string | null {
  let text = raw
  text = text.replace(/\s+/g, " ")
  text = text.replace(/\s+([,.;:!?])/g, "$1")
  text = text.replace(/^[,.;:\s]+/, "")
  text = text.replace(/[,.;:\s]+$/, "")
  text = text.replace(/\s*,\s*,/g, ",")
  // Drop leftover sentence stems that lost their payload ("I  for  this morning").
  // The first clause can lose its subject entirely; later clauses only shed
  // connectors so sentences stay readable ("and I took a few breaks").
  const fillers = isFirst
    ? "i|we|my|our|and|also|then|with|for|a|an|the|of|to|on|at|some|went|did|go|doing|done|completed"
    : "and|but|also|then|plus"
  const fillerRe = new RegExp(`^(${fillers})\\b\\s*`, "i")
  for (let i = 0; i < 4; i++) {
    const next = text.replace(fillerRe, "")
    if (next === text) break
    text = next.replace(/^[,.;:\s]+/, "")
  }
  text = text.replace(/\s{2,}/g, " ").trim()
  if (text.length < 3) return null
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/* ── Main entry ──────────────────────────────────────────────────────── */

/**
 * Interpret a free-text activity description into structured draft fields.
 * Anything not present in the text stays null — the UI decides what to ask.
 */
export function parseActivityDescription(
  input: string,
  today: Date = new Date(),
): ActivityDraft {
  const text = input.trim()
  if (!text) return { ...EMPTY_DRAFT }

  const masked: string[] = []
  let working = text
  const blank = (span: [number, number]) => {
    const [start, end] = span
    working =
      working.slice(0, start) + " ".repeat(end - start) + working.slice(end)
    masked.push(text.slice(start, end))
  }

  // Activity name (longest match wins).
  let name: string | null = null
  for (const pattern of NAME_PATTERNS) {
    const match = pattern.re.exec(text)
    if (match) {
      name = pattern.name
      blank([match.index, match.index + match[0].length])
      break
    }
  }

  const duration = findDuration(text)
  if (duration) blank(duration.span)

  const distance = findDistance(text)
  if (distance) blank(distance.span)

  // Date/time is captured into its own fields, so remove it from the prose.
  const timeSpan =
    /\b(yesterday|today|tonight|this morning|this afternoon|this evening|in the morning|in the afternoon|in the evening|early morning|late evening|midday|noon)\b/i.exec(
      text,
    )
  if (timeSpan) blank([timeSpan.index, timeSpan.index + timeSpan[0].length])
  const explicitAt = /\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.exec(text)
  if (explicitAt)
    blank([explicitAt.index, explicitAt.index + explicitAt[0].length])

  let intensity: Intensity | null = null
  let earliest = Infinity
  for (const pattern of INTENSITY_PATTERNS) {
    const match = pattern.re.exec(text)
    if (match && match.index < earliest) {
      earliest = match.index
      intensity = pattern.value
    }
  }

  const { date, time } = findWhen(text, today)

  // What's left is the human description of how it went.
  const parts = working.replace(/\b(i|we)\b/gi, " ").split(/[,.;:\n]+/)
  const clauses = parts
    .map((clause, index) => cleanClause(clause, index === 0))
    .filter((clause): clause is string => Boolean(clause))
    .filter((clause) => clause.length > 2)
  const description = clauses.length ? clauses.join(", ") : null
  const hasDetail = description ? DETAIL_RE.test(description) : false

  return {
    name,
    category: name ? inferActivityCategory(name) : null,
    duration_min: duration ? duration.minutes : null,
    duration_approximate: duration?.approximate ?? false,
    distance_km: distance ? distance.km : null,
    intensity,
    details: description && hasDetail ? description : null,
    notes: description && !hasDetail ? description : null,
    date,
    time,
  }
}
