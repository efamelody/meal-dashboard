// Meal log store — the single source of truth for what the user actually ate.
//
// One provider owns the state so Home, Plan, Progress, and Community all read
// the same log instead of each fetching its own copy. Remote data lives in
// Supabase (`meal_log`, one row per food); localStorage is only the
// signed-out fallback and the hand-off buffer for entries logged before the
// device was signed in.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { PropsWithChildren } from "react"
import type {
  ISODate,
  LoggedFoodItem,
  LoggedMeal,
  MealType,
} from "../lib/types"
import {
  buildLoggedMeal,
  fetchMealLog,
  loadMealLog,
  MealLogSyncError,
  pushLocalEntries,
  removeFoodRow,
  removeSlotRows,
  saveMealLog,
  slotKey,
  writeSlotFoods,
} from "../lib/mealLog"
import { useAuth } from "./AuthContext"

export interface MealLogStore {
  log: Record<string, LoggedMeal>
  /** Replaces every food in a slot. An empty list clears the slot. */
  saveSlotFoods: (
    date: ISODate,
    type: MealType,
    foods: LoggedFoodItem[],
  ) => void
  removeFood: (date: ISODate, type: MealType, foodId: string) => void
  removeLog: (date: ISODate, type: MealType) => void
  /** Migrations the remote database has not applied yet, e.g. ["009"]. */
  pendingMigrations: string[]
  /** Last failure talking to the remote database, if any. */
  syncError: string | null
}

const MealLogContext = createContext<MealLogStore | null>(null)

function toEntry(key: string, entry: LoggedMeal) {
  return {
    date: key.slice(0, 10) as ISODate,
    type: key.slice(11) as MealType,
    foods: entry.foods,
  }
}

export function MealLogProvider({ children }: PropsWithChildren) {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [log, setLog] = useState<Record<string, LoggedMeal>>({})
  const [pendingMigrations, setPendingMigrations] = useState<string[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const logRef = useRef(log)
  const userIdRef = useRef(userId)

  const applyLog = useCallback((next: Record<string, LoggedMeal>) => {
    logRef.current = next
    setLog(next)
  }, [])

  const reportError = useCallback((err: unknown, context: string) => {
    const message = err instanceof Error ? err.message : String(err)
    setSyncError(message)
    if (err instanceof MealLogSyncError && err.missingMigrations.length) {
      setPendingMigrations(err.missingMigrations)
    }
    console.error(context, err)
  }, [])

  /**
   * Loads the account's log and folds in anything logged on this device
   * before it was signed in. Remote rows win on conflicts.
   */
  const load = useCallback(
    async (uid: string) => {
      const { log: remote, missingMigrations } = await fetchMealLog(uid)
      setPendingMigrations(missingMigrations)
      const local = loadMealLog()
      const pending = Object.entries(local).filter(
        ([key]) => remote[key] === undefined,
      )
      applyLog({
        ...Object.fromEntries(pending),
        ...remote,
      })
      if (Object.keys(local).length) {
        try {
          await pushLocalEntries(
            uid,
            pending.map(([key, entry]) => toEntry(key, entry)),
          )
          saveMealLog({})
        } catch (err) {
          console.error("mealLog: local sync failed", err)
        }
      }
    },
    [applyLog],
  )

  useEffect(() => {
    userIdRef.current = userId
    let cancelled = false

    async function run() {
      if (!userId) {
        applyLog(loadMealLog())
        setPendingMigrations([])
        setSyncError(null)
        return
      }
      try {
        await load(userId)
      } catch (err) {
        if (cancelled) return
        reportError(err, "mealLog: load failed")
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [userId, load, applyLog, reportError])

  const saveSlotFoods = useCallback(
    (date: ISODate, type: MealType, foods: LoggedFoodItem[]) => {
      const key = slotKey(date, type)
      const next = { ...logRef.current }
      if (foods.length) {
        next[key] = buildLoggedMeal(foods)
      } else {
        delete next[key]
      }
      applyLog(next)
      const uid = userIdRef.current
      if (!uid) {
        saveMealLog(next)
        return
      }
      writeSlotFoods(uid, date, type, foods).catch(async (err) => {
        reportError(err, "saveSlotFoods:")
        // The remote write failed, so the stored slot still holds the old
        // food. Pull it back so the screen matches the database.
        try {
          await load(uid)
        } catch {
          // The banner already explains what went wrong.
        }
      })
    },
    [applyLog, load, reportError],
  )

  const removeFood = useCallback(
    (date: ISODate, type: MealType, foodId: string) => {
      const key = slotKey(date, type)
      const current = logRef.current[key]
      if (!current) return
      const foods = current.foods.filter((food) => food.id !== foodId)
      const next = { ...logRef.current }
      if (foods.length) {
        next[key] = buildLoggedMeal(foods)
      } else {
        delete next[key]
      }
      applyLog(next)
      const uid = userIdRef.current
      if (!uid) {
        saveMealLog(next)
        return
      }
      removeFoodRow(uid, foodId).catch((err) => reportError(err, "removeFood:"))
    },
    [applyLog, reportError],
  )

  const removeLog = useCallback(
    (date: ISODate, type: MealType) => {
      const next = { ...logRef.current }
      delete next[slotKey(date, type)]
      applyLog(next)
      const uid = userIdRef.current
      if (!uid) {
        saveMealLog(next)
        return
      }
      removeSlotRows(uid, date, type).catch((err) =>
        reportError(err, "removeLog:"),
      )
    },
    [applyLog, reportError],
  )

  const value = useMemo<MealLogStore>(
    () => ({
      log,
      saveSlotFoods,
      removeFood,
      removeLog,
      pendingMigrations,
      syncError,
    }),
    [log, saveSlotFoods, removeFood, removeLog, pendingMigrations, syncError],
  )

  return (
    <MealLogContext.Provider value={value}>{children}</MealLogContext.Provider>
  )
}

export function useMealLog(): MealLogStore {
  const store = useContext(MealLogContext)
  if (!store) {
    throw new Error("useMealLog must be used inside <MealLogProvider>")
  }
  return store
}
