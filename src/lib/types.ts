export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface MealIngredient {
  id: string;
  meal_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: MealIngredient[];
}

export interface InventoryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  is_in_stock: boolean;
}

export interface MealPlanSlot {
  id: string;
  user_id: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  meal_id: string | null;
}

export interface GroceryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  is_bought: boolean;
}
