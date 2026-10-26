// Sample data shown to visitors who haven't signed in yet ("preview mode").
// Everything here is a local constant — anonymous users never touch the real
// tables (no anon grants, RLS blocks them anyway). Sign in to see your own data.
import { DAYS, addDays, dateInWeek, startOfWeek } from "./dates"
import type {
  DashboardSummary,
  GroceryItem,
  InventoryItem,
  Meal,
  MealPlanSlot,
  UserProfile,
} from "./types"
import type { Activity, ISODate, MealType } from "./types"
import type { FeedPost, PostSnapshot } from "./types"
import type { HomeData, TodaySlot } from "./db"

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
    {
      id: "demo-m1-i1",
      meal_id: "demo-m1",
      item_name: "Coconut rice",
      quantity: 200,
      unit: "g",
    },
    {
      id: "demo-m1-i2",
      meal_id: "demo-m1",
      item_name: "Sambal",
      quantity: 40,
      unit: "g",
    },
    {
      id: "demo-m1-i3",
      meal_id: "demo-m1",
      item_name: "Boiled egg",
      quantity: 1,
      unit: "piece",
    },
    {
      id: "demo-m1-i4",
      meal_id: "demo-m1",
      item_name: "Cucumber",
      quantity: 30,
      unit: "g",
    },
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
    {
      id: "demo-m2-i1",
      meal_id: "demo-m2",
      item_name: "Chicken",
      quantity: 150,
      unit: "g",
    },
    {
      id: "demo-m2-i2",
      meal_id: "demo-m2",
      item_name: "Jasmine rice",
      quantity: 200,
      unit: "g",
    },
    {
      id: "demo-m2-i3",
      meal_id: "demo-m2",
      item_name: "Ginger chilli sauce",
      quantity: 30,
      unit: "g",
    },
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
    {
      id: "demo-m3-i1",
      meal_id: "demo-m3",
      item_name: "Rolled oats",
      quantity: 50,
      unit: "g",
    },
    {
      id: "demo-m3-i2",
      meal_id: "demo-m3",
      item_name: "Milk",
      quantity: 150,
      unit: "ml",
    },
    {
      id: "demo-m3-i3",
      meal_id: "demo-m3",
      item_name: "Banana",
      quantity: 1,
      unit: "piece",
    },
  ],
}

export const demoMeals: Meal[] = [M1, M2, M3]

export const demoInventory: InventoryItem[] = [
  {
    id: "demo-inv-1",
    user_id: DEMO_USER,
    item_name: "Jasmine rice",
    quantity: 2,
    unit: "kg",
    stock_status: "in_stock",
  },
  {
    id: "demo-inv-2",
    user_id: DEMO_USER,
    item_name: "Chicken",
    quantity: 500,
    unit: "g",
    stock_status: "in_stock",
  },
  {
    id: "demo-inv-3",
    user_id: DEMO_USER,
    item_name: "Eggs",
    quantity: 3,
    unit: "piece",
    stock_status: "low",
  },
  {
    id: "demo-inv-4",
    user_id: DEMO_USER,
    item_name: "Banana",
    quantity: 4,
    unit: "piece",
    stock_status: "in_stock",
  },
  {
    id: "demo-inv-5",
    user_id: DEMO_USER,
    item_name: "Coconut milk",
    quantity: 0,
    unit: "ml",
    stock_status: "out",
  },
  {
    id: "demo-inv-6",
    user_id: DEMO_USER,
    item_name: "Cucumber",
    quantity: 1,
    unit: "piece",
    stock_status: "in_stock",
  },
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
      servings: 1,
    })
  }
  return slots
})()

export const demoGrocery: GroceryItem[] = [
  {
    id: "demo-gro-1",
    user_id: DEMO_USER,
    week_start: DEMO_WEEK,
    item_name: "Sambal",
    quantity: 1,
    unit: "jar",
    is_bought: true,
    source: "plan" as const,
  },
  {
    id: "demo-gro-2",
    user_id: DEMO_USER,
    week_start: DEMO_WEEK,
    item_name: "Jasmine rice",
    quantity: 1,
    unit: "kg",
    is_bought: false,
    source: "plan" as const,
  },
  {
    id: "demo-gro-3",
    user_id: DEMO_USER,
    week_start: DEMO_WEEK,
    item_name: "Ginger chilli sauce",
    quantity: 1,
    unit: "bottle",
    is_bought: false,
    source: "plan" as const,
  },
  {
    id: "demo-gro-4",
    user_id: DEMO_USER,
    week_start: DEMO_WEEK,
    item_name: "Coconut milk",
    quantity: 200,
    unit: "ml",
    is_bought: false,
    source: "plan" as const,
  },
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
  daily_activity_min: 30,
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

const HOME_MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]

/** Today's 4 meal slots for preview mode — filled grid, demo plan merged in. */
function buildDemoTodaySlots(today: ISODate): TodaySlot[] {
  const mealById = new Map(demoMeals.map((m) => [m.id, m]))
  const byType = new Map(
    demoPlan.filter((s) => s.date === today).map((s) => [s.meal_type, s]),
  )
  return HOME_MEAL_TYPES.map((meal_type) => {
    const slot = byType.get(meal_type)
    return {
      date: today,
      meal_type,
      meal: slot?.meal_id ? (mealById.get(slot.meal_id) ?? null) : null,
      servings: slot?.servings || 1,
    }
  })
}

export function buildDemoHome(today: ISODate): HomeData {
  const counts = demoInventory.reduce(
    (acc, item) => {
      acc[item.stock_status] += 1
      return acc
    },
    {
      in_stock: 0,
      low: 0,
      out: 0,
    } as Record<InventoryItem["stock_status"], number>,
  )

  const todayActivities: Activity[] = [
    {
      id: "demo-act-1",
      user_id: DEMO_USER,
      date: today,
      activity_type: "walking",
      duration_min: 30,
      status: "planned",
      scheduled_time: "18:00",
      notes: null,
    },
  ]

  return {
    profile: demoProfile,
    todaySlots: buildDemoTodaySlots(today),
    savedMeals: demoMeals.length,
    inventory: {
      total: demoInventory.length,
      inStock: counts.in_stock,
      low: counts.low,
      out: counts.out,
    },
    grocery: {
      weekStart: DEMO_WEEK,
      total: demoGrocery.length,
      left: demoGrocery.filter((g) => !g.is_bought).length,
    },
    todayActivities,
  }
}

export function buildDemoActivities(from: ISODate, to: ISODate): Activity[] {
  const seeds: Array<{
    daysAgo: number
    type: Activity["activity_type"]
    minutes: number
    status: Activity["status"]
    time: string | null
  }> = [
    {
      daysAgo: 2,
      type: "walking",
      minutes: 30,
      status: "completed",
      time: "07:30",
    },
    {
      daysAgo: 4,
      type: "strength",
      minutes: 45,
      status: "completed",
      time: "18:00",
    },
    {
      daysAgo: 7,
      type: "walking",
      minutes: 35,
      status: "completed",
      time: null,
    },
    {
      daysAgo: 9,
      type: "running",
      minutes: 25,
      status: "completed",
      time: "07:00",
    },
    {
      daysAgo: 12,
      type: "cycling",
      minutes: 60,
      status: "completed",
      time: null,
    },
    {
      daysAgo: 15,
      type: "walking",
      minutes: 30,
      status: "completed",
      time: "19:00",
    },
    {
      daysAgo: 18,
      type: "sports",
      minutes: 50,
      status: "completed",
      time: null,
    },
    {
      daysAgo: 21,
      type: "strength",
      minutes: 45,
      status: "completed",
      time: "18:30",
    },
    {
      daysAgo: 25,
      type: "walking",
      minutes: 30,
      status: "completed",
      time: null,
    },
    {
      daysAgo: 0,
      type: "walking",
      minutes: 30,
      status: "planned",
      time: "18:00",
    },
  ]

  const activities: Activity[] = []
  for (const seed of seeds) {
    const date = addDays(to, -seed.daysAgo)
    if (date < from || date > to) continue
    activities.push({
      id: `demo-act-${seed.daysAgo}`,
      user_id: DEMO_USER,
      date,
      activity_type: seed.type,
      duration_min: seed.minutes,
      status: seed.status,
      scheduled_time: seed.time,
      notes: null,
    })
  }
  return activities
}

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

export const demoFeed: FeedPost[] = (() => {
  const mealSnap: PostSnapshot = {
    name: "Nasi Lemak",
    calories: 644,
    protein_g: 14,
    carbs_g: 71,
    fat_g: 33,
    ingredients: [
      "Coconut rice",
      "Sambal",
      "Fried anchovies",
      "Peanuts",
      "Egg",
    ],
    ingredient_count: 6,
  }
  const recipeSnap: PostSnapshot = {
    name: "Chicken Congee",
    calories: 410,
    protein_g: 28,
    carbs_g: 52,
    fat_g: 9,
    prep_time_min: 35,
    ingredients: ["Chicken thigh", "Jasmine rice", "Ginger", "Spring onion"],
    ingredient_count: 7,
  }
  const activitySnap: PostSnapshot = {
    activity_type: "running",
    duration_min: 25,
    status: "completed",
  }

  return [
    {
      id: "demo-post-1",
      author_id: "demo-u1",
      kind: "meal",
      description: "Nasi Lemak with the works",
      content: "Sunday feast — worth every calorie.",
      snapshot: mealSnap,
      created_at: minutesAgo(45),
      author: {
        id: "demo-u1",
        display_name: "Aisyah Rahman",
        handle: "aisy",
        bio: "Home cook, chilli enthusiast.",
      },
      likes: 4,
      likedByMe: false,
      comments: 2,
    },
    {
      id: "demo-post-2",
      author_id: "demo-u2",
      kind: "activity",
      description: "Easy 5 km jog",
      content: "Morning loop before the heat kicked in.",
      snapshot: activitySnap,
      created_at: minutesAgo(190),
      author: {
        id: "demo-u2",
        display_name: "Wei Jian",
        handle: "wjian",
        bio: "Chasing negative splits.",
      },
      likes: 7,
      likedByMe: true,
      comments: 0,
    },
    {
      id: "demo-post-3",
      author_id: "demo-u3",
      kind: "recipe",
      description: "Chicken congee, freezer-friendly",
      content: "Rotated this into the weekly rotation — freezer-friendly.",
      snapshot: recipeSnap,
      created_at: minutesAgo(640),
      author: {
        id: "demo-u3",
        display_name: "Nadia Yusof",
        handle: "nadia",
        bio: "Batch cooking, one tray at a time.",
      },
      likes: 2,
      likedByMe: false,
      comments: 1,
    },
    {
      id: "demo-post-4",
      author_id: "demo-u1",
      kind: "update",
      description: "Meal prep Monday",
      content:
        "Meal-prepped five lunches for the week. Past me did future me a favour.",
      snapshot: {},
      created_at: minutesAgo(1_500),
      author: {
        id: "demo-u1",
        display_name: "Aisyah Rahman",
        handle: "aisy",
        bio: "Home cook, chilli enthusiast.",
      },
      likes: 5,
      likedByMe: false,
      comments: 0,
    },
  ]
})()
