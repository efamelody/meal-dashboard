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
    /\b(walk|walking|hike|hiking|trek|trekking|stroll|footsteps?)\b/i,
  ],
  ["running", /\b(run|running|jog|jogging|sprint|sprinting|marathon)\b/i],
  ["cycling", /\b(cycl|cycling|bike|biking|bicycle|spin class|ride|riding)\b/i],
  [
    "strength",
    /\b(gym|strength|weights?|lifting|lift|resistance|bodyweight|push-?ups?|squats?|deadlift|core workout)\b/i,
  ],
  [
    "sports",
    /\b(swim|swimming|laps?|tennis|badminton|squash|football|soccer|basketball|volleyball|badminton|golf|cricket|table tennis|padel|rugby|hockey|baseball)\b/i,
  ],
  [
    "other",
    /\b(yoga|pilates|danc|stretch|mobility|meditation|barre|zen|aerobics|zumba)\b/i,
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

/** Label for a stored activity: the specific name when present, else category. */
export function activityDisplayLabel(
  activity: Pick<ActivityRow, "activity_type" | "name">,
): string {
  const name = activity.name?.trim()
  if (name) return name
  return ACTIVITY_LABELS[activity.activity_type]
}
