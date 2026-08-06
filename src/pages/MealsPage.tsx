import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Flame, Beef, Wheat, Droplets, X, Salad } from "lucide-react";
import { getMeals, addMeal, deleteMeal } from "../lib/db";
import type { Meal, MealType, MealIngredient } from "../lib/types";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const UNITS = ["g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece", "slice"];

const TYPE_COLORS: Record<MealType, string> = {
  Breakfast: "bg-amber-100 text-amber-800",
  Lunch: "bg-sky-100 text-sky-800",
  Dinner: "bg-violet-100 text-violet-800",
  Snack: "bg-rose-100 text-rose-800",
};

function MacroBadge({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
      <Icon size={11} />
      <span>{value}{label}</span>
    </div>
  );
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filter, setFilter] = useState<MealType | "All">("All");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("Breakfast");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [ingredients, setIngredients] = useState<Omit<MealIngredient, "id" | "meal_id">[]>([
    { item_name: "", quantity: 0, unit: "g" },
  ]);

  useEffect(() => { getMeals().then(setMeals); }, []);

  const filtered = filter === "All" ? meals : meals.filter((m) => m.meal_type === filter);

  function addIngredientRow() {
    setIngredients([...ingredients, { item_name: "", quantity: 0, unit: "g" }]);
  }

  function updateIngredient(i: number, field: string, value: string | number) {
    setIngredients(ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }

  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const meal = await addMeal({
      name,
      meal_type: mealType,
      calories: parseInt(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
      ingredients: ingredients.filter((i) => i.item_name.trim()) as any,
    });
    setMeals([...meals, meal]);
    setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    setIngredients([{ item_name: "", quantity: 0, unit: "g" }]);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteMeal(id);
    setMeals(meals.filter((m) => m.id !== id));
  }

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl text-[var(--foreground)]">Meal Library</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{meals.length} meals saved</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add Meal
          </button>
        </div>

        {/* Add Meal Form */}
        {showForm && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl text-[var(--foreground)]">New Meal</h3>
              <button onClick={() => setShowForm(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Meal Name</label>
                  <input
                    required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chicken Salad"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Category</label>
                  <select
                    value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}
                    className="w-full px-3 py-2.5 pr-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    {MEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Calories", val: calories, set: setCalories, unit: "kcal" },
                  { label: "Protein", val: protein, set: setProtein, unit: "g" },
                  { label: "Carbs", val: carbs, set: setCarbs, unit: "g" },
                  { label: "Fat", val: fat, set: setFat, unit: "g" },
                ].map(({ label, val, set, unit }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">{label} ({unit})</label>
                    <input
                      type="number" min="0" value={val} onChange={(e) => set(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">Ingredients</label>
                <div className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={ing.item_name}
                        onChange={(e) => updateIngredient(i, "item_name", e.target.value)}
                        placeholder="Item name"
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <input
                        type="number" min="0" value={ing.quantity || ""}
                        onChange={(e) => updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="w-20 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                        className="w-24 px-2 py-2 pr-6 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      >
                        {UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                      {ingredients.length > 1 && (
                        <button type="button" onClick={() => removeIngredient(i)} className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button" onClick={addIngredientRow}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent)] hover:opacity-80 font-medium transition-opacity"
                >
                  <Plus size={13} /> Add ingredient
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity">
                  Save Meal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[var(--muted)] rounded-xl w-fit">
          {(["All", ...MEAL_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === t
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Meal Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <Salad size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No meals yet. Add your first meal above.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((meal) => (
              <div key={meal.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[meal.meal_type]}`}>
                      {meal.meal_type}
                    </span>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{meal.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <MacroBadge icon={Flame} value={meal.calories} label=" kcal" color="bg-orange-50 text-orange-700" />
                      <MacroBadge icon={Beef} value={meal.protein_g} label="g" color="bg-red-50 text-red-700" />
                      <MacroBadge icon={Wheat} value={meal.carbs_g} label="g" color="bg-yellow-50 text-yellow-700" />
                      <MacroBadge icon={Droplets} value={meal.fat_g} label="g" color="bg-blue-50 text-blue-700" />
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {expandedId === meal.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expandedId === meal.id && meal.ingredients.length > 0 && (
                  <div className="px-5 pb-4 border-t border-[var(--border)]">
                    <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mt-3 mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                      {meal.ingredients.map((ing) => (
                        <span key={ing.id} className="text-xs px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg">
                          {ing.quantity}{ing.unit} {ing.item_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

