import { useState } from "react"
import { Camera, Minus, Plus, X } from "lucide-react"
import { DAYS, dateInWeek, dayFullLabel, parseISODate } from "../lib/dates"
import type {
  Meal,
  MealPlanSlot,
  MealType,
  LoggedMeal,
  ISODate,
} from "../lib/types"

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]

const TYPE_ACCENT: Record<MealType, string> = {
  Breakfast: "border-l-amber-400",
  Lunch: "border-l-emerald-400",
  Dinner: "border-l-sky-400",
  Snack: "border-l-rose-400",
}

const MAX_SERVINGS = 12

interface PlannerMobileViewProps {
  weekStart: ISODate
  meals: Meal[]
  plan: MealPlanSlot[]
  logged: Record<string, LoggedMeal>
  onChange: (date: ISODate, type: MealType, mealId: string) => void
  onServings: (date: ISODate, type: MealType, servings: number) => void
  onLog: (date: ISODate, type: MealType) => void
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
              className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
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

          return (
            <div
              key={type}
              className={`bg-card border border-border border-l-4 ${TYPE_ACCENT[type]} rounded-2xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {type}
                </span>
                <button
                  onClick={() => onLog(activeDate, type)}
                  title="Log what I ate"
                  className="p-2 rounded-lg text-muted-foreground hover:text-terracotta hover:bg-muted transition-colors"
                >
                  <Camera size={16} />
                </button>
              </div>

              {selectedMeal ? (
                <>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {selectedMeal.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="tabular text-xs text-muted-foreground">
                      {selectedMeal.calories * servings} kcal
                      {servings > 1
                        ? ` (${selectedMeal.calories} × ${servings})`
                        : ""}
                    </p>
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background px-0.5 py-0.5">
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
                      <span className="tabular w-6 text-center text-xs font-medium text-foreground">
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
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Empty</p>
              )}

              <select
                value={slot?.meal_id || ""}
                onChange={(e) => onChange(activeDate, type, e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— none —</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {log && (
                <div className="mt-2 flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-sage border border-[#dde6d6]">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-secondary-foreground truncate">
                      {log.food}
                    </p>
                    <p className="tabular text-[10px] text-secondary-foreground/70">
                      logged · ~{log.calories} kcal
                    </p>
                  </div>
                  <button
                    aria-label="Remove log"
                    onClick={() => onRemoveLog(activeDate, type)}
                    className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
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
