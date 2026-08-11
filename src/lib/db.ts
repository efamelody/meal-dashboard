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
  UserProfile,
  DayOfWeek,
  MealType,
  StockStatus,
  DashboardSummary,
  DayCalories,
  MacroTotals,
  ISODate,
} from "./types"
import { STAPLE_ITEMS } from "./staples"

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"]

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

export async function addMeal(
  meal: Omit<Meal, "id" | "user_id">,
): Promise<Meal> {
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

  // Merge persisted slots into the canonical 7x3 grid so the planner always
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
        existing ?? {
          id: `${date}-${meal_type}`,
          user_id: userId,
          date,
          meal_type,
          meal_id: null,
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
): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from("meal_plan").upsert(
    {
      user_id: userId,
      date,
      meal_type: mealType,
      meal_id: mealId,
    },
    { onConflict: "user_id,date,meal_type" },
  )
  if (error) throw error
}

// ── Grocery List ──────────────────────────────────────────────────────────

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

export async function generateGroceryList(
  weekStart: ISODate,
): Promise<GroceryItem[]> {
  const userId = await getUserId()
  const [plan, meals, inventory] = await Promise.all([
    getMealPlan(weekStart),
    getMeals(),
    getInventory(),
  ])

  const inStockNames = new Set(
    inventory
      .filter((i) => i.stock_status === "in_stock")
      .map((i) => i.item_name.toLowerCase().trim()),
  )

  // Aggregate ingredients across all planned meals
  const totals = new Map<string, IngredientTotal>()
  for (const slot of plan) {
    if (!slot.meal_id) continue
    const meal = meals.find((m) => m.id === slot.meal_id)
    if (!meal) continue
    for (const ing of meal.ingredients) {
      const key = `${ing.item_name.toLowerCase().trim()}|${ing.unit}`
      const existing = totals.get(key)
      if (existing) {
        existing.quantity += ing.quantity
      } else {
        totals.set(key, { quantity: ing.quantity, unit: ing.unit })
      }
    }
  }

  const items = [...totals.entries()].map(([key, { quantity, unit }]) => ({
    item_name: key.split("|")[0],
    quantity,
    unit,
    is_bought: inStockNames.has(key.split("|")[0]),
  }))

  // Replace the whole list for this week: delete existing rows, then bulk insert.
  const { error: delError } = await supabase
    .from("grocery_list")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart)
  if (delError) throw delError

  if (!items.length) return []

  const { data, error } = await supabase
    .from("grocery_list")
    .insert(
      items.map((i) => ({ user_id: userId, week_start: weekStart, ...i })),
    )
    .select()
  if (error) throw error
  return (data ?? []).map(mapGrocery)
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
  const plannedMeals = plan
    .filter((slot) => slot.meal_id && mealById.has(slot.meal_id))
    .map((slot) => mealById.get(slot.meal_id!)!)

  const week: DayCalories[] = DAYS.map((day, i) => {
    const date = addDays(weekStart, i)
    const daySlots = plan.filter(
      (slot) =>
        slot.date === date && slot.meal_id && mealById.has(slot.meal_id),
    )
    return {
      day,
      plannedKcal: daySlots.reduce(
        (sum, slot) => sum + (mealById.get(slot.meal_id!)?.calories ?? 0),
        0,
      ),
      slots: daySlots.length,
    }
  })

  const plannedKcalTotal = week.reduce((sum, d) => sum + d.plannedKcal, 0)
  const weekAvgKcal = week.length
    ? Math.round(plannedKcalTotal / week.length)
    : 0

  const macroSum = plannedMeals.reduce(
    (acc, meal) => {
      acc.protein_g += meal.protein_g
      acc.carbs_g += meal.carbs_g
      acc.fat_g += meal.fat_g
      return acc
    },
    { protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
  const weekMacros: MacroTotals | null = plannedMeals.length
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
