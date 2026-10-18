// Meal log store — what the user actually ate, keyed `${date}-${meal_type}`.
// Backed by the `meal_log` table so logged intake follows the account across
// devices; signed-out previews fall back to localStorage as before. This
// module stays the single source of truth so Home, Plan, and Progress agree.

import { useCallback, useEffect, useRef, useState } from "react"
import type { ISODate, LoggedMeal, MealType } from "./types"
import { dateInWeek, startOfWeek } from "./dates"
import { supabase } from "./supabase"
import { useAuth } from "../context/AuthContext"

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

// Signed-out fallback store. Logs are keyed `${date}-${meal_type}`; a one-time
// migration re-bases entries stored under the old `${day}-${meal_type}` keys
// onto the current week. Entries logged here are pushed to the account on the
// next sign-in, then this store is cleared.
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

function toRow(userId: string, key: string, entry: LoggedMeal) {
  return {
    user_id: userId,
    date: key.slice(0, 10),
    meal_type: key.slice(11) as MealType,
    food: entry.food,
    calories: entry.calories,
    protein_g: entry.protein_g,
    carbs_g: entry.carbs_g,
    fat_g: entry.fat_g,
    updated_at: new Date().toISOString(),
  }
}

async function fetchMealLog(
  userId: string,
): Promise<Record<string, LoggedMeal>> {
  const { data, error } = await supabase
    .from("meal_log")
    .select("date, meal_type, food, calories, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
  if (error) {
    console.error("fetchMealLog:", error.message)
    return {}
  }
  const out: Record<string, LoggedMeal> = {}
  for (const row of data ?? []) {
    out[`${row.date}-${row.meal_type}`] = {
      food: row.food,
      calories: Number(row.calories),
      protein_g: Number(row.protein_g),
      carbs_g: Number(row.carbs_g),
      fat_g: Number(row.fat_g),
    }
  }
  return out
}

async function upsertMealLogEntry(
  userId: string,
  date: ISODate,
  type: MealType,
  entry: LoggedMeal,
): Promise<void> {
  const { error } = await supabase
    .from("meal_log")
    .upsert(toRow(userId, slotKey(date, type), entry), {
      onConflict: "user_id,date,meal_type",
    })
  if (error) throw error
}

async function upsertMealLogEntries(
  userId: string,
  entries: Record<string, LoggedMeal>,
): Promise<void> {
  const rows = Object.entries(entries).map(([key, entry]) =>
    toRow(userId, key, entry),
  )
  const { error } = await supabase
    .from("meal_log")
    .upsert(rows, { onConflict: "user_id,date,meal_type" })
  if (error) throw error
}

async function deleteMealLogEntry(
  userId: string,
  date: ISODate,
  type: MealType,
): Promise<void> {
  const { error } = await supabase
    .from("meal_log")
    .delete()
    .eq("user_id", userId)
    .eq("date", date)
    .eq("meal_type", type)
  if (error) throw error
}

export interface MealLogStore {
  log: Record<string, LoggedMeal>
  logMeal: (date: ISODate, type: MealType, entry: LoggedMeal) => void
  removeLog: (date: ISODate, type: MealType) => void
}

export function useMealLog(): MealLogStore {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [log, setLog] = useState<Record<string, LoggedMeal>>({})
  const logRef = useRef(log)
  const userIdRef = useRef(userId)

  const applyLog = useCallback((next: Record<string, LoggedMeal>) => {
    logRef.current = next
    setLog(next)
  }, [])

  useEffect(() => {
    userIdRef.current = userId
    let cancelled = false

    async function load() {
      if (!userId) {
        applyLog(loadMealLog())
        return
      }
      const remote = await fetchMealLog(userId)
      if (cancelled) return
      // One-time move of entries logged on this device before it synced:
      // local-only slots are pushed to the account, then the local copy
      // is cleared. Remote rows win on conflicts.
      const local = loadMealLog()
      const pending = Object.fromEntries(
        Object.entries(local).filter(([key]) => remote[key] === undefined),
      )
      applyLog({ ...pending, ...remote })
      if (Object.keys(local).length) {
        try {
          if (Object.keys(pending).length) {
            await upsertMealLogEntries(userId, pending)
          }
          saveMealLog({})
        } catch (err) {
          console.error("mealLog: local sync failed", err)
        }
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [userId, applyLog])

  const logMeal = useCallback(
    (date: ISODate, type: MealType, entry: LoggedMeal) => {
      const next = { ...logRef.current, [slotKey(date, type)]: entry }
      applyLog(next)
      const userId = userIdRef.current
      if (!userId) {
        saveMealLog(next)
        return
      }
      upsertMealLogEntry(userId, date, type, entry).catch((err) =>
        console.error("logMeal:", err),
      )
    },
    [applyLog],
  )

  const removeLog = useCallback(
    (date: ISODate, type: MealType) => {
      const next = { ...logRef.current }
      delete next[slotKey(date, type)]
      applyLog(next)
      const userId = userIdRef.current
      if (!userId) {
        saveMealLog(next)
        return
      }
      deleteMealLogEntry(userId, date, type).catch((err) =>
        console.error("removeLog:", err),
      )
    },
    [applyLog],
  )

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
