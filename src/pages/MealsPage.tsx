import { useState, useEffect } from "react"
import {
  Plus,
  Trash2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  X,
  Salad,
  Sparkles,
} from "lucide-react"
import {
  getMeals,
  addMeal,
  deleteMeal,
  getIngredientSuggestions,
} from "../lib/db"
import { suggestIngredients, estimateNutrition } from "../lib/gemini"
import IngredientInput from "../components/IngredientInput"
import type { Meal } from "../lib/types"

function MacroBadge({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: any
  value: number
  label: string
  color: string
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}
    >
      <Icon size={11} />
      <span>
        {value}
        {label}
      </span>
    </div>
  )
}

const MAX_VISIBLE_INGREDIENTS = 6

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showAllId, setShowAllId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [ingredientNames, setIngredientNames] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const [aiIngredientsLoading, setAiIngredientsLoading] = useState(false)
  const [aiNutritionLoading, setAiNutritionLoading] = useState(false)
  const [aiError, setAiError] = useState("")

  useEffect(() => {
    getMeals().then(setMeals)
  }, [])

  useEffect(() => {
    if (!showForm) return
    getIngredientSuggestions().then(setSuggestions)
  }, [showForm])

  async function handleSuggestIngredients() {
    if (!name.trim() || aiIngredientsLoading) return
    setAiIngredientsLoading(true)
    setAiError("")
    try {
      const suggested = await suggestIngredients(name.trim())
      if (!suggested.length) {
        setAiError("No ingredients suggested. Try a more specific meal name.")
        return
      }
      const seen = new Set(ingredientNames.map((n) => n.toLowerCase()))
      const toAdd = suggested.filter((s) => !seen.has(s.toLowerCase()))
      setIngredientNames([...ingredientNames, ...toAdd])
      if (!toAdd.length)
        setAiError("Suggested ingredients are already in the list.")
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Something went wrong with AI.",
      )
    } finally {
      setAiIngredientsLoading(false)
    }
  }

  async function handleEstimateNutrition() {
    if (aiNutritionLoading) return
    setAiNutritionLoading(true)
    setAiError("")
    try {
      const info = await estimateNutrition(
        name.trim() || "Meal",
        ingredientNames,
      )
      setCalories(String(info.calories))
      setProtein(String(info.protein_g))
      setCarbs(String(info.carbs_g))
      setFat(String(info.fat_g))
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Something went wrong with AI.",
      )
    } finally {
      setAiNutritionLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const meal = await addMeal({
      name,
      calories: parseInt(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
      ingredients: ingredientNames.map((item_name) => ({
        item_name,
        quantity: 0,
        unit: "g",
      })) as any,
    })
    setMeals([...meals, meal])
    setName("")
    setCalories("")
    setProtein("")
    setCarbs("")
    setFat("")
    setIngredientNames([])
    setAiError("")
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await deleteMeal(id)
    setMeals(meals.filter((m) => m.id !== id))
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl text-[var(--foreground)]">
              Meal Library
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {meals.length} meals saved
            </p>
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
              <button
                onClick={() => setShowForm(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                  Meal Name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken Salad"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Nutrition */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Nutrition
                  </label>
                  <button
                    type="button"
                    onClick={handleEstimateNutrition}
                    disabled={aiNutritionLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:opacity-80 disabled:opacity-50 transition-opacity"
                  >
                    <Sparkles
                      size={13}
                      className={aiNutritionLoading ? "animate-spin" : ""}
                    />
                    {aiNutritionLoading ? "Estimating..." : "Estimate with AI"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Calories",
                      val: calories,
                      set: setCalories,
                      unit: "kcal",
                    },
                    {
                      label: "Protein",
                      val: protein,
                      set: setProtein,
                      unit: "g",
                    },
                    { label: "Carbs", val: carbs, set: setCarbs, unit: "g" },
                    { label: "Fat", val: fat, set: setFat, unit: "g" },
                  ].map(({ label, val, set, unit }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                        {label} ({unit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
                  Ingredients
                </label>
                <IngredientInput
                  value={ingredientNames}
                  onChange={setIngredientNames}
                  suggestions={suggestions}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Type an ingredient, separate with commas, or press Enter.
                  </p>
                  <button
                    type="button"
                    onClick={handleSuggestIngredients}
                    disabled={!name.trim() || aiIngredientsLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:opacity-80 disabled:opacity-50 transition-opacity"
                  >
                    <Sparkles
                      size={13}
                      className={aiIngredientsLoading ? "animate-spin" : ""}
                    />
                    {aiIngredientsLoading
                      ? "Suggesting..."
                      : "Suggest ingredients"}
                  </button>
                </div>
              </div>

              {aiError && <p className="text-xs text-red-500">{aiError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Save Meal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Meal Cards */}
        {meals.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <Salad size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No meals yet. Add your first meal above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {meals.map((meal) => {
              const showAll = showAllId === meal.id
              const visible = showAll
                ? meal.ingredients
                : meal.ingredients.slice(0, MAX_VISIBLE_INGREDIENTS)
              const hiddenCount =
                meal.ingredients.length - MAX_VISIBLE_INGREDIENTS
              return (
                <div
                  key={meal.id}
                  className="flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-semibold text-[var(--foreground)] leading-snug">
                      {meal.name}
                    </h3>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      aria-label={`Delete ${meal.name}`}
                      className="p-1.5 -m-1 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <MacroBadge
                      icon={Flame}
                      value={meal.calories}
                      label=" kcal"
                      color="bg-orange-50 text-orange-700"
                    />
                    <MacroBadge
                      icon={Beef}
                      value={meal.protein_g}
                      label="g"
                      color="bg-red-50 text-red-700"
                    />
                    <MacroBadge
                      icon={Wheat}
                      value={meal.carbs_g}
                      label="g"
                      color="bg-yellow-50 text-yellow-700"
                    />
                    <MacroBadge
                      icon={Droplets}
                      value={meal.fat_g}
                      label="g"
                      color="bg-blue-50 text-blue-700"
                    />
                  </div>

                  {meal.ingredients.length > 0 && (
                    <div className="mt-auto">
                      <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                        Ingredients
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {visible.map((ing) => (
                          <span
                            key={ing.id}
                            className="text-xs px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg"
                          >
                            {ing.quantity > 0
                              ? `${ing.quantity}${ing.unit} `
                              : ""}
                            {ing.item_name}
                          </span>
                        ))}
                      </div>
                      {!showAll && hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAllId(meal.id)}
                          className="mt-3 text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
                        >
                          +{hiddenCount} more
                        </button>
                      )}
                      {showAll && (
                        <button
                          type="button"
                          onClick={() => setShowAllId(null)}
                          className="mt-3 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-opacity"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
