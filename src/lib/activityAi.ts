// AI interpretation of an activity description.
//
// Integration boundary: this module is the only place that decides how a
// description becomes a structured draft. It prefers the app's existing AI
// provider (Gemini, same client used by src/lib/gemini.ts for meals) and, when
// the provider is unavailable — no API key, rate limit, network or timeout —
// it falls back to the on-device rule parser in src/lib/activityParse.ts and
// says so explicitly. Nothing here silently pretends a local guess is an AI
// response, and no calorie number is ever produced by the language model:
// energy estimates come from src/lib/calorieEstimate.ts (MET method).

import { callGeminiJSON } from "./gemini"
import { parseActivityDescription, type ActivityDraft } from "./activityParse"
import {
  ACTIVITY_TYPES,
  INTENSITIES,
  activityDisplayLabel,
} from "./activityMeta"
import { isISODate } from "./dates"
import type { ActivityType, Intensity, ISODate } from "./types"

export type DraftSource = "ai" | "local"

export interface DraftInterpretation {
  draft: ActivityDraft
  /** Where the interpretation came from — surfaced to the user verbatim. */
  source: DraftSource
  /** Set when the AI path failed and the local parser was used instead. */
  notice?: string
}

const AI_TIMEOUT_MS = 15_000

interface AiDraft {
  name?: unknown
  category?: unknown
  duration_min?: unknown
  distance_km?: unknown
  intensity?: unknown
  details?: unknown
  notes?: unknown
  date?: unknown
  time?: unknown
}

function text(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (
    !trimmed ||
    trimmed.toLowerCase() === "unknown" ||
    trimmed.toLowerCase() === "null"
  ) {
    return null
  }
  return trimmed.slice(0, max)
}

function minutes(value: unknown): number | null {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(n, 1440)
}

function kilometres(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  const rounded = Math.round(n * 100) / 100
  return rounded >= 0.05 && rounded <= 2000 ? rounded : null
}

function category(value: unknown): ActivityType | null {
  const v = typeof value === "string" ? value.toLowerCase().trim() : ""
  return (ACTIVITY_TYPES as string[]).includes(v) ? v as ActivityType : null
}

function intensity(value: unknown): Intensity | null {
  const v = typeof value === "string" ? value.toLowerCase().trim() : ""
  if (v === "unknown" || v === "not sure" || v === "unsure") return "unknown"
  return (INTENSITIES as string[]).includes(v) ? v as Intensity : null
}

function clockTime(value: unknown): string | null {
  const v = text(value, 8)
  if (!v) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(v)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, "0")}:${match[2]}`
}

function isoDate(value: unknown): ISODate | null {
  const v = text(value, 10)
  return v && isISODate(v) ? v : null
}

function promptFor(description: string): string {
  return `
You extract structured activity details from a plain-language description of exercise. You are a careful assistant: only report what the person actually said.

Description:
"""${description.slice(0, 1500)}"""

Return JSON with exactly these keys:
{
  "name": "<specific activity name as they described it, e.g. Swimming, Badminton, Hiking, or null if not stated>",
  "category": "<one of: walking, running, cycling, strength, sports, other, or null>",
  "duration_min": <total minutes as a number, or null if no duration was stated>,
  "distance_km": <distance in kilometres as a number, or null if not stated>,
  "intensity": "<one of: easy, moderate, vigorous, unknown>",
  "details": "<exercise specifics they mentioned — laps, sets/reps, elevation, pace, style — or null>",
  "notes": "<context they mentioned — conditions, breaks, how it felt — or null>",
  "date": "<yyyy-mm-dd if they clearly said today/yesterday, else null>",
  "time": "<HH:MM if they clearly stated a time or part of day, else null>"
}

Rules:
- Never estimate or invent. If something is not stated, return null (intensity defaults to "unknown").
- Convert any duration phrasing ("two hours", "40 mins") into minutes.
- "this morning" maps to time 08:00, "this afternoon" 14:00, "this evening" 18:00, "tonight" 20:00, with date today; "yesterday" sets date to yesterday.
- Do not include calorie, heart rate, pace or weight numbers unless the person said them.
- Keep details and notes under 160 characters each; do not add commentary.
Return JSON only.`.trim()
}

/**
 * Interpret a description into a form draft.
 * Never throws: a provider failure downgrades to the local parser with a
 * notice the UI is expected to show.
 */
export async function interpretActivityDescription(
  description: string,
): Promise<DraftInterpretation> {
  const local = parseActivityDescription(description)

  if (!description.trim()) {
    return { draft: local, source: "local" }
  }

  try {
    const raw = await withTimeout(
      callGeminiJSON<AiDraft>(promptFor(description)),
      AI_TIMEOUT_MS,
    )
    const aiName = text(raw?.name, 60)
    const aiCategory = category(raw?.category)
    const aiIntensity = intensity(raw?.intensity)
    const aiDetails = text(raw?.details)
    const aiNotes = text(raw?.notes)

    const name = aiName ?? local.name
    const draft: ActivityDraft = {
      name,
      category:
        aiCategory ??
        (name ? local.category : null) ??
        (aiName || aiIntensity || aiDetails || aiNotes ? local.category : null),
      duration_min: minutes(raw?.duration_min) ?? local.duration_min,
      duration_approximate: local.duration_approximate,
      distance_km: kilometres(raw?.distance_km) ?? local.distance_km,
      intensity: aiIntensity ?? local.intensity ?? "unknown",
      details: aiDetails ?? local.details,
      notes: aiNotes ?? local.notes,
      date: isoDate(raw?.date) ?? local.date,
      time: clockTime(raw?.time) ?? local.time,
    }

    // The model may still leave the name blank for unusual phrasing — the
    // local parser keeps a best-effort label so the form is never empty.
    if (!draft.name && draft.category) {
      draft.name = activityDisplayLabel({
        activity_type: draft.category,
        name: null,
      })
    }

    return { draft, source: "ai" }
  } catch (err) {
    console.warn(
      "interpretActivityDescription: falling back to local parse",
      err,
    )
    return {
      draft: local,
      source: "local",
      notice:
        "The AI service didn't respond, so your description was read on this device instead. Review the details before saving.",
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`AI request timed out after ${ms}ms`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
