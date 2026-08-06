export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack"
export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
export type StockStatus = "in_stock" | "low" | "out"
export type Sex = "male" | "female"
export type Goal = "lose" | "maintain" | "build"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active"

export interface MealIngredient {
  id: string
  meal_id: string
  item_name: string
  quantity: number
  unit: string
}

export interface Meal {
  id: string
  user_id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  ingredients: MealIngredient[]
}

export interface InventoryItem {
  id: string
  user_id: string
  item_name: string
  quantity?: number
  unit?: string
  stock_status: StockStatus
}

export interface MealPlanSlot {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  meal_type: MealType
  meal_id: string | null
}

export interface GroceryItem {
  id: string
  user_id: string
  item_name: string
  quantity: number
  unit: string
  is_bought: boolean
}

export interface LoggedMeal {
  food: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface UserProfile {
  user_id: string
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  goal: Goal
  activity_level: ActivityLevel
  bmr_kcal: number
  tdee_kcal: number
  daily_calorie_target: number
  protein_g_target: number
  carbs_g_target: number
  fat_g_target: number
  ai_notes: string | null
  updated_at?: string
}

export interface DayCalories {
  day: DayOfWeek
  plannedKcal: number
  slots: number
}

export interface MacroTotals {
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DashboardSummary {
  meals: number
  uniqueIngredients: number
  inStock: number
  lowStock: number
  outOfStock: number
  plannedSlots: number
  groceryTotal: number
  groceryBought: number
  groceryLeft: number
  week: DayCalories[]
  weekAvgKcal: number
  targetKcal: number | null
  weekMacros: MacroTotals | null
  dailyMacroTarget: MacroTotals | null
  profile: UserProfile | null
}
