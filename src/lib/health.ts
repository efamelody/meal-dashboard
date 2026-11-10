import type { ISODate } from "./types"

export type HealthMetricKey = "visceral_fat" | "bmi" | "total_cholesterol" | "retinal_arteriosclerosis_risk" | "retinal_glucose_metabolism_risk" | "oxito_liver_score" | "oxito_back_score" | "blood_pressure_systolic" | "blood_pressure_diastolic" | "fasting_glucose"

export interface HealthMetric {
  key: HealthMetricKey
  label: string
  value: number
  unit: string
  measured_at: ISODate
  source: string
  target?: string
}

/** One food category to steer away from, derived from the check-up. */
export interface HealthAvoidItem {
  /** Short food or drink category, e.g. "sugary drinks". */
  food: string
  /** Why, tied to a metric, e.g. "high visceral fat". */
  reason: string
  /** "avoid" = hard to justify anytime; "limit" = small portions, rare. */
  severity: "avoid" | "limit"
}

export interface HealthProfile {
  focus: string
  summary: string
  goals: string[]
  recommendations: string[]
  metrics: HealthMetric[]
  sleep_hours_target: string
  water_litres_target: string
  imported_at: string
  /** The saved "due to high visceral fat…" statement from the last import. */
  avoid_summary?: string
  /** Foods and drinks the analysis says to avoid or limit. */
  avoid_list?: HealthAvoidItem[]
}

const STORAGE_KEY = "meal-kit-health-profile"

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  focus: "Metabolic and microvascular optimization over the next 3–6 months",
  summary:
    "Baseline screening suggests the main priorities are reducing visceral fat, improving cholesterol-related risk, and maintaining normal blood pressure and fasting glucose.",
  goals: [
    "Reduce visceral fat",
    "Improve cholesterol profile",
    "Limit added sugar and refined carbohydrates",
    "Increase fiber and protect normal fasting glucose",
  ],
  recommendations: [
    "Prefer purple rice, brown rice, or barley over plain white rice",
    "Finish dinner 2–3 hours before sleep",
    "Prioritize lean protein and high-fiber vegetables",
    "Continue Couch to 5K and Pilates 1–2 times per week",
    "Aim for 7–8 hours of sleep and 2.0–2.5 litres of water daily",
    "Use practitioner-recommended K2 + D3 and ubiquinol only as directed",
  ],
  metrics: [
    {
      key: "visceral_fat",
      label: "Visceral fat level",
      value: 16,
      unit: "level",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "below 10",
    },
    {
      key: "bmi",
      label: "BMI",
      value: 36.3,
      unit: "kg/m²",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "18.5–22.9",
    },
    {
      key: "total_cholesterol",
      label: "Total cholesterol",
      value: 5.4,
      unit: "mmol/L",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "5.2 or below",
    },
    {
      key: "retinal_arteriosclerosis_risk",
      label: "Retinal arteriosclerosis risk",
      value: 27,
      unit: "report score",
      measured_at: "2025-09-01",
      source: "September 2025 report",
      target: "below 24",
    },
    {
      key: "retinal_glucose_metabolism_risk",
      label: "Retinal glucose metabolism risk",
      value: 30,
      unit: "report score",
      measured_at: "2025-09-01",
      source: "September 2025 report",
      target: "below 24",
    },
    {
      key: "oxito_liver_score",
      label: "Oxito liver score",
      value: 10,
      unit: "report score",
      measured_at: "2025-09-01",
      source: "September 2025 report",
      target: "balanced at 0",
    },
    {
      key: "oxito_back_score",
      label: "Oxito back score",
      value: -25,
      unit: "report score",
      measured_at: "2025-09-01",
      source: "September 2025 report",
      target: "balanced at 0",
    },
    {
      key: "blood_pressure_systolic",
      label: "Blood pressure (systolic)",
      value: 111,
      unit: "mmHg",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "maintain normal range",
    },
    {
      key: "blood_pressure_diastolic",
      label: "Blood pressure (diastolic)",
      value: 84,
      unit: "mmHg",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "maintain normal range",
    },
    {
      key: "fasting_glucose",
      label: "Fasting glucose",
      value: 5.1,
      unit: "mmol/L",
      measured_at: "2025-09-01",
      source: "September 2025 health screening",
      target: "maintain normal range",
    },
  ],
  sleep_hours_target: "7–8",
  water_litres_target: "2.0–2.5",
  imported_at: new Date().toISOString(),
  avoid_summary: "",
  avoid_list: [],
}

function cloneDefault(): HealthProfile {
  return JSON.parse(JSON.stringify(DEFAULT_HEALTH_PROFILE)) as HealthProfile
}

export function loadHealthProfile(): HealthProfile {
  if (typeof window === "undefined") return cloneDefault()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneDefault()
    const parsed = JSON.parse(raw) as Partial<HealthProfile>
    if (!Array.isArray(parsed.metrics) || !Array.isArray(parsed.goals)) {
      return cloneDefault()
    }
    return { ...cloneDefault(), ...parsed }
  } catch {
    return cloneDefault()
  }
}

export function saveHealthProfile(profile: HealthProfile): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...profile, imported_at: new Date().toISOString() }),
  )
}

export function healthProfileIsStale(
  profile: HealthProfile,
  now = new Date(),
): boolean {
  const oldest = profile.metrics.map((metric) => metric.measured_at).sort()[0]
  if (!oldest) return false
  const measured = new Date(`${oldest}T00:00:00`).getTime()
  return now.getTime() - measured > 365 * 24 * 60 * 60 * 1000
}

export function summarizeHealthForPrompt(profile: HealthProfile): string {
  const metrics = profile.metrics
    .map(
      (metric) =>
        `- ${metric.label}: ${metric.value} ${metric.unit} (${metric.measured_at})`,
    )
    .join("\n")
  const avoidItems = profile.avoid_list ?? []
  const avoidLines = avoidItems.length
    ? avoidItems
        .map(
          (item) =>
            `- ${item.food} (${item.severity}${
              item.reason ? `: ${item.reason}` : ""
            })`,
        )
        .join("\n")
    : ""
  return [
    `Focus: ${profile.focus}`,
    `Health summary: ${profile.summary}`,
    `Goals: ${profile.goals.join("; ")}`,
    `Health report measurements:\n${metrics}`,
    avoidItems.length
      ? `Saved avoid list from the last check-up analysis:\n${avoidLines}\n(The user asked to be nudged away from these.)`
      : "",
    `Personal recommendations: ${profile.recommendations.join("; ")}`,
    "Treat report scores as user-provided report values, not diagnoses. Do not claim that food reverses a medical condition.",
  ]
    .filter(Boolean)
    .join("\n")
}
