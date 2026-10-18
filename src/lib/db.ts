// Data layer — Supabase-backed, structure matches src/lib/types.ts.
// The app authenticates with the service-role key for now (single-user dev),
// which bypasses RLS. Function signatures are unchanged so pages don't care.
import { supabase, getUserId } from "./supabase"
import { addDays, startOfWeek } from "./dates"
import type {
  Meal,
  MealIngredient,
  InventoryItem,
  MealPlanSlot,
  GroceryItem,
  Activity,
  UserProfile,
  DayOfWeek,
  MealType,
  StockStatus,
  DashboardSummary,
  DayCalories,
  MacroTotals,
  ISODate,
  AppProfile,
  FriendRow,
  Friendship,
  FeedComment,
  FeedPost,
  PostKind,
  PostSnapshot,
} from "./types"
import { STAPLE_ITEMS } from "./staples"

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]

interface IngredientTotal {
  quantity: number
  unit: string
}

function mapIngredient(row: any): MealIngredient {
  return {
    id: row.id,
    meal_id: row.meal_id,
    item_name: row.item_name,
    quantity: Number(row.quantity),
    unit: row.unit,
  }
}

function mapMeal(row: any): Meal {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    calories: Number(row.calories),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    description: row.description ?? null,
    prep_time_min: row.prep_time_min ?? null,
    instructions: row.instructions ?? null,
    ingredients: (row.meal_ingredients ?? []).map(mapIngredient),
  }
}

function mapInventory(row: any): InventoryItem {
  return {
    id: row.id,
    user_id: row.user_id,
    item_name: row.item_name,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unit: row.unit ?? undefined,
    stock_status: row.stock_status as StockStatus,
  }
}

function mapGrocery(row: any): GroceryItem {
  return {
    id: row.id,
    user_id: row.user_id,
    week_start: row.week_start,
    item_name: row.item_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    is_bought: row.is_bought,
    source: row.source === "manual" ? "manual" : "plan",
  }
}

// ── Meals ──────────────────────────────────────────────────────────────────

export async function getMeals(): Promise<Meal[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("meals")
    .select("*, meal_ingredients(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("getMeals:", error.message)
    return []
  }
  return (data ?? []).map(mapMeal)
}

/** Ingredient as entered in the meal editor — no db ids yet. */
export interface MealIngredientDraft {
  item_name: string
  quantity: number
  unit: string
}

export interface MealInput {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  description?: string | null
  prep_time_min?: number | null
  instructions?: string | null
  ingredients: MealIngredientDraft[]
}

export async function addMeal(meal: MealInput): Promise<Meal> {
  const userId = await getUserId()
  const { data: mealRow, error: mealError } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      description: meal.description ?? null,
      prep_time_min: meal.prep_time_min ?? null,
      instructions: meal.instructions ?? null,
    })
    .select()
    .single()
  if (mealError) throw mealError

  let ingredients: MealIngredient[] = []
  const ings = meal.ingredients.map((i) => ({
    meal_id: mealRow.id,
    item_name: i.item_name,
    quantity: i.quantity,
    unit: i.unit,
  }))
  if (ings.length) {
    const { data: ingRows, error: ingError } = await supabase
      .from("meal_ingredients")
      .insert(ings)
      .select()
    if (ingError) throw ingError
    ingredients = (ingRows ?? []).map(mapIngredient)
  }

  return { ...mapMeal(mealRow), ingredients }
}

export interface MealChanges {
  name?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  description?: string | null
  prep_time_min?: number | null
  instructions?: string | null
  /** When provided, replaces the full ingredient list. */
  ingredients?: MealIngredientDraft[]
}

/**
 * Update an existing meal. Ingredient replacement is a deliberate
 * delete + insert inside the user's own meal (RLS-scoped), which matches
 * how addMeal builds the list.
 */
export async function updateMeal(
  id: string,
  changes: MealChanges,
): Promise<Meal> {
  const patch: Record<string, unknown> = {}
  const scalar: Array<keyof MealChanges> = [
    "name",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "description",
    "prep_time_min",
    "instructions",
  ]
  for (const key of scalar) {
    if (changes[key] !== undefined) patch[key] = changes[key]
  }

  if (Object.keys(patch).length) {
    const { error } = await supabase.from("meals").update(patch).eq("id", id)
    if (error) throw error
  }

  if (changes.ingredients) {
    const { error: delError } = await supabase
      .from("meal_ingredients")
      .delete()
      .eq("meal_id", id)
    if (delError) throw delError
    if (changes.ingredients.length) {
      const { error: insError } = await supabase
        .from("meal_ingredients")
        .insert(changes.ingredients.map((i) => ({ meal_id: id, ...i })))
      if (insError) throw insError
    }
  }

  const { data, error } = await supabase
    .from("meals")
    .select("*, meal_ingredients(*)")
    .eq("id", id)
    .single()
  if (error) throw error
  return mapMeal(data)
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id)
  if (error) throw error
}

export async function getIngredientSuggestions(): Promise<string[]> {
  const [meals, inventory] = await Promise.all([getMeals(), getInventory()])
  const names = new Set<string>()
  for (const staple of STAPLE_ITEMS) names.add(staple)
  for (const meal of meals) {
    for (const ing of meal.ingredients) names.add(ing.item_name.trim())
  }
  for (const item of inventory) names.add(item.item_name.trim())
  const ordered: string[] = []
  for (const staple of STAPLE_ITEMS) {
    if (names.has(staple)) ordered.push(staple)
  }
  const rest = [...names]
    .filter((n) => !ordered.includes(n))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  return [...ordered, ...rest].filter(Boolean)
}

// ── Inventory ─────────────────────────────────────────────────────────────

export async function getInventory(): Promise<InventoryItem[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("getInventory:", error.message)
    return []
  }
  return (data ?? []).map(mapInventory)
}

export async function addInventoryItem(
  item: Omit<InventoryItem, "id" | "user_id">,
): Promise<InventoryItem> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("inventory")
    .insert({
      user_id: userId,
      item_name: item.item_name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      stock_status: item.stock_status,
    })
    .select()
    .single()
  if (error) throw error
  return mapInventory(data)
}

export async function updateInventoryItem(
  id: string,
  changes: Partial<InventoryItem>,
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (changes.item_name !== undefined) patch.item_name = changes.item_name
  if (changes.quantity !== undefined) patch.quantity = changes.quantity
  if (changes.unit !== undefined) patch.unit = changes.unit
  if (changes.stock_status !== undefined)
    patch.stock_status = changes.stock_status
  const { error } = await supabase.from("inventory").update(patch).eq("id", id)
  if (error) throw error
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from("inventory").delete().eq("id", id)
  if (error) throw error
}

// ── Meal Plan ─────────────────────────────────────────────────────────────

export async function getMealPlan(weekStart: ISODate): Promise<MealPlanSlot[]> {
  const userId = await getUserId()
  const weekEnd = addDays(weekStart, 6)
  const { data, error } = await supabase
    .from("meal_plan")
    .select("*")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", weekEnd)
  if (error) {
    console.error("getMealPlan:", error.message)
    return []
  }

  // Merge persisted slots into the canonical 7x4 grid so the planner always
  // renders every day/meal-type cell regardless of how many rows exist.
  const byKey = new Map(
    (data ?? []).map((s) => [`${s.date}-${s.meal_type}`, s]),
  )
  const slots: MealPlanSlot[] = []
  for (let i = 0; i < DAYS.length; i++) {
    const date = addDays(weekStart, i)
    for (const meal_type of MEAL_TYPES) {
      const existing = byKey.get(`${date}-${meal_type}`)
      slots.push(
        existing
          ? { ...existing, servings: Number(existing.servings) || 1 }
          : {
              id: `${date}-${meal_type}`,
              user_id: userId,
              date,
              meal_type,
              meal_id: null,
              servings: 1,
            },
      )
    }
  }
  return slots
}

export async function updatePlanSlot(
  date: ISODate,
  mealType: MealType,
  mealId: string | null,
  servings = 1,
): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from("meal_plan").upsert(
    {
      user_id: userId,
      date,
      meal_type: mealType,
      meal_id: mealId,
      servings: Math.max(1, Math.round(servings)),
    },
    { onConflict: "user_id,date,meal_type" },
  )
  if (error) throw error
}

// ── Grocery List ──────────────────────────────────────────────────────────

type GroceryKeyable = {
  item_name: string
  unit: string
}

const groceryKey = (item: GroceryKeyable) =>
  `${item.item_name.toLowerCase().trim()}|${item.unit}`

export async function getGroceryList(
  weekStart: ISODate,
): Promise<GroceryItem[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("grocery_list")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("getGroceryList:", error.message)
    return []
  }
  return (data ?? []).map(mapGrocery)
}

/**
 * Canonical grocery requirement calculation for a week.
 *
 * Demand = sum of ingredient quantities across planned meals (scaled by each
 * slot's servings), grouped by (ingredient, unit). Comparison with inventory
 * only marks items already fully "in stock" as bought — it never changes
 * inventory quantities. Regeneration updates quantities in place and keeps:
 *   - purchased status on rows that still exist
 *   - manual (user-added) rows
 * Rows that are no longer required by the plan are removed.
 */
export async function generateGroceryList(
  weekStart: ISODate,
): Promise<GroceryItem[]> {
  const userId = await getUserId()
  const [plan, meals, inventory, existing] = await Promise.all([
    getMealPlan(weekStart),
    getMeals(),
    getInventory(),
    getGroceryList(weekStart),
  ])

  const inStockNames = new Set(
    inventory
      .filter((i) => i.stock_status === "in_stock")
      .map((i) => i.item_name.toLowerCase().trim()),
  )

  // Aggregate ingredients across all planned meals (servings-aware).
  const totals = new Map<string, IngredientTotal & { name: string }>()
  for (const slot of plan) {
    if (!slot.meal_id) continue
    const meal = meals.find((m) => m.id === slot.meal_id)
    if (!meal) continue
    const servings = slot.servings || 1
    for (const ing of meal.ingredients) {
      const key = `${ing.item_name.toLowerCase().trim()}|${ing.unit}`
      const existingTotal = totals.get(key)
      if (existingTotal) {
        existingTotal.quantity += ing.quantity * servings
      } else {
        totals.set(key, {
          name: ing.item_name.toLowerCase().trim(),
          quantity: ing.quantity * servings,
          unit: ing.unit,
        })
      }
    }
  }

  const desired = new Map(
    [...totals.entries()].map(([key, { name, quantity, unit }]) => [
      key,
      { name, quantity: Math.round(quantity * 100) / 100, unit },
    ]),
  )

  const planRows = existing.filter((g) => g.source === "plan")
  const existingByKey = new Map(planRows.map((g) => [groceryKey(g), g]))

  const updates: Array<{
    id: string
    quantity: number
  }> = []
  for (const [key, item] of desired) {
    const row = existingByKey.get(key)
    if (row && row.quantity !== item.quantity) {
      updates.push({ id: row.id, quantity: item.quantity })
    }
  }

  const staleIds = planRows
    .filter((g) => !desired.has(groceryKey(g)))
    .map((g) => g.id)
  if (staleIds.length) {
    const { error: delError } = await supabase
      .from("grocery_list")
      .delete()
      .in("id", staleIds)
    if (delError) throw delError
  }

  await Promise.all(
    updates.map(({ id, quantity }) =>
      supabase.from("grocery_list").update({ quantity }).eq("id", id),
    ),
  )

  const toInsert = [...desired.entries()]
    .filter(([key]) => !existingByKey.has(key))
    .map(([key, item]) => ({
      user_id: userId,
      week_start: weekStart,
      item_name: key.split("|")[0],
      quantity: item.quantity,
      unit: item.unit,
      source: "plan",
      is_bought: inStockNames.has(key.split("|")[0]),
    }))
  if (toInsert.length) {
    const { error } = await supabase.from("grocery_list").insert(toInsert)
    if (error) throw error
  }

  return getGroceryList(weekStart)
}

export async function addGroceryItem(
  weekStart: ISODate,
  item: {
    item_name: string
    quantity: number
    unit: string
  },
): Promise<GroceryItem> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("grocery_list")
    .insert({
      user_id: userId,
      week_start: weekStart,
      item_name: item.item_name.trim(),
      quantity: item.quantity,
      unit: item.unit,
      source: "manual",
      is_bought: false,
    })
    .select()
    .single()
  if (error) throw error
  return mapGrocery(data)
}

export async function updateGroceryItem(
  id: string,
  changes: { quantity?: number },
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (changes.quantity !== undefined) patch.quantity = changes.quantity
  if (!Object.keys(patch).length) return
  const { error } = await supabase
    .from("grocery_list")
    .update(patch)
    .eq("id", id)
  if (error) throw error
}

export async function removeGroceryItem(id: string): Promise<void> {
  const { error } = await supabase.from("grocery_list").delete().eq("id", id)
  if (error) throw error
}

export async function toggleGroceryItem(
  id: string,
  is_bought: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("grocery_list")
    .update({ is_bought })
    .eq("id", id)
  if (error) throw error
}

export async function clearGroceryList(weekStart: ISODate): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from("grocery_list")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart)
  if (error) throw error
}

// ── Fitness Profile ─────────────────────────────────────────────────────

function mapUserProfile(row: any): UserProfile {
  return {
    user_id: row.user_id,
    age: row.age,
    sex: row.sex,
    height_cm: Number(row.height_cm),
    weight_kg: Number(row.weight_kg),
    goal: row.goal,
    activity_level: row.activity_level,
    bmr_kcal: Number(row.bmr_kcal),
    tdee_kcal: Number(row.tdee_kcal),
    daily_calorie_target: Number(row.daily_calorie_target),
    protein_g_target: Number(row.protein_g_target),
    carbs_g_target: Number(row.carbs_g_target),
    fat_g_target: Number(row.fat_g_target),
    daily_activity_min: Number(row.daily_activity_min ?? 0),
    ai_notes: row.ai_notes,
    updated_at: row.updated_at,
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("getUserProfile:", error.message)
    return null
  }
  return data ? mapUserProfile(data) : null
}

export async function saveUserProfile(
  profile: Omit<UserProfile, "user_id" | "updated_at">,
): Promise<UserProfile> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        age: profile.age,
        sex: profile.sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal: profile.goal,
        activity_level: profile.activity_level,
        bmr_kcal: profile.bmr_kcal,
        tdee_kcal: profile.tdee_kcal,
        daily_calorie_target: profile.daily_calorie_target,
        protein_g_target: profile.protein_g_target,
        carbs_g_target: profile.carbs_g_target,
        fat_g_target: profile.fat_g_target,
        daily_activity_min: profile.daily_activity_min ?? 0,
        ai_notes: profile.ai_notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single()
  if (error) throw error
  return mapUserProfile(data)
}

// ── Activity ─────────────────────────────────────────────────────────────

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    activity_type: row.activity_type,
    duration_min: Number(row.duration_min),
    status: row.status,
    scheduled_time: row.scheduled_time ?? null,
    notes: row.notes ?? null,
    // Added by migration 006; undefined on rows written before it ran.
    name: row.name ?? null,
    distance_km: row.distance_km != null ? Number(row.distance_km) : null,
    intensity: row.intensity ?? null,
    details: row.details ?? null,
    shared_at: row.shared_at ?? null,
  }
}

/** PostgREST "column does not exist" → migration 006 has not been applied. */
function isMissingColumnError(error: {
  code?: string
  message?: string
}): boolean {
  if (error.code === "PGRST204") return true
  return /column .* (of relation .* )?does not exist|could not find the '/i.test(
    error.message ?? "",
  )
}

/**
 * When migration 006 is not applied yet, fold the universal fields into
 * `notes` so nothing the user typed is lost, and keep the row writable.
 * Layout: "Name · 5 km · moderate" first, then details, then notes.
 */
function packLegacyNotes(activity: Partial<Activity>): string | null {
  const head: string[] = []
  if (activity.name?.trim()) head.push(activity.name.trim())
  if (activity.distance_km != null) head.push(`${activity.distance_km} km`)
  if (activity.intensity && activity.intensity !== "unknown") {
    head.push(activity.intensity)
  }
  const body = [activity.details, activity.notes]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n")
  const packed = [head.join(" · "), body].filter(Boolean).join("\n")
  return packed || null
}

export async function getActivities(
  start: ISODate,
  end: ISODate,
): Promise<Activity[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) {
    console.error("getActivities:", error.message)
    return []
  }
  return (data ?? []).map(mapActivity)
}

export async function addActivity(
  activity: Omit<Activity, "id" | "user_id">,
): Promise<Activity> {
  const userId = await getUserId()
  const fullRow = {
    user_id: userId,
    date: activity.date,
    activity_type: activity.activity_type,
    duration_min: activity.duration_min,
    status: activity.status,
    scheduled_time: activity.scheduled_time ?? null,
    notes: activity.notes ?? null,
    name: activity.name ?? null,
    distance_km: activity.distance_km ?? null,
    intensity: activity.intensity ?? null,
    details: activity.details ?? null,
    shared_at: activity.shared_at ?? null,
  }

  let { data, error } = await supabase
    .from("activities")
    .insert(fullRow)
    .select()
    .single()

  if (error && isMissingColumnError(error)) {
    console.warn(
      "addActivity: migration 006 not applied — storing extras inside notes.",
    )
    ;({ data, error } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        date: activity.date,
        activity_type: activity.activity_type,
        duration_min: activity.duration_min,
        status: activity.status,
        scheduled_time: activity.scheduled_time ?? null,
        notes: packLegacyNotes(activity),
      })
      .select()
      .single())
  }

  if (error) throw error
  return mapActivity(data)
}

export async function updateActivity(
  id: string,
  changes: Partial<Omit<Activity, "id" | "user_id">>,
): Promise<void> {
  const patch: Record<string, unknown> = {}
  for (const key of [
    "date",
    "activity_type",
    "duration_min",
    "status",
    "scheduled_time",
    "notes",
    "name",
    "distance_km",
    "intensity",
    "details",
    "shared_at",
  ] as const) {
    if (changes[key] !== undefined) patch[key] = changes[key]
  }
  if (!Object.keys(patch).length) return
  let { error } = await supabase.from("activities").update(patch).eq("id", id)
  if (error && isMissingColumnError(error)) {
    // Migration 006 not applied — drop the new columns and keep the rest.
    for (const key of [
      "name",
      "distance_km",
      "intensity",
      "details",
      "shared_at",
    ]) {
      delete patch[key]
    }
    if (Object.keys(patch).length === 0) return
    ;({ error } = await supabase.from("activities").update(patch).eq("id", id))
  }
  if (error) throw error
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from("activities").delete().eq("id", id)
  if (error) throw error
}

// ── Home summary ─────────────────────────────────────────────────────────

export interface TodaySlot {
  date: ISODate
  meal_type: MealType
  meal: Meal | null
  servings: number
}

export interface HomeData {
  profile: UserProfile | null
  todaySlots: TodaySlot[]
  savedMeals: number
  inventory: {
    total: number
    inStock: number
    low: number
    out: number
  }
  grocery: {
    weekStart: ISODate
    total: number
    left: number
  }
  todayActivities: Activity[]
}

/**
 * Everything the Home dashboard shows, assembled in one place so the page
 * never re-implements plan/inventory/grocery math.
 */
export async function getHomeData(date: ISODate): Promise<HomeData> {
  const weekStart = startOfWeek()
  const dayEnd = date
  const [profile, plan, meals, inventory, grocery, activities] =
    await Promise.all([
      getUserProfile(),
      getMealPlan(weekStart),
      getMeals(),
      getInventory(),
      getGroceryList(weekStart),
      getActivities(date, dayEnd),
    ])

  const mealById = new Map(meals.map((m) => [m.id, m]))
  const todaySlots: TodaySlot[] = plan
    .filter((slot) => slot.date === date)
    .map((slot) => ({
      date: slot.date,
      meal_type: slot.meal_type,
      meal: slot.meal_id ? (mealById.get(slot.meal_id) ?? null) : null,
      servings: slot.servings || 1,
    }))

  const counts = inventory.reduce(
    (acc, item) => {
      acc[item.stock_status] += 1
      return acc
    },
    { in_stock: 0, low: 0, out: 0 } as Record<StockStatus, number>,
  )

  return {
    profile,
    todaySlots,
    savedMeals: meals.length,
    inventory: {
      total: inventory.length,
      inStock: counts.in_stock,
      low: counts.low,
      out: counts.out,
    },
    grocery: {
      weekStart,
      total: grocery.length,
      left: grocery.filter((g) => !g.is_bought).length,
    },
    todayActivities: activities,
  }
}

// ── Dashboard Summary ────────────────────────────────────────────────────

export async function getDashboardSummary(
  weekStart: ISODate = startOfWeek(),
): Promise<DashboardSummary> {
  const [meals, inventory, plan, grocery, profile] = await Promise.all([
    getMeals(),
    getInventory(),
    getMealPlan(weekStart),
    getGroceryList(weekStart),
    getUserProfile(),
  ])

  const mealById = new Map(meals.map((m) => [m.id, m]))
  const plannedSlots = plan.filter(
    (slot) => slot.meal_id && mealById.has(slot.meal_id),
  )

  const week: DayCalories[] = DAYS.map((day, i) => {
    const date = addDays(weekStart, i)
    const daySlots = plannedSlots.filter((slot) => slot.date === date)
    return {
      day,
      plannedKcal: daySlots.reduce(
        (sum, slot) =>
          sum +
          (mealById.get(slot.meal_id!)?.calories ?? 0) * (slot.servings || 1),
        0,
      ),
      slots: daySlots.length,
    }
  })

  const plannedKcalTotal = week.reduce((sum, d) => sum + d.plannedKcal, 0)
  const weekAvgKcal = week.length
    ? Math.round(plannedKcalTotal / week.length)
    : 0

  const macroSum = plannedSlots.reduce(
    (acc, slot) => {
      const meal = mealById.get(slot.meal_id!)
      const servings = slot.servings || 1
      acc.protein_g += meal ? meal.protein_g * servings : 0
      acc.carbs_g += meal ? meal.carbs_g * servings : 0
      acc.fat_g += meal ? meal.fat_g * servings : 0
      return acc
    },
    { protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
  const weekMacros: MacroTotals | null = plannedSlots.length
    ? {
        protein_g: Math.round(macroSum.protein_g),
        carbs_g: Math.round(macroSum.carbs_g),
        fat_g: Math.round(macroSum.fat_g),
      }
    : null

  const uniqueIngredients = new Set<string>()
  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      uniqueIngredients.add(ing.item_name.trim().toLowerCase())
    }
  }

  const inventoryCounts = inventory.reduce(
    (acc, item) => {
      acc[item.stock_status] = (acc[item.stock_status] ?? 0) + 1
      return acc
    },
    {} as Record<StockStatus, number>,
  )

  return {
    meals: meals.length,
    uniqueIngredients: uniqueIngredients.size,
    inStock: inventoryCounts.in_stock ?? 0,
    lowStock: inventoryCounts.low ?? 0,
    outOfStock: inventoryCounts.out ?? 0,
    plannedSlots: plan.filter((slot) => slot.meal_id).length,
    groceryTotal: grocery.length,
    groceryBought: grocery.filter((g) => g.is_bought).length,
    groceryLeft: grocery.filter((g) => !g.is_bought).length,
    week,
    weekAvgKcal,
    targetKcal: profile?.daily_calorie_target ?? null,
    weekMacros,
    dailyMacroTarget: profile
      ? {
          protein_g: profile.protein_g_target,

          carbs_g: profile.carbs_g_target,

          fat_g: profile.fat_g_target,
        }
      : null,

    profile,
  }
}

/* ── Community: profiles, friendships, feed ────────────────────────── */

function mapAppProfile(row: any): AppProfile {
  return {
    id: row.id,

    display_name: row.display_name ?? "",

    handle: row.handle ?? "",

    bio: row.bio ?? "",
  }
}

function mapFeedPost(
  row: any,
  likedIds: Set<string>,
  authors: Map<string, AppProfile>,
): FeedPost {
  return {
    id: row.id,

    author_id: row.author_id,

    kind: row.kind as PostKind,

    content: row.content ?? "",

    snapshot: row.snapshot ?? {},

    created_at: row.created_at,

    author: authors.get(row.author_id) ?? {
      id: row.author_id,
      display_name: "",
      handle: "member",
      bio: "",
    },

    likes: row.post_likes?.[0]?.count ?? 0,

    likedByMe: likedIds.has(row.id),

    comments: row.post_comments?.[0]?.count ?? 0,
  }
}

/** Fetch (or lazily create) the signed-in user's public community profile. */

export async function getOrCreateAppProfile(): Promise<AppProfile> {
  const userId = await getUserId()

  const { data: existing, error: selErr } = await supabase

    .from("app_profiles")

    .select("*")

    .eq("id", userId)

    .maybeSingle()

  if (selErr) throw new Error(`getOrCreateAppProfile: ${selErr.message}`)

  if (existing) return mapAppProfile(existing)

  const handle = `user_${userId.replace(/-/g, "").slice(0, 8)}`

  const { data: created, error: insErr } = await supabase

    .from("app_profiles")

    .insert({
      id: userId,

      display_name: "",

      handle,

      bio: "",
    })

    .select("*")

    .single()

  if (created) return mapAppProfile(created)

  // Insert raced or failed (e.g. handle taken) — re-read if the row exists.

  const { data: again } = await supabase

    .from("app_profiles")

    .select("*")

    .eq("id", userId)

    .maybeSingle()

  if (again) return mapAppProfile(again)

  throw new Error(
    `getOrCreateAppProfile: ${insErr?.message ?? "insert failed"}`,
  )
}

export async function saveAppProfile(changes: {
  display_name?: string

  handle?: string

  bio?: string
}): Promise<AppProfile> {
  const userId = await getUserId()

  const { data, error } = await supabase

    .from("app_profiles")

    .update({
      ...changes,

      updated_at: new Date().toISOString(),
    })

    .eq("id", userId)

    .select("*")

    .single()

  if (error) throw new Error(`saveAppProfile: ${error.message}`)

  return mapAppProfile(data)
}

export async function searchAppProfiles(query: string): Promise<AppProfile[]> {
  const userId = await getUserId()

  const q = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")

  if (q.length < 2) return []

  const { data, error } = await supabase

    .from("app_profiles")

    .select("*")

    .neq("id", userId)

    .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)

    .limit(8)

  if (error) {
    console.error("searchAppProfiles:", error.message)

    return []
  }

  return (data ?? []).map(mapAppProfile)
}

async function fetchFriendshipRows(): Promise<Friendship[]> {
  const userId = await getUserId()

  const { data, error } = await supabase

    .from("friendships")

    .select("*")

    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    .order("created_at", { ascending: true })

  if (error) throw new Error(`fetchFriendshipRows: ${error.message}`)

  return (data ?? []) as Friendship[]
}

/** App profiles for a list of user ids (single batched query). */

async function attachProfiles(ids: string[]): Promise<Map<string, AppProfile>> {
  const unique = [...new Set(ids)]

  const map = new Map<string, AppProfile>()

  if (unique.length === 0) return map

  const { data, error } = await supabase

    .from("app_profiles")

    .select("*")

    .in("id", unique)

  if (error) throw new Error(`attachProfiles: ${error.message}`)

  for (const row of data ?? []) {
    const profile = mapAppProfile(row)

    map.set(profile.id, profile)
  }

  return map
}

/** Peer profiles for a list of friendship rows (single batched query). */

async function attachPeers(
  rows: Friendship[],
): Promise<Map<string, AppProfile>> {
  if (rows.length === 0) return new Map()

  const peerIds = [
    ...new Set(
      rows.map((r) => r.requester_id).concat(rows.map((r) => r.addressee_id)),
    ),
  ]

  return attachProfiles(peerIds)
}

function toFriendRow(
  friendship: Friendship,

  userId: string,

  peers: Map<string, AppProfile>,
): FriendRow {
  const requesterIsMe = friendship.requester_id === userId

  const peerId = requesterIsMe
    ? friendship.addressee_id
    : friendship.requester_id

  return {
    id: friendship.id,

    status: friendship.status,

    created_at: friendship.created_at,

    requester_is_me: requesterIsMe,

    peer: peers.get(peerId) ?? {
      id: peerId,

      display_name: "",

      handle: "member",

      bio: "",
    },
  }
}

export async function getFriendships(): Promise<{
  friends: FriendRow[]

  incoming: FriendRow[]

  outgoing: FriendRow[]
}> {
  const userId = await getUserId()

  const rows = await fetchFriendshipRows()

  const peers = await attachPeers(rows)

  const mapped = rows.map((r) => toFriendRow(r, userId, peers))

  return {
    friends: mapped.filter((r) => r.status === "accepted"),

    incoming: mapped.filter(
      (r) => r.status === "pending" && !r.requester_is_me,
    ),

    outgoing: mapped.filter((r) => r.status === "pending" && r.requester_is_me),
  }
}

export async function sendFriendRequest(targetId: string): Promise<void> {
  const userId = await getUserId()

  const { error } = await supabase.from("friendships").insert({
    requester_id: userId,

    addressee_id: targetId,

    status: "pending",
  })

  if (error) throw new Error(`sendFriendRequest: ${error.message}`)
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase

    .from("friendships")

    .update({
      status: "accepted",

      accepted_at: new Date().toISOString(),
    })

    .eq("id", friendshipId)

  if (error) throw new Error(`acceptFriendRequest: ${error.message}`)
}

/** Decline an incoming request, cancel an outgoing one, or remove a friend. */

export async function deleteFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase

    .from("friendships")

    .delete()

    .eq("id", friendshipId)

  if (error) throw new Error(`deleteFriendship: ${error.message}`)
}

/** Feed: my posts + accepted friends', newest first, with counts. */

export async function getFeed(): Promise<FeedPost[]> {
  const userId = await getUserId()

  const { data: fRows, error: fErr } = await supabase

    .from("friendships")

    .select("requester_id, addressee_id, status")

    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    .eq("status", "accepted")

  if (fErr) throw new Error(`getFeed: ${fErr.message}`)

  const friendIds = (fRows ?? []).map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id,
  )

  const authorIds = [userId, ...friendIds]

  const { data, error } = await supabase

    .from("posts")

    .select("*, post_likes(count), post_comments(count)")

    .in("author_id", authorIds)

    .order("created_at", { ascending: false })

    .limit(50)

  if (error) throw new Error(`getFeed: ${error.message}`)

  const posts = data ?? []

  const postIds = posts.map((p) => p.id)

  const likedIds = new Set<string>()

  if (postIds.length > 0) {
    const { data: myLikes } = await supabase

      .from("post_likes")

      .select("post_id")

      .eq("user_id", userId)

      .in("post_id", postIds)

    for (const row of myLikes ?? []) likedIds.add(row.post_id)
  }

  const authors = await attachProfiles(posts.map((p) => p.author_id))

  return posts.map((row) => mapFeedPost(row, likedIds, authors))
}

export async function createPost(post: {
  kind: PostKind

  content: string

  snapshot: PostSnapshot
}): Promise<void> {
  const userId = await getUserId()

  const { error } = await supabase.from("posts").insert({
    author_id: userId,

    kind: post.kind,

    content: post.content,

    snapshot: post.snapshot,
  })

  if (error) throw new Error(`createPost: ${error.message}`)
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId)

  if (error) throw new Error(`deletePost: ${error.message}`)
}

export async function togglePostLike(
  postId: string,

  liked: boolean,
): Promise<void> {
  const userId = await getUserId()

  if (liked) {
    const { error } = await supabase.from("post_likes").upsert(
      {
        post_id: postId,

        user_id: userId,
      },

      {
        onConflict: "post_id,user_id",

        ignoreDuplicates: true,
      },
    )

    if (error) throw new Error(`togglePostLike: ${error.message}`)
  } else {
    const { error } = await supabase

      .from("post_likes")

      .delete()

      .eq("post_id", postId)

      .eq("user_id", userId)

    if (error) throw new Error(`togglePostLike: ${error.message}`)
  }
}

export async function addPostComment(
  postId: string,

  content: string,
): Promise<void> {
  const userId = await getUserId()

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,

    author_id: userId,

    content,
  })

  if (error) throw new Error(`addPostComment: ${error.message}`)
}

export async function getPostComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase

    .from("post_comments")

    .select("*")

    .eq("post_id", postId)

    .order("created_at", { ascending: true })

    .limit(100)

  if (error) throw new Error(`getPostComments: ${error.message}`)

  const rows = data ?? []

  const authors = await attachProfiles(rows.map((r) => r.author_id))

  return rows.map((row) => ({
    id: row.id,

    post_id: row.post_id,

    author_id: row.author_id,

    content: row.content,

    created_at: row.created_at,

    author: authors.get(row.author_id) ?? {
      id: row.author_id,
      display_name: "",
      handle: "member",
      bio: "",
    },
  }))
}
