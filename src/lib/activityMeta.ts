// Shared labels, icons and the workout picker catalogue for the activities
// feature so Home, Plan, Community and Progress render activity types
// consistently.

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bike,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Hand,
  Heart,
  Layers,
  Music,
  PersonStanding,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Waves,
  Weight,
  Wind,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type {
  Activity as ActivityRow,
  ActivityType,
  Feel,
  Intensity,
} from "./types"

/* ── Categories ───────────────────────────────────────────────────────── */

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  cardio: "Cardio",
  strength: "Strength",
  mobility: "Mobility",
  other: "Other",
}

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  cardio: Heart,
  strength: Dumbbell,
  mobility: Sun,
  other: Sparkles,
}

export const ACTIVITY_TYPES: ActivityType[] = [
  "cardio",
  "strength",
  "mobility",
  "other",
]

/* ── Workout kinds ─────────────────────────────────────────────────────── */

export interface WorkoutKind {
  /** Label stored on the record (e.g. "Walk", "Full body"). */
  label: string
  icon: LucideIcon
}

export const WORKOUT_KINDS: Record<Exclude<ActivityType, "other">, WorkoutKind[]> =
  {
    cardio: [
      { label: "Walk", icon: Footprints },
      { label: "Jog / Run", icon: Activity },
      { label: "Cycle", icon: Bike },
      { label: "Swim", icon: Waves },
      { label: "HIIT", icon: Flame },
      { label: "Dance", icon: Music },
      { label: "Sport", icon: Trophy },
    ],
    strength: [
      { label: "Full body", icon: Layers },
      { label: "Upper body", icon: ArrowUp },
      { label: "Lower body", icon: ArrowDown },
      { label: "Core", icon: Target },
      { label: "Arms", icon: Hand },
      { label: "Weights", icon: Weight },
      { label: "Pilates", icon: PersonStanding },
    ],
    mobility: [
      { label: "Yoga", icon: Flower2 },
      { label: "Stretch", icon: Wind },
      { label: "Mobility", icon: Sun },
      { label: "Barre", icon: PersonStanding },
    ],
  }

/** All kind labels in one flat list (used for canonical name spelling). */
const KIND_LABELS: string[] = ([
  "cardio",
  "strength",
  "mobility",
] as const).flatMap((category) =>
  WORKOUT_KINDS[category].map((kind) => kind.label),
)

/* ── Effort + feel ─────────────────────────────────────────────────────── */

export const INTENSITY_LABELS: Record<Intensity, string> = {
  easy: "Light",
  moderate: "Moderate",
  vigorous: "Hard",
  unknown: "Not sure",
}

/** Effort options shown in the form (no "unknown" — default is Moderate). */
export const EFFORT_LEVELS: Intensity[] = ["easy", "moderate", "vigorous"]

export const FEELS: Feel[] = ["great", "good", "okay", "tired", "sore"]

export interface FeelMeta {
  label: string
  emoji: string
}

export const FEEL_META: Record<Feel, FeelMeta> = {
  great: { label: "Great", emoji: "😄" },
  good: { label: "Good", emoji: "🙂" },
  okay: { label: "Okay", emoji: "😐" },
  tired: { label: "Tired", emoji: "😴" },
  sore: { label: "Sore", emoji: "😖" },
}

/* ── Name → category (for plans & legacy text) ─────────────────────────── */

const CATEGORY_PATTERNS: Array<[Exclude<ActivityType, "other">, RegExp]> = [
  [
    "strength",
    /\b(gym|strength|weights?|lifting|lift|pilates|bodyweight|push-?ups?|squats?|deadlift|core|arms?|hiit|circuit|bootcamp|crossfit|calisthenics|angkat berat)\b/i,
  ],
  [
    "mobility",
    /\b(yoga|stretch(ing)?|mobility|barre|tai chi|meditation|zen|regangan)\b/i,
  ],
  [
    "cardio",
    /\b(walk(ing)?|hike|hiking|jog(ging)?|run(ning)?|sprint|cycl(ing)?|bike|biking|swim(ming)?|danc(e|ing)?|zumba|aerobic|cardio|sport|tennis|badminton|futsal|football|soccer|basketball|volleyball|berjalan|berlari|berbasikal|berenang|menari)\b/i,
  ],
]

/**
 * Best-effort mapping from free text (a group-plan title, a legacy name) to a
 * category. Unknown names fall back to "other".
 */
export function inferActivityCategory(name: string): ActivityType {
  const value = name.trim().toLowerCase()
  if (!value) return "other"
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(value)) return category
  }
  return "other"
}

/* ── Name hygiene ──────────────────────────────────────────────────────── */

const GENERIC_ACTIVITY_NAMES = new Set([
  "sport",
  "sports",
  "other",
  "activity",
  "exercise",
  "workout",
  "session",
  "training",
  "cardio",
  "strength",
  "mobility",
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
 * Clean up a name coming from a stored row: reject category words, collapse
 * whitespace, prefer the catalogue spelling, and fix lowercase names like
 * "pilates" → "Pilates" without destroying acronyms such as HIIT.
 */
export function normalizeActivityName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, " ")
  if (!value || isGenericActivityName(value)) return null

  const exact = KIND_LABELS.find(
    (label) => label.toLowerCase() === value.toLowerCase(),
  )
  if (exact) return exact

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

/* ── Known activity names (for legacy note unpacking) ──────────────────── */

interface NamePattern {
  re: RegExp
  name: string
}

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
  { re: /\b(calisthenics|bodyweight workout)\b/i, name: "Calisthenics" },
  {
    re: /\b(rock climbing|bouldering|indoor climbing)\b/i,
    name: "Rock climbing",
  },
  { re: /\b(kayak(ing)?)\b/i, name: "Kayaking" },
  { re: /\b(paddle ?board(ing)?)\b/i, name: "Paddleboarding" },
  { re: /\b(snowboard(ing)?)\b/i, name: "Snowboarding" },
  { re: /\b(ski(ing)?)\b/i, name: "Skiing" },
  { re: /\b(rollerblad(e|ing)|roller skat(ing|e))\b/i, name: "Rollerblading" },
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
  { re: /\b(row(ing)?|erg(ometer)?|mendayung)\b/i, name: "Rowing" },
  { re: /\b(football|soccer|bola sepak)\b/i, name: "Football" },
  { re: /\b(basketball|bola keranjang)\b/i, name: "Basketball" },
  { re: /\b(volleyball|bola tampar)\b/i, name: "Volleyball" },
  { re: /\b(yoga)\b/i, name: "Yoga" },
  { re: /\b(pilates)\b/i, name: "Pilates" },
  { re: /\b(danc(e|ing)|zumba|aerobics|aerobik|menari)\b/i, name: "Dancing" },
  { re: /\b(stretch(ing)?|mobility|regangan)\b/i, name: "Stretching" },
  { re: /\b(skip(ping)? rope|jump rope)\b/i, name: "Skipping rope" },
  { re: /\b(elliptical|cross trainer)\b/i, name: "Elliptical" },
  { re: /\b(senaman)\b/i, name: "Workout" },
  { re: /\b(swim|swimming) (pool|session)\b/i, name: "Swimming" },
]

/** True when the text names one of the activities this catalogue recognises. */
export function isKnownActivityName(text: string): boolean {
  const value = text.trim()
  if (!value) return false
  return NAME_PATTERNS.some((pattern) => pattern.re.test(value))
}
