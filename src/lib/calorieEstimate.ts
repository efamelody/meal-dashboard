// Optional calorie-burn estimation for logged activities.
//
// Method (transparent, no language model involved):
//   kcal = MET x body weight (kg) x time (hours)
// MET values follow the Compendium of Physical Activities style — one band per
// activity, with a value per effort level. A range is always shown because the
// same session varies with body composition, technique, terrain and weather.
//
// Safeguards encoded here:
//   - never invents distance, pace, heart rate or intensity: an unstated
//     intensity widens the range to the activity's full easy–vigorous band;
//   - body weight is only used when the user provides it, otherwise a clearly
//     flagged 70 kg reference weight is used;
//   - returns `insufficient` (with one lightweight question) instead of a
//     number when the description cannot support a meaningful estimate.

import { ACTIVITY_LABELS } from "./activityMeta"
import type { Activity, ActivityType, Intensity } from "./types"

export const REFERENCE_WEIGHT_KG = 70

export interface MetBand {
  easy: number
  moderate: number
  vigorous: number
}

/** Category-level bands (used when the specific name isn't recognised). */
const MET_BY_CATEGORY: Record<ActivityType, MetBand> = {
  walking: { easy: 2.0, moderate: 3.5, vigorous: 5.0 },
  running: { easy: 7.0, moderate: 9.5, vigorous: 12.0 },
  cycling: { easy: 4.0, moderate: 6.8, vigorous: 10.0 },
  strength: { easy: 3.5, moderate: 5.0, vigorous: 6.0 },
  sports: { easy: 4.0, moderate: 6.0, vigorous: 8.0 },
  other: { easy: 3.0, moderate: 4.5, vigorous: 7.0 },
}

/** Name-level refinements so e.g. yoga isn't priced like a generic workout. */
const MET_BY_NAME: Array<{
  re: RegExp
  label: string
  band: MetBand
}> = [
  {
    re: /\b(aqua aerobics|water aerobics)\b/i,
    label: "aqua aerobics",
    band: { easy: 4.0, moderate: 5.5, vigorous: 7.0 },
  },
  {
    re: /\b(yoga)\b/i,
    label: "yoga",
    band: { easy: 2.0, moderate: 2.5, vigorous: 3.5 },
  },
  {
    re: /\b(pilates|reformer)\b/i,
    label: "pilates",
    band: { easy: 2.0, moderate: 3.0, vigorous: 4.0 },
  },
  {
    re: /\b(stretch|stretching|mobility|regangan)\b/i,
    label: "stretching and mobility",
    band: { easy: 1.8, moderate: 2.3, vigorous: 3.0 },
  },
  {
    re: /\b(tai chi|taichi)\b/i,
    label: "tai chi",
    band: { easy: 2.0, moderate: 3.0, vigorous: 4.0 },
  },
  {
    re: /\b(barre)\b/i,
    label: "barre",
    band: { easy: 2.5, moderate: 3.5, vigorous: 5.0 },
  },
  {
    re: /\b(hike|hiking|trek|trekking|mendaki)\b/i,
    label: "hiking",
    band: { easy: 3.5, moderate: 5.0, vigorous: 6.5 },
  },
  {
    re: /\b(swim|swimming|swam|open[- ]water swim|berenang)\b/i,
    label: "swimming",
    band: { easy: 4.5, moderate: 6.5, vigorous: 8.5 },
  },
  {
    re: /\b(walk|walking|walked|stroll|berjalan)\b/i,
    label: "walking",
    band: MET_BY_CATEGORY.walking,
  },
  {
    re: /\b(run|running|ran|jog|jogging|berlari|lari)\b/i,
    label: "running",
    band: MET_BY_CATEGORY.running,
  },
  {
    re: /\b(cycl|cycling|bike|biking|ride|riding|berbasikal)\b/i,
    label: "cycling",
    band: MET_BY_CATEGORY.cycling,
  },
  {
    re: /\b(gym|strength|weights?|lifting|lift|calisthenics|bodyweight|angkat berat)\b/i,
    label: "strength training",
    band: MET_BY_CATEGORY.strength,
  },
  {
    re: /\b(danc|dancing|zumba|aerobics|aerobik|menari)\b/i,
    label: "dancing",
    band: { easy: 3.0, moderate: 4.5, vigorous: 7.0 },
  },
  {
    re: /\b(tennis|badminton|squash|padel|table tennis)\b/i,
    label: "racquet sports",
    band: { easy: 4.5, moderate: 6.5, vigorous: 8.5 },
  },
  {
    re: /\b(volleyball|bola tampar)\b/i,
    label: "volleyball",
    band: { easy: 3.5, moderate: 5.0, vigorous: 7.0 },
  },
  {
    re: /\b(football|soccer|futsal|basketball|netball|rugby|hockey|baseball|bola sepak|bola keranjang)\b/i,
    label: "team sports",
    band: { easy: 4.5, moderate: 6.5, vigorous: 8.5 },
  },
  {
    re: /\b(golf)\b/i,
    label: "golf",
    band: { easy: 2.5, moderate: 3.5, vigorous: 4.5 },
  },
  {
    re: /\b(cricket)\b/i,
    label: "cricket",
    band: { easy: 3.0, moderate: 4.5, vigorous: 6.0 },
  },
  {
    re: /\b(row|rowing|erg|ergometer|mendayung)\b/i,
    label: "rowing",
    band: { easy: 4.5, moderate: 7.0, vigorous: 9.0 },
  },
  {
    re: /\b(elliptical|cross trainer)\b/i,
    label: "elliptical training",
    band: { easy: 4.0, moderate: 5.5, vigorous: 7.0 },
  },
  {
    re: /\b(skip|skipping|jump) rope\b/i,
    label: "skipping rope",
    band: { easy: 8.0, moderate: 10.0, vigorous: 12.0 },
  },
  {
    re: /\b(hiit|high[- ]intensity interval|tabata)\b/i,
    label: "HIIT",
    band: { easy: 6.0, moderate: 8.0, vigorous: 10.0 },
  },
  {
    re: /\b(circuit|boot ?camp|crossfit)\b/i,
    label: "circuit training",
    band: { easy: 5.0, moderate: 7.5, vigorous: 10.0 },
  },
  {
    re: /\b(boxing|kickboxing|martial arts?|muay thai|tinju)\b/i,
    label: "boxing and martial arts",
    band: { easy: 5.0, moderate: 7.0, vigorous: 9.5 },
  },
  {
    re: /\b(rock climbing|bouldering|indoor climbing)\b/i,
    label: "rock climbing",
    band: { easy: 5.0, moderate: 7.0, vigorous: 9.0 },
  },
  {
    re: /\b(kayak|kayaking|paddle ?board|paddleboarding)\b/i,
    label: "paddling",
    band: { easy: 3.0, moderate: 5.0, vigorous: 7.0 },
  },
  {
    re: /\b(ski|skiing|snowboard|snowboarding)\b/i,
    label: "snow sports",
    band: { easy: 4.5, moderate: 6.0, vigorous: 8.0 },
  },
  {
    re: /\b(skat|skating|skate|skateboarding|rollerblad|rollerblading)\b/i,
    label: "skating",
    band: { easy: 4.0, moderate: 6.0, vigorous: 8.0 },
  },
  {
    re: /\b(stair climbing|stairmaster|stair master)\b/i,
    label: "stair climbing",
    band: { easy: 4.0, moderate: 6.0, vigorous: 8.0 },
  },
  {
    re: /\b(archery|memanah)\b/i,
    label: "archery",
    band: { easy: 2.5, moderate: 3.5, vigorous: 4.5 },
  },
  {
    re: /\b(cardio|workout|senaman)\b/i,
    label: "general cardio",
    band: { easy: 4.0, moderate: 6.0, vigorous: 8.0 },
  },
]

export function metBandFor(
  name: string | null | undefined,
  category: ActivityType | null | undefined,
): {
  band: MetBand
  label: string
} {
  const trimmed = name?.trim()
  if (trimmed) {
    for (const entry of MET_BY_NAME) {
      if (entry.re.test(trimmed))
        return { band: entry.band, label: entry.label }
    }
  }
  const key = category ?? "other"
  return {
    band: MET_BY_CATEGORY[key],
    label:
      key === "other"
        ? "general activity"
        : `general ${ACTIVITY_LABELS[key].toLowerCase()} range`,
  }
}

export interface CalorieEstimateInput {
  name: string | null
  category: ActivityType | null
  intensity: Intensity
  durationMin: number
  /** Only ever set from user-provided or explicitly consented weight. */
  weightKg?: number | null
}

export interface CalorieEstimate {
  status: "ok"
  lowKcal: number
  highKcal: number
  metLow: number
  metHigh: number
  weightKg: number
  /** True when no weight was provided, so the 70 kg reference was used. */
  weightIsReference: boolean
  intensityUsed: Intensity
  label: string
  assumptions: string[]
}

export interface InsufficientEstimate {
  status: "insufficient"
  reason: "duration" | "activity" | "detail"
  /** One lightweight question, shown instead of a number. */
  question: string
}

export type CalorieEstimateResult = CalorieEstimate | InsufficientEstimate

function round10(n: number): number {
  return Math.max(10, Math.round(n / 10) * 10)
}

export function estimateCalories(
  input: CalorieEstimateInput,
): CalorieEstimateResult {
  const duration = Number.isFinite(input.durationMin) ? input.durationMin : 0
  if (duration <= 0) {
    return {
      status: "insufficient",
      reason: "duration",
      question: "How long did you move? An estimate needs a duration.",
    }
  }

  const name = input.name?.trim() ?? ""
  if (!name) {
    return {
      status: "insufficient",
      reason: "activity",
      question: "Which activity was it? We need one to pick an energy model.",
    }
  }

  const recognised =
    MET_BY_NAME.some((entry) => entry.re.test(name)) ||
    (input.category ?? "other") !== "other"
  if (!recognised && input.intensity === "unknown") {
    return {
      status: "insufficient",
      reason: "detail",
      question:
        "How hard did it feel — easy, moderate, or vigorous? We only recognise this activity by name, so one answer here is enough for a sensible range.",
    }
  }

  const { band, label } = metBandFor(name, input.category)
  const intensity: Intensity =
    input.intensity === "unknown" ? "unknown" : input.intensity

  let metLow: number
  let metHigh: number
  if (intensity === "unknown") {
    // Full documented band for this activity — we don't guess the effort.
    metLow = band.easy * 0.9
    metHigh = band.vigorous * 1.25
  } else {
    const met = band[intensity]
    metLow = met * 0.9
    metHigh = met * 1.25
  }

  const suppliedWeight = Number(input.weightKg)
  const weightIsReference =
    !Number.isFinite(suppliedWeight) || suppliedWeight <= 0
  const weight = weightIsReference ? REFERENCE_WEIGHT_KG : suppliedWeight

  const hours = duration / 60
  const lowKcal = round10(metLow * weight * hours)
  const highKcal = Math.max(lowKcal + 10, round10(metHigh * weight * hours))

  const assumptions = [
    `MET method: kcal = MET × weight × hours, using published MET values for ${label} (${metLow.toFixed(1)}–${metHigh.toFixed(1)} MET)`,
    weightIsReference
      ? `Assumes a ${REFERENCE_WEIGHT_KG} kg reference body weight — add yours for a closer estimate`
      : `Uses the ${Math.round(weight)} kg you entered`,
    intensity === "unknown"
      ? "Intensity wasn't stated, so the full easy–vigorous range for this activity is shown"
      : `Assumes ${intensity} effort as you described`,
    "No distance, pace, heart rate or GPS data was used — only the activity, duration and effort you provided",
  ]

  return {
    status: "ok",
    lowKcal,
    highKcal,
    metLow: Math.round(metLow * 10) / 10,
    metHigh: Math.round(metHigh * 10) / 10,
    weightKg: weight,
    weightIsReference,
    intensityUsed: intensity,
    label,
    assumptions,
  }
}

export function formatKcalRange(result: CalorieEstimate): string {
  return `${result.lowKcal}–${result.highKcal} kcal`
}

/** MET-based burn for one completed session; null when nothing sensible. */
export function estimateForActivity(
  a: Activity,
  weightKg: number | null,
): CalorieEstimate | null {
  if (a.status !== "completed") return null
  const result = estimateCalories({
    // Legacy rows have no free-text name; the category label feeds the same
    // MET lookup the activity page uses.
    name: a.name?.trim() || ACTIVITY_LABELS[a.activity_type],
    category: a.activity_type,
    intensity: a.intensity ?? "unknown",
    durationMin: a.duration_min,
    weightKg,
  })
  return result.status === "ok" ? result : null
}

export function fmtRange(low: number, high: number): string {
  return `${low.toLocaleString()}–${high.toLocaleString()}`
}

export function fmtSignedRange(low: number, high: number): string {
  const signed = (n: number) =>
    `${n < 0 ? "−" : "+"}${Math.abs(Math.round(n)).toLocaleString()}`
  return `${signed(low)}–${signed(high)}`
}

export interface BurnTotals {
  low: number
  high: number
  sessions: number
  skipped: number
}

/** Sum MET-based burn across activities, counting only completed sessions. */
export function sumCompletedBurn(
  activities: Activity[],
  weightKg: number | null,
): BurnTotals {
  const totals: BurnTotals = { low: 0, high: 0, sessions: 0, skipped: 0 }
  for (const a of activities) {
    if (a.status !== "completed") continue
    const est = estimateForActivity(a, weightKg)
    if (!est) {
      totals.skipped += 1
      continue
    }
    totals.low += est.lowKcal
    totals.high += est.highKcal
    totals.sessions += 1
  }
  return totals
}
