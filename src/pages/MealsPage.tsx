import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Beef,
  Clock,
  Droplets,
  Flame,
  Pencil,
  Plus,
  Salad,
  Sparkles,
  Trash2,
  Wheat,
  X,
} from "lucide-react"
import {
  addMeal,
  deleteMeal,
  getIngredientSuggestions,
  getMeals,
  updateMeal,
  type MealInput,
} from "../lib/db"
import { estimateNutrition, suggestIngredients } from "../lib/gemini"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import IngredientEditor from "../components/IngredientEditor"
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
} from "../components/ui"
import { demoMeals, demoSuggestions } from "../lib/demo"
import type { Meal } from "../lib/types"

const MAX_VISIBLE_INGREDIENTS = 6

function MacroBadge({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof Flame
  value: number
  label: string
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${className}`}
    >
      <Icon size={11} />
      <span className="tabular">
        {value}
        {label}
      </span>
    </span>
  )
}

export default function MealsPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [meals, setMeals] = useState<Meal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAllId, setShowAllId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Meal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [instructions, setInstructions] = useState("")
  const [ingredients, setIngredients] = useState<MealInput["ingredients"]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const [aiIngredientsLoading, setAiIngredientsLoading] = useState(false)
  const [aiNutritionLoading, setAiNutritionLoading] = useState(false)
  const [aiError, setAiError] = useState("")

  // "Add meal" links come in as /kitchen/meals?new=1 — open the form once
  // and clear the param so a refresh doesn't re-open it.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return
    setShowForm(true)
    const sp = new URLSearchParams(searchParams)
    sp.delete("new")
    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!userId) {
      setMeals(demoMeals)
      return
    }
    getMeals()
      .then(setMeals)
      .catch((err) => {
        console.error("getMeals:", err)
        toast("Could not load your meals", "error")
      })
  }, [userId, toast])

  useEffect(() => {
    if (!showForm) return
    if (!userId) {
      setSuggestions(demoSuggestions)
      return
    }
    getIngredientSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
  }, [showForm, userId])

  function resetForm() {
    setName("")
    setCalories("")
    setProtein("")
    setCarbs("")
    setFat("")
    setDescription("")
    setPrepTime("")
    setInstructions("")
    setIngredients([])
    setAiError("")
    setEditingId(null)
  }

  function closeForm() {
    resetForm()
    setShowForm(false)
  }

  function openEdit(meal: Meal) {
    setEditingId(meal.id)
    setName(meal.name)
    setCalories(String(meal.calories))
    setProtein(String(meal.protein_g))
    setCarbs(String(meal.carbs_g))
    setFat(String(meal.fat_g))
    setDescription(meal.description ?? "")
    setPrepTime(meal.prep_time_min != null ? String(meal.prep_time_min) : "")
    setInstructions(meal.instructions ?? "")
    setIngredients(
      meal.ingredients.map((i) => ({
        item_name: i.item_name,
        quantity: i.quantity,
        unit: i.unit,
      })),
    )
    setAiError("")
    setShowForm(true)
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 0)
  }

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
      const seen = new Set(ingredients.map((i) => i.item_name.toLowerCase()))
      const toAdd = suggested
        .filter((s) => !seen.has(s.toLowerCase()))
        .map((s) => ({ item_name: s, quantity: 1, unit: "" }))
      setIngredients([...ingredients, ...toAdd])
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
        ingredients.map((i) => i.item_name),
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
    if (!userId) {
      openAuth()
      return
    }
    const payload: MealInput = {
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
      description: description.trim() || null,
      prep_time_min: prepTime.trim()
        ? Math.max(1, parseInt(prepTime) || 1)
        : null,
      instructions: instructions.trim() || null,
      ingredients: ingredients
        .filter((i) => i.item_name.trim())
        .map((i) => ({
          item_name: i.item_name.trim(),
          quantity: Math.max(0, i.quantity),
          unit: i.unit.trim(),
        })),
    }
    if (!payload.name) return

    setSaving(true)
    try {
      if (editingId) {
        const updated = await updateMeal(editingId, payload)
        setMeals(meals.map((m) => (m.id === editingId ? updated : m)))
        toast(`${updated.name} updated`)
      } else {
        const meal = await addMeal(payload)
        setMeals([...meals, meal])
        toast(`${meal.name} added to your library`)
      }
      closeForm()
    } catch (err) {
      console.error("saveMeal:", err)
      toast("Could not save the meal", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    if (!userId) {
      openAuth()
      return
    }
    setDeleting(true)
    try {
      await deleteMeal(deleteTarget.id)
      setMeals(meals.filter((m) => m.id !== deleteTarget.id))
      toast(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      console.error("deleteMeal:", err)
      toast("Could not delete the meal", "error")
    } finally {
      setDeleting(false)
    }
  }

  const isEditing = editingId !== null

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-medium text-foreground">
            {meals.length}
          </span>{" "}
          meal{meals.length === 1 ? "" : "s"} saved
          {meals.length > 0 &&
            ` · ${meals.reduce((n, m) => n + m.ingredients.length, 0)} ingredients`}
        </p>
        <Button
          size="sm"
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
        >
          {showForm ? (
            <>
              <X size={15} />
              Close
            </>
          ) : (
            <>
              <Plus size={15} />
              Add meal
            </>
          )}
        </Button>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <Card className="mb-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              {isEditing ? "Edit meal" : "New meal"}
            </h2>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Close form"
              onClick={closeForm}
            >
              <X size={16} />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="meal-name"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
              >
                Meal name
              </label>
              <input
                id="meal-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Salad"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="meal-description"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Description
                </label>
                <textarea
                  id="meal-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="One line about the dish"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="meal-prep"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Prep time (min)
                  </label>
                  <input
                    id="meal-prep"
                    type="number"
                    min={1}
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="e.g. 25"
                    className="tabular w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label
                    htmlFor="meal-instructions"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Instructions
                  </label>
                  <textarea
                    id="meal-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    placeholder="Steps, one per line"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Nutrition */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nutrition
                </span>
                <button
                  type="button"
                  onClick={handleEstimateNutrition}
                  disabled={aiNutritionLoading}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 disabled:opacity-50 transition-opacity"
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
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      {label} ({unit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder="0"
                      className="tabular w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ingredients
                </span>
                <button
                  type="button"
                  onClick={handleSuggestIngredients}
                  disabled={!name.trim() || aiIngredientsLoading}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 disabled:opacity-50 transition-opacity"
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
              <IngredientEditor
                value={ingredients}
                onChange={setIngredients}
                suggestions={suggestions}
              />
            </div>

            {aiError && <p className="text-xs text-error">{aiError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {isEditing ? "Save changes" : "Save meal"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Meal cards */}
      {meals.length === 0 ? (
        <EmptyState
          icon={<Salad size={22} />}
          title="No meals yet"
          description="Add your first meal — name, macros, and ingredients — then drop it into your weekly plan."
          action={
            <Button
              size="sm"
              onClick={() => (showForm ? undefined : setShowForm(true))}
            >
              <Plus size={15} />
              Add meal
            </Button>
          }
        />
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
              <Card
                key={meal.id}
                className="flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {meal.name}
                    </h3>
                    {meal.prep_time_min != null && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock size={11} />
                        {meal.prep_time_min} min
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${meal.name}`}
                      onClick={() => openEdit(meal)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${meal.name}`}
                      className="hover:text-error"
                      onClick={() => setDeleteTarget(meal)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {meal.description && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                    {meal.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <MacroBadge
                    icon={Flame}
                    value={meal.calories}
                    label=" kcal"
                    className="bg-sand text-[#8a5a38]"
                  />
                  <MacroBadge
                    icon={Beef}
                    value={meal.protein_g}
                    label="g"
                    className="bg-sage text-secondary-foreground"
                  />
                  <MacroBadge
                    icon={Wheat}
                    value={meal.carbs_g}
                    label="g"
                    className="bg-blue-soft text-[#3f5b78]"
                  />
                  <MacroBadge
                    icon={Droplets}
                    value={meal.fat_g}
                    label="g"
                    className="bg-[#f6ecdb] text-warning"
                  />
                </div>

                {meal.ingredients.length > 0 && (
                  <div className="mt-auto">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Ingredients
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visible.map((ing) => (
                        <Badge key={ing.id} tone="neutral">
                          {ing.quantity > 0
                            ? `${ing.quantity}${
                                ing.unit ? ` ${ing.unit}` : ""
                              } `
                            : ""}
                          {ing.item_name}
                        </Badge>
                      ))}
                    </div>
                    {!showAll && hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllId(meal.id)}
                        className="mt-2.5 text-xs font-medium text-primary hover:underline"
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                    {showAll && (
                      <button
                        type="button"
                        onClick={() => setShowAllId(null)}
                        className="mt-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete meal?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from your library. Plan slots pointing at it will show as empty again.`
            : ""
        }
        confirmLabel="Delete meal"
        busy={deleting}
      />
    </div>
  )
}
