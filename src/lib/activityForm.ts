// Universal activity form model: value shape, validation, and the mapping to
// a stored Activity. Kept out of the components so it can be reviewed and
// tested independently of the UI.

import { toISODate } from "./dates"
import { inferActivityCategory } from "./activityMeta"
import type { Activity, ISODate, Intensity } from "./types"

export interface ActivityFormValue {
  /** Free text — any activity name the user types. */
  name: string
  /** Minutes as a string so the input stays editable while typing. */
  durationMin: string
  date: ISODate
  /** "HH:MM" or "" (optional). */
  time: string
  /** Kilometres as a string; "" = not provided. */
  distanceKm: string
  intensity: Intensity
  details: string
  notes: string
  share: boolean
  shareNote: string
}

export type ActivityFormField = "name" | "durationMin" | "date" | "distanceKm" | "shareNote"

export type ActivityFormErrors = Partial<Record<ActivityFormField, string>>

export const MAX_DURATION_MIN = 1440 // 24 h — supports multi-hour sessions
export const MAX_SHARE_NOTE = 280

export function emptyActivityForm(today: ISODate): ActivityFormValue {
  return {
    name: "",
    durationMin: "30",
    date: today,
    time: "",
    distanceKm: "",
    intensity: "unknown",
    details: "",
    notes: "",
    share: false,
    shareNote: "",
  }
}

export function validateActivityForm(
  value: ActivityFormValue,
): ActivityFormErrors {
  const errors: ActivityFormErrors = {}

  const name = value.name.trim()
  if (!name) {
    errors.name = "Add what you did — e.g. Swimming, a walk, or a gym session."
  } else if (name.length > 60) {
    errors.name = "Keep the activity name under 60 characters."
  }

  const rawDuration = value.durationMin.trim()
  const duration = Number(rawDuration)
  if (!rawDuration) {
    errors.durationMin = "Duration is required — how long did you move?"
  } else if (!Number.isFinite(duration)) {
    errors.durationMin = "Enter duration in minutes as a number."
  } else if (duration < 1) {
    errors.durationMin = "Duration must be at least 1 minute."
  } else if (duration > MAX_DURATION_MIN) {
    errors.durationMin = `That's over 24 hours — enter ${MAX_DURATION_MIN} minutes or less.`
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
    errors.date = "Pick a valid date."
  }

  if (value.distanceKm.trim()) {
    const distance = Number(value.distanceKm)
    if (!Number.isFinite(distance) || distance <= 0) {
      errors.distanceKm = "Distance must be a positive number in kilometres."
    } else if (distance > 2000) {
      errors.distanceKm = "That distance looks too large — kilometres only."
    }
  }

  if (value.share && value.shareNote.trim().length > MAX_SHARE_NOTE) {
    errors.shareNote = `Keep the shared message under ${MAX_SHARE_NOTE} characters.`
  }

  return errors
}

export interface ActivityInputDraft extends Omit<Activity, "id" | "user_id"> {}

/** Map the form onto a stored activity (category inferred from the name). */
export function toActivityInput(
  value: ActivityFormValue,
  today: ISODate = toISODate(new Date()),
): ActivityInputDraft {
  const duration = Math.max(1, Math.round(Number(value.durationMin) || 0))
  const distance = value.distanceKm.trim()
    ? Math.round(Number(value.distanceKm) * 100) / 100
    : null

  return {
    date: value.date,
    activity_type: inferActivityCategory(value.name),
    duration_min: duration,
    // A future date is a plan, not a log — matches Home's planned/completed.
    status: value.date > today ? "planned" : "completed",
    scheduled_time: value.time.trim() || null,
    notes: value.notes.trim() || null,
    name: value.name.trim(),
    distance_km: Number.isFinite(distance as number) ? distance : null,
    intensity: value.intensity,
    details: value.details.trim() || null,
    shared_at: value.share ? new Date().toISOString() : null,
  }
}

/** Human summary of what the user actually provided (for the estimate card). */
export function providedFacts(value: ActivityFormValue): string[] {
  const facts: string[] = []
  if (value.name.trim()) facts.push(value.name.trim())
  const duration = Number(value.durationMin)
  if (Number.isFinite(duration) && duration > 0) facts.push(`${duration} min`)
  if (value.distanceKm.trim()) facts.push(`${value.distanceKm.trim()} km`)
  if (value.time.trim()) facts.push(`at ${value.time.trim()}`)
  if (value.details.trim()) facts.push(value.details.trim())
  return facts
}
