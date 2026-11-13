// Universal activity form model: value shape, validation, and the mapping to
// a stored Activity. Kept out of the components so it can be reviewed and
// tested independently of the UI.

import { toISODate } from "./dates"
import type { Activity, ActivityType, Feel, ISODate, Intensity } from "./types"

export interface ActivityFormValue {
  /** Top-level category the user picked (drives the icon). */
  category: ActivityType
  /** The chosen type ("Walk", "Full body") or custom text for "other". */
  name: string
  /** Minutes as a string so the input stays editable while typing. */
  durationMin: string
  date: ISODate
  /** "HH:MM" or "" (optional). */
  time: string
  /** Self-reported effort. */
  effort: Intensity
  /** How it felt afterwards; "" = not chosen. */
  feel: Feel | ""
  /** Optional free-text description. */
  description: string
  share: boolean
  shareNote: string
}

export type ActivityFormField = "name" | "durationMin" | "date" | "shareNote"

export type ActivityFormErrors = Partial<Record<ActivityFormField, string>>

export const MAX_DURATION_MIN = 1440 // 24 h — supports multi-hour sessions
export const MAX_SHARE_NOTE = 280

export function emptyActivityForm(today: ISODate): ActivityFormValue {
  return {
    category: "cardio",
    name: "",
    durationMin: "30",
    date: today,
    time: "",
    effort: "moderate",
    feel: "",
    description: "",
    share: false,
    shareNote: "",
  }
}

export function validateActivityForm(
  value: ActivityFormValue,
): ActivityFormErrors {
  const errors: ActivityFormErrors = {}

  if (!value.name.trim()) {
    errors.name = "Pick what you did — or type your own."
  } else if (value.name.trim().length > 60) {
    errors.name = "Keep the name under 60 characters."
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

  if (value.share && value.shareNote.trim().length > MAX_SHARE_NOTE) {
    errors.shareNote = `Keep the shared message under ${MAX_SHARE_NOTE} characters.`
  }

  return errors
}

export interface ActivityInputDraft extends Omit<Activity, "id" | "user_id"> {}

/** Map the form onto a stored activity. */
export function toActivityInput(
  value: ActivityFormValue,
  today: ISODate = toISODate(new Date()),
): ActivityInputDraft {
  const duration = Math.max(1, Math.round(Number(value.durationMin) || 0))

  return {
    date: value.date,
    activity_type: value.category,
    duration_min: duration,
    // A future date is a plan, not a log — matches Home's planned/completed.
    status: value.date > today ? "planned" : "completed",
    scheduled_time: value.time.trim() || null,
    notes: value.description.trim() || null,
    name: value.name.trim(),
    intensity: value.effort,
    feel: value.feel || null,
    shared_at: value.share ? new Date().toISOString() : null,
  }
}
