// Sample data shown to visitors who haven't signed in yet ("preview mode").
// Everything here is a local constant — anonymous users never touch the real
// tables (no anon grants, RLS blocks them anyway). Sign in to see your own data.
import { DAYS, dateInWeek, startOfWeek } from "./dates"
import type {
  DashboardSummary,
  GroceryItem,
  InventoryItem,
  Meal,
  MealPlanSlot,
  UserProfile,
} from "./types"

const DEMO_USER = "demo-user"

const M1: Meal = {
  id: "demo-m1",
  user_id: DEMO_USER,
  name: "Nasi Lemak",
  calories: 644,
  protein_g: 14,
  carbs_g: 71,
  fat_g: 33,
  ingredients: [
    { id: "demo-m1-i1", meal_id: "demo-m1", item_name: "Coconut rice", quantity: 200, unit: "g" },
    { id: "demo-m1-i2", meal_id: "demo-m1", item_name: "Sambal", quantity: 40, unit: "g" },
    { id: "demo-m1-i3", meal_id: "demo-m1", item_name: "Boiled egg", quantity: 1, unit: "piece" },
    { id: "demo-m1-i4", meal_id: "demo-m1", item_name: "Cucumber", quantity: 30, unit: "g" },
  ],
}

const M2: Meal = {
  id: "demo-m2",
  user_id: DEMO_USER,
  name: "Hainanese Chicken Rice",
  calories: 620,
  protein_g: 32,
  carbs_g: 70,
  fat_g: 23,
  ingredients: [
    { id: "demo-m2-i1", meal_id: "demo-m2", item_name: "Chicken", quantity: 150, unit: "g" },
    { id: "demo-m2-i2", meal_id: "demo-m2", item_name: "Jasmine rice", quantity: 200, unit: "g" },
    { id: "demo-m2-i3", meal_id: "demo-m2", item_name: "Ginger chilli sauce", quantity: 30, unit: "g" },
  ],
}

const M3: Meal = {
  id: "demo-m3",
  user_id: DEMO_USER,
  name: "Oatmeal with Banana",
  calories: 330,
  protein_g: 9,
  carbs_g: 58,
  fat_g: 7,
  ingredients: [
    { id: "demo-m3-i1", meal_id: "demo-m3", item_name: "Rolled oats", quantity: 50, unit: "g" },
    { id: "demo-m3-i2", meal_id: "demo-m3", item_name: "Milk", quantity: 150, unit: "ml" },
    { id: "demo-m3-i3", meal_id: "demo-m3", item_name: "Banana", quantity: 1, unit: "piece" },
  ],
}

export const demoMeals: Meal[] = [M1, M2, M3]

export const demoInventory: InventoryItem[] = [
  { id: "demo-inv-1", user_id: DEMO_USER, item_name: "Jasmine rice", quantity: 2, unit: "kg", stock_status: "in_stock" },
  { id: "demo-inv-2", user_id: DEMO_USER, item_name: "Chicken", quantity: 500, unit: "g", stock_status: "in_stock" },
  { id: "demo-inv-3", user_id: DEMO_USER, item_name: "Eggs", quantity: 3, unit: "piece", stock_status: "low" },
  { id: "demo-inv-4", user_id: DEMO_USER, item_name: "Banana", quantity: 4, unit: "piece", stock_status: "in_stock" },
  { id: "demo-inv-5", user_id: DEMO_USER, item_name: "Coconut milk", quantity: 0, unit: "ml", stock_status: "out" },
  { id: "demo-inv-6", user_id: DEMO_USER, item_name: "Cucumber", quantity: 1, unit: "piece", stock_status: "in_stock" },
]

const DEMO_WEEK = startOfWeek()

export const demoPlan: MealPlanSlot[] = (() => {
  const slots: MealPlanSlot[] = []
  const filled: Array<[number, string, string]> = [
    [0, "Breakfast", M1.id],
    [0, "Lunch", M2.id],
    [1, "Dinner", M3.id],
    [2, "Lunch", M2.id],
    [4, "Breakfast", M3.id],
    [6, "Lunch", M1.id],
  ]
  for (const [dayIdx, mealType, mealId] of filled) {
    const date = dateInWeek(DEMO_WEEK, dayIdx)
    slots.push({
      id: `demo-plan-${date}-${mealType}`,
      user_id: DEMO_USER,
      date,
      meal_type: mealType as MealPlanSlot["meal_type"],
      meal_id: mealId,
    })
  }
  return slots
})()

export const demoGrocery: GroceryItem[] = [
  { id: "demo-gro-1", user_id: DEMO_USER, week_start: DEMO_WEEK, item_name: "Sambal", quantity: 1, unit: "jar", is_bought: true },
  { id: "demo-gro-2", user_id: DEMO_USER, week_start: DEMO_WEEK, item_name: "Jasmine rice", quantity: 1, unit: "kg", is_bought: false },
  { id: "demo-gro-3", user_id: DEMO_USER, week_start: DEMO_WEEK, item_name: "Ginger chilli sauce", quantity: 1, unit: "bottle", is_bought: false },
  { id: "demo-gro-4", user_id: DEMO_USER, week_start: DEMO_WEEK, item_name: "Coconut milk", quantity: 200, unit: "ml", is_bought: false },
]

export const demoProfile: UserProfile = {
  user_id: DEMO_USER,
  age: 25,
  sex: "female",
  height_cm: 165,
  weight_kg: 60,
  goal: "maintain",
  activity_level: "moderate",
  bmr_kcal: 1380,
  tdee_kcal: 1990,
  daily_calorie_target: 2000,
  protein_g_target: 120,
  carbs_g_target: 220,
  fat_g_target: 65,
  ai_notes: "Sample profile — sign in to create your own.",
  updated_at: new Date().toISOString(),
}

export const demoSuggestions: string[] = [
  "Coconut rice",
  "Sambal",
  "Boiled egg",
  "Cucumber",
  "Chicken",
  "Jasmine rice",
  "Ginger chilli sauce",
  "Rolled oats",
  "Milk",
  "Banana",
]

export function buildDemoSummary(): DashboardSummary {
  const plan = demoPlan
  const plannedMeals = plan
    .map((slot) => demoMeals.find((m) => m.id === slot.meal_id))
    .filter((m): m is Meal => Boolean(m))

  const week = DAYS.map((day, idx) => {
    const date = dateInWeek(DEMO_WEEK, idx)
    const daySlots = plan.filter((s) => s.date === date && s.meal_id)
    return {
      day,
      plannedKcal: daySlots.reduce((sum, s) => {
        const meal = demoMeals.find((m) => m.id === s.meal_id)
        return sum + (meal?.calories ?? 0)
      }, 0),
      slots: daySlots.length,
    }
  })

  const plannedKcalTotal = week.reduce((sum, d) => sum + d.plannedKcal, 0)

  const macroSum = plannedMeals.reduce(
    (acc, meal) => {
      acc.protein_g += meal.protein_g
      acc.carbs_g += meal.carbs_g
      acc.fat_g += meal.fat_g
      return acc
    },
    { protein_g: 0, carbs_g: 0, fat_g: 0 },
  )

  const uniqueIngredients = new Set<string>()
  for (const meal of demoMeals) {
    for (const ing of meal.ingredients) {
      uniqueIngredients.add(ing.item_name.trim().toLowerCase())
    }
  }

  const inventoryCounts = demoInventory.reduce(
    (acc, item) => {
      acc[item.stock_status] = (acc[item.stock_status] ?? 0) + 1
      return acc
    },
    {} as Record<InventoryItem["stock_status"], number>,
  )

  return {
    meals: demoMeals.length,
    uniqueIngredients: uniqueIngredients.size,
    inStock: inventoryCounts.in_stock ?? 0,
    lowStock: inventoryCounts.low ?? 0,
    outOfStock: inventoryCounts.out ?? 0,
    plannedSlots: plan.filter((slot) => slot.meal_id).length,
    groceryTotal: demoGrocery.length,
    groceryBought: demoGrocery.filter((g) => g.is_bought).length,
    groceryLeft: demoGrocery.filter((g) => !g.is_bought).length,
    week,
    weekAvgKcal: week.length ? Math.round(plannedKcalTotal / week.length) : 0,
    targetKcal: demoProfile.daily_calorie_target,
    weekMacros: plannedMeals.length
      ? {
          protein_g: Math.round(macroSum.protein_g),
          carbs_g: Math.round(macroSum.carbs_g),
          fat_g: Math.round(macroSum.fat_g),
        }
      : null,
    dailyMacroTarget: {
      protein_g: demoProfile.protein_g_target,
      carbs_g: demoProfile.carbs_g_target,
      fat_g: demoProfile.fat_g_target,
    },
    profile: demoProfile,
  }
}
