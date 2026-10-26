// Shared labels/icons for the activities feature so Home, Plan, and
// Progress render activity types consistently.

import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Sparkles,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Activity as ActivityRow, ActivityType, Intensity } from "./types"

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: "Walking",
  running: "Running",
  cycling: "Cycling",
  strength: "Strength",
  sports: "Sports",
  other: "Other",
}

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  walking: Footprints,
  running: Activity,
  cycling: Bike,
  strength: Dumbbell,
  sports: Trophy,
  other: Sparkles,
}

export const ACTIVITY_TYPES: ActivityType[] = [
  "walking",
  "running",
  "cycling",
  "strength",
  "sports",
  "other",
]

export const INTENSITY_LABELS: Record<Intensity, string> = {
  easy: "Easy",
  moderate: "Moderate",
  vigorous: "Vigorous",
  unknown: "Not sure",
}

export const INTENSITIES: Intensity[] = [
  "easy",
  "moderate",
  "vigorous",
  "unknown",
]

/* ── Suggestions ─────────────────────────────────────────────────────── */

export interface ActivitySuggestion {
  /** Name as it should appear on the record. */
  name: string
  category: ActivityType
}

/**
 * Starting points for the free-text activity field — not an exhaustive list.
 * Anything outside this list is still valid (the field accepts any name).
 */
export const ACTIVITY_SUGGESTIONS: ActivitySuggestion[] = [
  { name: "Walking", category: "walking" },
  { name: "Running", category: "running" },
  { name: "Cycling", category: "cycling" },
  { name: "Swimming", category: "sports" },
  { name: "Hiking", category: "walking" },
  { name: "Gym session", category: "strength" },
  { name: "Badminton", category: "sports" },
  { name: "Tennis", category: "sports" },
  { name: "Yoga", category: "other" },
  { name: "Pilates", category: "other" },
  { name: "Dancing", category: "other" },
]

/** Extra placeholder hints per category (shown under the details field). */
export const DETAIL_PLACEHOLDERS: Record<ActivityType, string> = {
  walking: "e.g. 6 km, one steep hill, 450 m elevation",
  running: "e.g. 5 km easy pace, treadmill, intervals 8 × 400 m",
  cycling: "e.g. 18 km, 220 m elevation, indoor trainer",
  strength: "e.g. 4 exercises, 3 sets × 8 reps, squats and rows",
  sports: "e.g. 3 sets, short breaks between rallies, freestyle laps",
  other: "e.g. 20 laps, held each pose 5 breaths, partner drills",
}

/* ── Name → category ─────────────────────────────────────────────────── */

const CATEGORY_PATTERNS: Array<[ActivityType, RegExp]> = [
  [
    "walking",
    /\b(walk|walking|hike|hiking|trek|trekking|stroll|footsteps?|mendaki|berjalan)\b/i,
  ],
  [
    "running",
    /\b(run|running|jog|jogging|sprint|sprinting|marathon|berlari|lari)\b/i,
  ],
  [
    "cycling",
    /\b(cycl|cycling|bike|biking|bicycle|spin class|spin|ride|riding|berbasikal)\b/i,
  ],
  [
    "strength",
    /\b(gym|strength|weights?|lifting|lift|resistance|bodyweight|push-?ups?|squats?|deadlift|core workout|hiit|circuit|bootcamp|boot camp|crossfit|calisthenics|angkat berat|stair climbing|stairmaster)\b/i,
  ],
  [
    "sports",
    /\b(swim|swimming|water aerobics|aqua aerobics|laps?|tennis|badminton|squash|football|soccer|futsal|basketball|volleyball|netball|golf|cricket|table tennis|padel|rugby|hockey|baseball|rowing|erg|boxing|kickboxing|martial arts?|rock climbing|bouldering|indoor climbing|kayak|paddleboard|skiing|snowboarding|skating|skateboarding|archery|berenang|mendayung|bola sepak|bola keranjang|bola tampar|tinju|memanah)\b/i,
  ],
  [
    "other",
    /\b(yoga|pilates|danc|stretch|mobility|meditation|barre|zen|aerobics|aerobik|zumba|tai chi|menari|regangan|senaman)\b/i,
  ],
]

/**
 * Best-effort mapping from a free-text activity name to the stored category
 * (which drives the icon and the Progress breakdown). Unknown names fall back
 * to "other" — the specific name is always kept alongside it.
 */
export function inferActivityCategory(name: string): ActivityType {
  const value = name.trim()
  if (!value) return "other"
  for (const suggestion of ACTIVITY_SUGGESTIONS) {
    if (value.toLowerCase() === suggestion.name.toLowerCase()) {
      return suggestion.category
    }
  }
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(value)) return category
  }
  return "other"
}

/* ── Name hygiene ────────────────────────────────────────────────────── */

/**
 * Words that describe a bucket, not an activity. Walking/Running/Cycling are
 * valid activity names, so they are deliberately not treated as generic.
 */
const GENERIC_ACTIVITY_NAMES = new Set([
  "sport",
  "sports",
  "other",
  "activity",
  "exercise",
  "session",
  "training",
  "unknown",
  "null",
])

const CANONICAL_ACTIVITY_NAMES: Record<string, string> = {
  hiit: "HIIT",
  crossfit: "CrossFit",
  "muay thai": "Muay Thai",
}

/** True when the text is only a category/placeholder, not a real activity. */
export function isGenericActivityName(name: string): boolean {
  return GENERIC_ACTIVITY_NAMES.has(name.trim().toLowerCase())
}

/**
 * Clean up a name coming from the AI or a legacy row: reject category words,
 * collapse whitespace, prefer the catalogue spelling, and fix lowercase names
 * like "pilates" → "Pilates" without destroying acronyms such as HIIT.
 */
export function normalizeActivityName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, " ")
  if (!value || isGenericActivityName(value)) return null

  const exact = ACTIVITY_SUGGESTIONS.find(
    (suggestion) => suggestion.name.toLowerCase() === value.toLowerCase(),
  )
  if (exact) return exact.name

  const canonical = CANONICAL_ACTIVITY_NAMES[value.toLowerCase()]
  if (canonical) return canonical

  // Preserve names that already carry intentional casing ("Reformer Pilates").
  if (/[A-Z]/.test(value.slice(1))) return value

  const lower = value.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Label for a stored activity: the specific name when present, else category. */
export function activityDisplayLabel(
  activity: Pick<ActivityRow, "activity_type" | "name">,
): string {
  const name = activity.name?.trim()
  if (name && !isGenericActivityName(name)) return name
  return ACTIVITY_LABELS[activity.activity_type]
}
