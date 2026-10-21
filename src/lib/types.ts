export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack"
export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
export type ISODate = string
export type StockStatus = "in_stock" | "low" | "out"
export type Sex = "male" | "female"
export type Goal = "lose" | "maintain" | "build"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active"

export type ActivityType = "walking" | "running" | "cycling" | "strength" | "sports" | "other"
export type ActivityStatus = "planned" | "completed"
/** Self-reported effort. "unknown" = not stated; never inferred silently. */
export type Intensity = "easy" | "moderate" | "vigorous" | "unknown"

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
  description?: string | null
  prep_time_min?: number | null
  instructions?: string | null
  ingredients: MealIngredient[]
}

export interface InventoryItem {
  id: string
  user_id: string
  item_name: string
  quantity?: number | null
  unit?: string | null
  stock_status: StockStatus
}

export interface MealPlanSlot {
  id: string
  user_id: string
  date: ISODate
  meal_type: MealType
  meal_id: string | null
  servings: number
}

export interface GroceryItem {
  id: string
  user_id: string
  week_start: ISODate
  item_name: string
  quantity: number
  unit: string
  is_bought: boolean
  /** "plan" rows are derived from the meal plan; "manual" rows are user-added. */
  source: "plan" | "manual"
}

export interface Activity {
  id: string
  user_id: string
  date: ISODate
  /** Coarse category used for icons and breakdowns (migration 002 check). */
  activity_type: ActivityType
  duration_min: number
  status: ActivityStatus
  scheduled_time?: string | null
  notes?: string | null
  /** Specific activity as typed (e.g. "Badminton"). Null on legacy rows. */
  name?: string | null
  distance_km?: number | null
  intensity?: Intensity | null
  /** Laps, elevation, exercises/sets/reps — context-specific specifics. */
  details?: string | null
  /** Set only when the user explicitly shared it. Null/undefined = private. */
  shared_at?: string | null
}

/** One food inside a logged meal slot (e.g. "Roti canai" in Breakfast). */
export interface LoggedFoodItem {
  id: string
  food: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  /** What the AI identified the food as. Null when the user named it. */
  ai_dish?: string | null
  /** The portion the AI assumed, e.g. "1 packet (~250 g)". */
  ai_portion?: string | null
  /** The AI's reasoning for the estimate. */
  ai_justification?: string | null
  /** How sure the AI was about the identification. */
  ai_confidence?: "low" | "medium" | "high" | null
  /** The user's correction, e.g. "no this is nasi ayam". */
  user_correction?: string | null
  /** Where the numbers came from. */
  source?: "ai" | "corrected" | "manual" | null
}

export interface LoggedMeal {
  /** Foods logged in this slot. A slot exists only when it holds at least one. */
  foods: LoggedFoodItem[]
  /** Sum of `foods`. Derived by `buildLoggedMeal` so it can never drift. */
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
  daily_activity_min: number
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

/* ── Community ────────────────────────────────────────────────────── */

export type PostKind = "meal" | "recipe" | "activity" | "update"
export type FriendshipStatus = "pending" | "accepted"

export interface AppProfile {
  id: string
  display_name: string
  handle: string
  bio: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  accepted_at?: string | null
}

/** A friendship row plus the other side's profile, flattened for UI use. */
export interface FriendRow {
  id: string
  status: FriendshipStatus
  created_at: string
  requester_is_me: boolean
  peer: AppProfile
}

/** Optional fields attached to a post depending on its kind. */
export interface PostSnapshot {
  name?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  prep_time_min?: number | null
  ingredients?: string[]
  ingredient_count?: number
  activity_type?: ActivityType
  duration_min?: number
  status?: ActivityStatus
  distance_km?: number
  intensity?: Intensity
}

export interface FeedPost {
  id: string
  author_id: string
  kind: PostKind
  content: string
  snapshot: PostSnapshot
  created_at: string
  author: AppProfile
  likes: number
  likedByMe: boolean
  comments: number
}

export interface FeedComment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  author: AppProfile
}
