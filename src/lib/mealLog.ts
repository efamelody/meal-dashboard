// Meal log store — what the user actually ate, keyed `${date}-${meal_type}`.
// Kept in localStorage exactly as the planner always did; this module is the
// single source of truth so Home, Plan, and Progress agree on logged intake.

import { useCallback, useState } from "react"
import type { ISODate, LoggedMeal, MealType } from "./types"
import { dateInWeek, startOfWeek } from "./dates"

const LOG_KEY = "meal-kit-planner-log"

const DAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

export function slotKey(date: ISODate, type: MealType): string {
  return `${date}-${type}`
}

// Logs are keyed `${date}-${meal_type}`. One-time migration re-bases logs
// stored under the old `${day}-${meal_type}` keys onto the current week.
export function loadMealLog(): Record<string, LoggedMeal> {
  try {
    const raw = window.localStorage.getItem(LOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LoggedMeal>
    let migrated = false
    const out: Record<string, LoggedMeal> = {}
    const weekStart = startOfWeek()
    for (const [key, value] of Object.entries(parsed)) {
      const match = key.match(/^(\w{3})-(\w+)$/)
      if (match && match[1] in DAY_OFFSET) {
        out[`${dateInWeek(weekStart, DAY_OFFSET[match[1]])}-${match[2]}`] =
          value
        migrated = true
      } else {
        out[key] = value
      }
    }
    if (migrated) window.localStorage.setItem(LOG_KEY, JSON.stringify(out))
    return out
  } catch {
    return {}
  }
}

export function saveMealLog(log: Record<string, LoggedMeal>): void {
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log))
  } catch {
    // Storage unavailable (private mode) — the in-memory copy still works.
  }
}

export interface MealLogStore {
  log: Record<string, LoggedMeal>
  logMeal: (date: ISODate, type: MealType, entry: LoggedMeal) => void
  removeLog: (date: ISODate, type: MealType) => void
}

export function useMealLog(): MealLogStore {
  const [log, setLog] = useState<Record<string, LoggedMeal>>(loadMealLog)

  const logMeal = useCallback(
    (date: ISODate, type: MealType, entry: LoggedMeal) => {
      setLog((prev) => {
        const next = { ...prev, [slotKey(date, type)]: entry }
        saveMealLog(next)
        return next
      })
    },
    [],
  )

  const removeLog = useCallback((date: ISODate, type: MealType) => {
    setLog((prev) => {
      const next = { ...prev }
      delete next[slotKey(date, type)]
      saveMealLog(next)
      return next
    })
  }, [])

  return { log, logMeal, removeLog }
}

export interface DayLogTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  count: number
}

export function totalsForDate(
  log: Record<string, LoggedMeal>,
  date: ISODate,
): DayLogTotals {
  const totals: DayLogTotals = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    count: 0,
  }
  const prefix = `${date}-`
  for (const [key, entry] of Object.entries(log)) {
    if (!key.startsWith(prefix)) continue
    totals.calories += entry.calories
    totals.protein_g += entry.protein_g
    totals.carbs_g += entry.carbs_g
    totals.fat_g += entry.fat_g
    totals.count += 1
  }
  return totals
}

export function entriesForDate(
  log: Record<string, LoggedMeal>,
  date: ISODate,
): Array<{
  type: MealType
  entry: LoggedMeal
}> {
  const prefix = `${date}-`
  const out: Array<{
    type: MealType
    entry: LoggedMeal
  }> = []
  for (const [key, entry] of Object.entries(log)) {
    if (!key.startsWith(prefix)) continue
    const type = key.slice(prefix.length) as MealType
    out.push({ type, entry })
  }
  return out
}

/** Number of distinct dates that have at least one logged meal. */
export function loggedDates(log: Record<string, LoggedMeal>): Set<ISODate> {
  const dates = new Set<ISODate>()
  for (const key of Object.keys(log)) dates.add(key.slice(0, 10))
  return dates
}
