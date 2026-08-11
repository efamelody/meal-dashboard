// Week/date helpers for the week-aware planner.
// Weeks are Monday-start and dates are handled as ISO strings (yyyy-mm-dd).

import type { DayOfWeek, ISODate } from "./types"

export const DAYS: DayOfWeek[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]

const DAY_NAMES: Record<DayOfWeek, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISODate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function isISODate(value: string | null | undefined): value is ISODate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toISODate(parseISODate(value)) === value
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// Monday of the week containing `date` (defaults to today).
export function startOfWeek(date: Date = new Date()): ISODate {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return toISODate(d)
}

// Date of the n-th day (Mon=0 … Sun=6) in the week starting at weekStart.
export function dateInWeek(weekStart: ISODate, index: number): ISODate {
  return addDays(weekStart, index)
}

// e.g. "Mon 10", "Sun 16"
export function dayShortLabel(weekStart: ISODate, index: number): string {
  const d = parseISODate(dateInWeek(weekStart, index))
  return `${DAYS[index]} ${d.getDate()}`
}

export function dayFullLabel(day: DayOfWeek): string {
  return DAY_NAMES[day]
}

function shortMonthDay(date: ISODate): string {
  const d = parseISODate(date)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// e.g. "Aug 10 – Aug 16, 2026"
export function weekRangeLabel(weekStart: ISODate): string {
  const weekEnd = addDays(weekStart, 6)
  const endYear = parseISODate(weekEnd).getFullYear()
  const startYear = parseISODate(weekStart).getFullYear()
  if (startYear !== endYear) {
    return `${shortMonthDay(weekStart)}, ${startYear} – ${shortMonthDay(
      weekEnd,
    )}, ${endYear}`
  }
  return `${shortMonthDay(weekStart)} – ${shortMonthDay(weekEnd)}, ${endYear}`
}
