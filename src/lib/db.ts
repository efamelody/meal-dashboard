// Data layer — localStorage-backed with structure matching the Supabase schema.
// Swap each function body for a supabase.from(...) call once Supabase is connected.
import type { Meal, InventoryItem, MealPlanSlot, GroceryItem, DayOfWeek, MealType } from "./types";

const MOCK_USER = "local-user";

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid(): string {
  return crypto.randomUUID();
}

// ── Meals ──────────────────────────────────────────────────────────────────

export async function getMeals(): Promise<Meal[]> {
  return load<Meal>("meals");
}

export async function addMeal(meal: Omit<Meal, "id" | "user_id">): Promise<Meal> {
  const meals = load<Meal>("meals");
  const newMeal: Meal = { ...meal, id: uid(), user_id: MOCK_USER };
  newMeal.ingredients = meal.ingredients.map((i) => ({ ...i, id: uid(), meal_id: newMeal.id }));
  meals.push(newMeal);
  save("meals", meals);
  return newMeal;
}

export async function deleteMeal(id: string): Promise<void> {
  save("meals", load<Meal>("meals").filter((m) => m.id !== id));
}

// ── Inventory ─────────────────────────────────────────────────────────────

export async function getInventory(): Promise<InventoryItem[]> {
  return load<InventoryItem>("inventory");
}

export async function addInventoryItem(item: Omit<InventoryItem, "id" | "user_id">): Promise<InventoryItem> {
  const inventory = load<InventoryItem>("inventory");
  const newItem: InventoryItem = { ...item, id: uid(), user_id: MOCK_USER };
  inventory.push(newItem);
  save("inventory", inventory);
  return newItem;
}

export async function updateInventoryItem(id: string, changes: Partial<InventoryItem>): Promise<void> {
  const inventory = load<InventoryItem>("inventory").map((i) => (i.id === id ? { ...i, ...changes } : i));
  save("inventory", inventory);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  save("inventory", load<InventoryItem>("inventory").filter((i) => i.id !== id));
}

// ── Meal Plan ─────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function initPlanSlots(): MealPlanSlot[] {
  const slots: MealPlanSlot[] = [];
  for (const day of DAYS) {
    for (const type of MEAL_TYPES) {
      slots.push({ id: `${day}-${type}`, user_id: MOCK_USER, day_of_week: day, meal_type: type, meal_id: null });
    }
  }
  return slots;
}

export async function getMealPlan(): Promise<MealPlanSlot[]> {
  const stored = load<MealPlanSlot>("meal_plan");
  return stored.length ? stored : initPlanSlots();
}

export async function updatePlanSlot(day: DayOfWeek, mealType: MealType, mealId: string | null): Promise<void> {
  const plan = await getMealPlan();
  const updated = plan.map((s) =>
    s.day_of_week === day && s.meal_type === mealType ? { ...s, meal_id: mealId } : s
  );
  save("meal_plan", updated);
}

// ── Grocery List ──────────────────────────────────────────────────────────

export async function getGroceryList(): Promise<GroceryItem[]> {
  return load<GroceryItem>("grocery_list");
}

export async function generateGroceryList(): Promise<GroceryItem[]> {
  const plan = await getMealPlan();
  const meals = await getMeals();
  const inventory = await getInventory();

  const inStockNames = new Set(
    inventory.filter((i) => i.is_in_stock).map((i) => i.item_name.toLowerCase().trim())
  );

  // Aggregate ingredients across all planned meals
  const totals = new Map<string, { quantity: number; unit: string }>();
  for (const slot of plan) {
    if (!slot.meal_id) continue;
    const meal = meals.find((m) => m.id === slot.meal_id);
    if (!meal) continue;
    for (const ing of meal.ingredients) {
      const key = `${ing.item_name.toLowerCase().trim()}|${ing.unit}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += ing.quantity;
      } else {
        totals.set(key, { quantity: ing.quantity, unit: ing.unit });
      }
    }
  }

  const items: GroceryItem[] = [];
  for (const [key, { quantity, unit }] of totals) {
    const item_name = key.split("|")[0];
    const is_bought = inStockNames.has(item_name);
    items.push({ id: uid(), user_id: MOCK_USER, item_name, quantity, unit, is_bought });
  }

  save("grocery_list", items);
  return items;
}

export async function toggleGroceryItem(id: string, is_bought: boolean): Promise<void> {
  const list = load<GroceryItem>("grocery_list").map((i) => (i.id === id ? { ...i, is_bought } : i));
  save("grocery_list", list);
}

export async function clearGroceryList(): Promise<void> {
  save("grocery_list", []);
}
