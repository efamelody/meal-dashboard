import { useState } from "react"
import { Camera, X } from "lucide-react"
import { DAYS, dateInWeek, dayFullLabel, parseISODate } from "../lib/dates"
import type {
  Meal,
  MealPlanSlot,
  MealType,
  LoggedMeal,
  ISODate,
} from "../lib/types"

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"]

const TYPE_ACCENT: Record<MealType, string> = {
  Breakfast: "border-l-amber-400",
  Lunch: "border-l-sky-400",
  Dinner: "border-l-violet-400",
  Snack: "border-l-rose-400",
}

interface PlannerMobileViewProps {
  weekStart: ISODate
  meals: Meal[]
  plan: MealPlanSlot[]
  logged: Record<string, LoggedMeal>
  onChange: (date: ISODate, type: MealType, mealId: string) => void
  onLog: (date: ISODate, type: MealType) => void
  onRemoveLog: (date: ISODate, type: MealType) => void
}

export default function PlannerMobileView({
  weekStart,
  meals,
  plan,
  logged,
  onChange,
  onLog,
  onRemoveLog,
}: PlannerMobileViewProps) {
  const [day, setDay] = useState(0)

  const slotKey = (date: ISODate, type: MealType) => `${date}-${type}`

  const getSlot = (date: ISODate, type: MealType): MealPlanSlot | undefined =>
    plan.find((s) => s.date === date && s.meal_type === type)

  const dayCalories = (date: ISODate): number => {
    const planned = plan
      .filter((s) => s.date === date && s.meal_id)
      .reduce((sum, slot) => {
        const meal = meals.find((m) => m.id === slot.meal_id)
        return sum + (meal?.calories || 0)
      }, 0)
    const loggedCals = MEAL_TYPES.reduce(
      (sum, type) => sum + (logged[slotKey(date, type)]?.calories || 0),
      0,
    )
    return planned + loggedCals
  }

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
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                  : "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              <span className="text-sm font-semibold">{dayFullLabel(d)}</span>
              <span
                className={`text-[10px] ${
                  active
                    ? "text-[var(--primary-foreground)]/80"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {parseISODate(date).getDate()} · {dayCalories(date)} kcal
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
          const log = logged[slotKey(activeDate, type)]

          return (
            <div
              key={type}
              className={`bg-[var(--card)] border border-[var(--border)] border-l-4 ${TYPE_ACCENT[type]} rounded-2xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                  {type}
                </span>
                <button
                  onClick={() => onLog(activeDate, type)}
                  title="Log what I ate"
                  className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--muted)] transition-colors"
                >
                  <Camera size={16} />
                </button>
              </div>

              {selectedMeal ? (
                <>
                  <p className="text-sm font-medium text-[var(--foreground)] leading-tight">
                    {selectedMeal.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {selectedMeal.calories} kcal
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)] italic">
                  Empty
                </p>
              )}

              <select
                value={slot?.meal_id || ""}
                onChange={(e) => onChange(activeDate, type, e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              >
                <option value="">— none —</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {log && (
                <div className="mt-2 flex items-center justify-between gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-800 truncate">
                      {log.food}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      ~{log.calories} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveLog(activeDate, type)}
                    className="text-amber-700/60 hover:text-amber-800 transition-colors shrink-0"
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
