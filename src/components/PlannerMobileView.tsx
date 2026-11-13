import { useState } from "react"
import {
  Camera,
  Cookie,
  Minus,
  Moon,
  Plus,
  Sun,
  Sunrise,
  UtensilsCrossed,
  X,
} from "lucide-react"
import { DAYS, dateInWeek, dayFullLabel, parseISODate } from "../lib/dates"
import type {
  Meal,
  MealPlanSlot,
  MealType,
  LoggedMeal,
  ISODate,
} from "../lib/types"

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]

const MEAL_ICONS: Record<MealType, typeof Sun> = {
  Breakfast: Sunrise,
  Lunch: Sun,
  Dinner: Moon,
  Snack: Cookie,
}

const MEAL_ACCENT: Record<MealType, string> = {
  Breakfast: "bg-sand text-[#8a5a38]",
  Lunch: "bg-sage text-secondary-foreground",
  Dinner: "bg-blue-soft text-[#3f5b78]",
  Snack: "bg-[#f6ecdb] text-warning",
}

const MAX_SERVINGS = 12

interface PlannerMobileViewProps {
  weekStart: ISODate
  meals: Meal[]
  plan: MealPlanSlot[]
  logged: Record<string, LoggedMeal>
  onChange: (date: ISODate, type: MealType, mealId: string) => void
  onServings: (date: ISODate, type: MealType, servings: number) => void
  onLog: (date: ISODate, type: MealType, mode: "add" | "edit") => void
  onRemoveLog: (date: ISODate, type: MealType) => void
}

export default function PlannerMobileView({
  weekStart,
  meals,
  plan,
  logged,
  onChange,
  onServings,
  onLog,
  onRemoveLog,
}: PlannerMobileViewProps) {
  const [day, setDay] = useState(0)

  const slotKey = (date: ISODate, type: MealType) => `${date}-${type}`

  const getSlot = (date: ISODate, type: MealType): MealPlanSlot | undefined =>
    plan.find((s) => s.date === date && s.meal_type === type)

  // Planned calories only (servings-aware) — logged intake is tracked
  // separately so the two are never double-counted.
  const plannedCalories = (date: ISODate): number =>
    plan
      .filter((s) => s.date === date && s.meal_id)
      .reduce((sum, slot) => {
        const meal = meals.find((m) => m.id === slot.meal_id)
        return sum + (meal?.calories || 0) * (slot.servings || 1)
      }, 0)

  const activeDate = dateInWeek(weekStart, day)

  return (
    <div>
      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
        {DAYS.map((d, i) => {
          const date = dateInWeek(weekStart, i)
          const active = i === day
          return (
            <button
              key={date}
              onClick={() => setDay(i)}
              className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              <span className="text-sm font-semibold">{dayFullLabel(d)}</span>
              <span
                className={`tabular text-[10px] ${
                  active
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {parseISODate(date).getDate()} · {plannedCalories(date)} kcal
              </span>
            </button>
          )
        })}
      </div>

      {/* Meal cards */}
      <div className="space-y-3">
        {MEAL_TYPES.map((type) => {
          const slot = getSlot(activeDate, type)
          const selectedMeal = slot?.meal_id
            ? meals.find((m) => m.id === slot.meal_id)
            : null
          const servings = slot?.servings || 1
          const log = logged[slotKey(activeDate, type)]
          const Icon = MEAL_ICONS[type]

          return (
            <div
              key={type}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm shadow-black/[0.03]"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${MEAL_ACCENT[type]}`}
                >
                  <Icon size={16} />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {type}
                </span>
                <button
                  onClick={() => onLog(activeDate, type, "add")}
                  title="Log what I ate"
                  aria-label={`Log what you ate for ${type}`}
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-ring hover:text-terracotta hover:bg-muted active:scale-95"
                >
                  <Camera size={15} />
                </button>
              </div>

              {selectedMeal ? (
                <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {selectedMeal.name}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-muted-foreground">
                        {selectedMeal.calories * servings} kcal
                        {servings > 1
                          ? ` (${selectedMeal.calories} × ${servings})`
                          : ""}
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card px-0.5 py-0.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${type} servings`}
                        disabled={servings <= 1}
                        onClick={() =>
                          onServings(activeDate, type, servings - 1)
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="tabular w-6 text-center text-xs font-semibold text-foreground">
                        {servings}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${type} servings`}
                        disabled={servings >= MAX_SERVINGS}
                        onClick={() =>
                          onServings(activeDate, type, servings + 1)
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mb-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UtensilsCrossed size={12} />
                  Nothing planned yet — pick a meal below
                </p>
              )}

              <select
                value={slot?.meal_id || ""}
                onChange={(e) => onChange(activeDate, type, e.target.value)}
                aria-label={`Choose ${type}`}
                className="mt-2.5 w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
              >
                <option value="">Choose a meal…</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {log && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-sage border border-[#dde6d6] px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-foreground/10 text-secondary-foreground">
                    <UtensilsCrossed size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={() => onLog(activeDate, type, "edit")}
                    title="Edit logged foods"
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-xs font-medium text-secondary-foreground truncate">
                      {log.foods.map((food) => food.food).join(", ")}
                    </p>
                    <p className="tabular text-[10px] text-secondary-foreground/70">
                      logged · {log.foods.length} food
                      {log.foods.length === 1 ? "" : "s"} · ~{log.calories}{" "}
                      kcal
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove log"
                    onClick={() => onRemoveLog(activeDate, type)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-secondary-foreground/60 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
