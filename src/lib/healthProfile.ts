export interface HealthAvoidItem {
  food: string
  reason: string
  severity: "avoid" | "limit"
}

export interface HealthProfile {
  summary: string
  avoid_list?: HealthAvoidItem[]
  updated_at?: string
}

const STORAGE_KEY = "meal-kit-health-profile"

function emptyProfile(): HealthProfile {
  return { summary: "", avoid_list: [] }
}

export function loadHealthProfile(): HealthProfile {
  if (typeof window === "undefined") return emptyProfile()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProfile()
    const parsed = JSON.parse(raw) as Partial<HealthProfile>
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      avoid_list: Array.isArray(parsed.avoid_list) ? parsed.avoid_list : [],
      updated_at:
        typeof parsed.updated_at === "string" ? parsed.updated_at : undefined,
    }
  } catch {
    return emptyProfile()
  }
}

export function saveHealthProfile(profile: HealthProfile): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...profile, updated_at: new Date().toISOString() }),
  )
}

export function summarizeHealthForPrompt(profile: HealthProfile): string {
  const avoidList = profile.avoid_list ?? []
  const avoidLines = avoidList.length
    ? avoidList
        .map(
          (item) =>
            `- ${item.food} (${item.severity}${
              item.reason ? `: ${item.reason}` : ""
            })`,
        )
        .join("\n")
    : ""
  return [
    profile.summary
      ? `Health focus summary: ${profile.summary}`
      : "Health focus: none saved yet.",
    avoidLines.length
      ? `Saved avoid list from the check-up analysis:\n${avoidLines}\n(The user asked to be nudged away from these.)`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
}
