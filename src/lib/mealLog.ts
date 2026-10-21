// Meal log store — what the user actually ate, keyed `${date}-${meal_type}`.
//
// A slot holds one or more foods, so each entry keeps a list of food items and
// the `meal_log` table stores one row per food. Backed by Supabase so logged
// intake follows the account across devices; signed-out previews fall back to
// localStorage as before. This module stays the single source of truth so
// Home, Plan, and Progress agree.

import type { ISODate, LoggedFoodItem, LoggedMeal, MealType } from "./types"
import { dateInWeek, startOfWeek } from "./dates"
import { supabase } from "./supabase"

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

/**
 * Id for a food item. The `meal_log.id` column is a uuid, so the value has to
 * be a valid uuid — `crypto.randomUUID` is unavailable in insecure contexts,
 * hence the v4-shaped fallback.
 */
export function newFoodId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** The only place slot totals are derived, so they cannot drift from `foods`. */
export function buildLoggedMeal(foods: LoggedFoodItem[]): LoggedMeal {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  for (const food of foods) {
    totals.calories += food.calories
    totals.protein_g += food.protein_g
    totals.carbs_g += food.carbs_g
    totals.fat_g += food.fat_g
  }
  return { foods, ...totals }
}

interface LegacyLoggedMeal {
  food: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

function isLoggedMeal(value: unknown): value is LoggedMeal {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as LoggedMeal).foods)
  )
}

interface MigratedEntry {
  value: LoggedMeal
  changed: boolean
}

/**
 * Normalises a stored entry. Entries written before multi-food support hold a
 * single flat food and are wrapped into a one-item list.
 */
function migrateEntry(rawValue: unknown): MigratedEntry | null {
  if (isLoggedMeal(rawValue)) {
    return { value: buildLoggedMeal(rawValue.foods), changed: false }
  }
  if (typeof rawValue === "object" && rawValue !== null) {
    const legacy = rawValue as LegacyLoggedMeal
    if (typeof legacy.food === "string") {
      return {
        value: buildLoggedMeal([
          {
            id: newFoodId(),
            food: legacy.food,
            calories: Number(legacy.calories) || 0,
            protein_g: Number(legacy.protein_g) || 0,
            carbs_g: Number(legacy.carbs_g) || 0,
            fat_g: Number(legacy.fat_g) || 0,
          },
        ]),
        changed: true,
      }
    }
  }
  return null
}

// Signed-out fallback store. Logs are keyed `${date}-${meal_type}`; a one-time
// migration re-bases entries stored under the old `${day}-${meal_type}` keys
// onto the current week, and single-food entries are widened to food lists.
// Entries logged here are pushed to the account on the next sign-in, then
// this store is cleared.
export function loadMealLog(): Record<string, LoggedMeal> {
  try {
    const raw = window.localStorage.getItem(LOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    let changed = false
    const out: Record<string, LoggedMeal> = {}
    const weekStart = startOfWeek()
    for (const [key, rawValue] of Object.entries(parsed)) {
      const migrated = migrateEntry(rawValue)
      if (!migrated) {
        changed = true
        continue
      }
      if (migrated.changed) changed = true
      const match = key.match(/^(\w{3})-(\w+)$/)
      if (match && match[1] in DAY_OFFSET) {
        out[`${dateInWeek(weekStart, DAY_OFFSET[match[1]])}-${match[2]}`] =
          migrated.value
        changed = true
      } else {
        out[key] = migrated.value
      }
    }
    if (changed) window.localStorage.setItem(LOG_KEY, JSON.stringify(out))
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

// ── Remote (Supabase) access ───────────────────────────────────────────

// Migration 008 adds the `sort_order` column and drops the one-row-per-slot
// unique constraint; migration 009 adds the AI reasoning columns. Until they
// are applied the remote table is on an older shape, so every remote call has
// to degrade instead of failing: a silent failure here would blank the log or,
// worse, drop the rows for a slot.

/** Postgres: column does not exist. */
const PG_UNDEFINED_COLUMN = "42703"

/** Postgres: unique constraint violated. */
const PG_UNIQUE_VIOLATION = "23505"

interface MealLogRow {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  food: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sort_order?: number
  ai_dish?: string | null
  ai_portion?: string | null
  ai_justification?: string | null
  ai_confidence?: string | null
  user_correction?: string | null
  source?: string | null
  updated_at: string
}

interface MealLogRowOut {
  id: string
  date: string
  meal_type: MealType
  food: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sort_order?: number | null
  ai_dish?: string | null
  ai_portion?: string | null
  ai_justification?: string | null
  ai_confidence?: string | null
  user_correction?: string | null
  source?: string | null
  created_at?: string | null
}

const BASE_COLUMNS =
  "id, date, meal_type, food, calories, protein_g, carbs_g, fat_g"

const AI_COLUMNS =
  "ai_dish, ai_portion, ai_justification, ai_confidence, user_correction, source"

/**
 * The columns a project has, depending on which migrations it has applied.
 * The app probes for them instead of demanding the newest schema, so a
 * database that is a migration behind still logs meals.
 */
interface LogCapabilities {
  /** Migration 008: one row per food, ordered within a slot. */
  sortOrder: boolean
  /** Migration 009: the AI reasoning columns. */
  aiFields: boolean
}

const CAPABILITY_LADDER: LogCapabilities[] = [
  { sortOrder: true, aiFields: true },
  { sortOrder: false, aiFields: true },
  { sortOrder: true, aiFields: false },
  { sortOrder: false, aiFields: false },
]

/** The migrations a project still needs for the given capabilities. */
function missingMigrations(capabilities: LogCapabilities): string[] {
  const missing: string[] = []
  if (!capabilities.sortOrder) missing.push("008")
  if (!capabilities.aiFields) missing.push("009")
  return missing
}

/**
 * True when a failure means a migration has not been applied: a column is
 * missing, or the old unique constraint still rejects a second food for the
 * same slot.
 */
export function isMigrationMissing(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === PG_UNDEFINED_COLUMN || code === PG_UNIQUE_VIOLATION
}

/** A remote failure, tagged with the migrations that would fix it. */
export class MealLogSyncError extends Error {
  readonly missingMigrations: string[]

  constructor(message: string, missingMigrations: string[] = []) {
    super(message)
    this.name = "MealLogSyncError"
    this.missingMigrations = missingMigrations
  }
}

function toRow(
  userId: string,
  date: ISODate,
  type: MealType,
  food: LoggedFoodItem,
  sortOrder: number,
): MealLogRow {
  return {
    id: food.id,
    user_id: userId,
    date,
    meal_type: type,
    food: food.food,
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    sort_order: sortOrder,
    ai_dish: food.ai_dish ?? null,
    ai_portion: food.ai_portion ?? null,
    ai_justification: food.ai_justification ?? null,
    ai_confidence: food.ai_confidence ?? null,
    user_correction: food.user_correction ?? null,
    source: food.source ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Narrows a stored confidence to the values the app understands. */
function asConfidence(value: unknown): LoggedFoodItem["ai_confidence"] {
  const text = typeof value === "string" ? value.trim().toLowerCase() : ""
  return text === "low" || text === "medium" || text === "high" ? text : null
}

/** Narrows a stored source to the values the app understands. */
function asSource(value: unknown): LoggedFoodItem["source"] {
  const text = typeof value === "string" ? value.trim().toLowerCase() : ""
  return text === "ai" || text === "corrected" || text === "manual"
    ? text
    : null
}

function groupRows(rows: MealLogRowOut[]): Record<string, LoggedMeal> {
  const ordered = [...rows].sort((a, b) => {
    const byOrder = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (byOrder !== 0) return byOrder
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
  })
  const grouped = new Map<string, LoggedFoodItem[]>()
  for (const row of ordered) {
    const key = `${row.date}-${row.meal_type}`
    const foods = grouped.get(key) ?? []
    foods.push({
      id: row.id,
      food: row.food,
      calories: Number(row.calories),
      protein_g: Number(row.protein_g),
      carbs_g: Number(row.carbs_g),
      fat_g: Number(row.fat_g),
      ai_dish: row.ai_dish ?? null,
      ai_portion: row.ai_portion ?? null,
      ai_justification: row.ai_justification ?? null,
      ai_confidence: asConfidence(row.ai_confidence),
      user_correction: row.user_correction ?? null,
      source: asSource(row.source),
    })
    grouped.set(key, foods)
  }
  const out: Record<string, LoggedMeal> = {}
  for (const [key, foods] of grouped) out[key] = buildLoggedMeal(foods)
  return out
}

export interface FetchedMealLog {
  log: Record<string, LoggedMeal>
  /** Migrations the remote database still needs, e.g. ["009"]. */
  missingMigrations: string[]
}

/**
 * Reads every logged food for the user, grouped into meal slots. Probes for
 * the newest columns and falls back to the older shapes so an unapplied
 * migration shows the existing log instead of an empty one.
 */
export async function fetchMealLog(userId: string): Promise<FetchedMealLog> {
  let lastError: unknown = null
  for (const capabilities of CAPABILITY_LADDER) {
    const columns = [
      BASE_COLUMNS,
      capabilities.sortOrder ? "sort_order" : null,
      "created_at",
      capabilities.aiFields ? AI_COLUMNS : null,
    ]
      .filter(Boolean)
      .join(", ")
    const { data, error } = await supabase
      .from("meal_log")
      .select(columns)
      .eq("user_id", userId)
    if (!error) {
      return {
        log: groupRows((data ?? []) as unknown as MealLogRowOut[]),
        missingMigrations: missingMigrations(capabilities),
      }
    }
    if (!isMigrationMissing(error)) {
      throw new MealLogSyncError(error.message, [])
    }
    lastError = error
  }
  throw new MealLogSyncError(
    lastError instanceof Error
      ? lastError.message
      : "Could not read the meal log.",
    ["008", "009"],
  )
}

/** Drops the columns a project does not have yet. */
function toPayload(
  row: MealLogRow,
  index: number,
  capabilities: LogCapabilities,
): MealLogRow {
  const next: MealLogRow = { ...row }
  if (capabilities.sortOrder) {
    next.sort_order = row.sort_order ?? index
  } else {
    delete next.sort_order
  }
  if (!capabilities.aiFields) {
    delete next.ai_dish
    delete next.ai_portion
    delete next.ai_justification
    delete next.ai_confidence
    delete next.user_correction
    delete next.source
  }
  return next
}

/**
 * Inserts or updates the given foods by id. Falls back to the older column
 * sets when the project has not applied a migration yet. Throws on any other
 * failure, leaving the stored rows untouched.
 */
async function upsertRows(rows: MealLogRow[]): Promise<void> {
  let lastError: unknown = null
  for (const capabilities of CAPABILITY_LADDER) {
    const payload = rows.map((row, index) =>
      toPayload(row, index, capabilities),
    )
    const { error } = await supabase
      .from("meal_log")
      .upsert(payload, { onConflict: "id" })
    if (!error) return
    if (!isMigrationMissing(error)) {
      throw new MealLogSyncError(error.message, [])
    }
    // The old one-row-per-slot constraint is still in place. No column set
    // can work around that, so stop and point at the migration.
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new MealLogSyncError(error.message, ["008"])
    }
    lastError = error
  }
  throw new MealLogSyncError(
    lastError instanceof Error
      ? lastError.message
      : "Could not save the meal log.",
    ["008", "009"],
  )
}

/**
 * Replaces the foods in one slot. Writes first and only then removes the
 * foods the user deleted, so a failed write can never take the slot with it.
 */
export async function writeSlotFoods(
  userId: string,
  date: ISODate,
  type: MealType,
  foods: LoggedFoodItem[],
): Promise<void> {
  const existing = await supabase
    .from("meal_log")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("meal_type", type)
  if (existing.error) {
    throw new MealLogSyncError(
      existing.error.message,
      isMigrationMissing(existing.error) ? ["008"] : [],
    )
  }
  const existingIds = new Set((existing.data ?? []).map((row) => row.id))
  if (foods.length) {
    await upsertRows(
      foods.map((food, index) => toRow(userId, date, type, food, index)),
    )
  }
  const keepIds = new Set(foods.map((food) => food.id))
  const removed = [...existingIds].filter((id) => !keepIds.has(id))
  if (removed.length) {
    const { error } = await supabase
      .from("meal_log")
      .delete()
      .eq("user_id", userId)
      .in("id", removed)
    if (error) {
      throw new MealLogSyncError(
        error.message,
        isMigrationMissing(error) ? ["008"] : [],
      )
    }
  }
}

/** A slot that was logged on the device and still needs pushing to the account. */
export interface LocalLogEntry {
  date: ISODate
  type: MealType
  foods: LoggedFoodItem[]
}

/** Pushes entries logged on the device to the account. */
export async function pushLocalEntries(
  userId: string,
  entries: LocalLogEntry[],
): Promise<void> {
  for (const entry of entries) {
    if (!entry.foods.length) continue
    await upsertRows(
      entry.foods.map((food, index) =>
        toRow(userId, entry.date, entry.type, food, index),
      ),
    )
  }
}

export async function removeSlotRows(
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
  if (error) {
    throw new MealLogSyncError(
      error.message,
      isMigrationMissing(error) ? ["008"] : [],
    )
  }
}

export async function removeFoodRow(
  userId: string,
  foodId: string,
): Promise<void> {
  const { error } = await supabase
    .from("meal_log")
    .delete()
    .eq("user_id", userId)
    .eq("id", foodId)
  if (error) {
    throw new MealLogSyncError(
      error.message,
      isMigrationMissing(error) ? ["008"] : [],
    )
  }
}

export interface DayLogTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  /** Meal slots with at least one logged food. */
  count: number
  /** Individual foods logged across those slots. */
  foods: number
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
    foods: 0,
  }
  const prefix = `${date}-`
  for (const [key, entry] of Object.entries(log)) {
    if (!key.startsWith(prefix)) continue
    totals.calories += entry.calories
    totals.protein_g += entry.protein_g
    totals.carbs_g += entry.carbs_g
    totals.fat_g += entry.fat_g
    totals.count += 1
    totals.foods += entry.foods.length
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
