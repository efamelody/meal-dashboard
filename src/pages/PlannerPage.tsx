import { useState, useEffect } from "react"
import { ShoppingCart, Sparkles, CalendarDays, Camera, X } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  getMeals,
  getMealPlan,
  updatePlanSlot,
  generateGroceryList,
} from "../lib/db"
import {
  DAYS,
  dateInWeek,
  dayFullLabel,
  isISODate,
  parseISODate,
  startOfWeek,
} from "../lib/dates"
import type {
  Meal,
  MealPlanSlot,
  DayOfWeek,
  MealType,
  LoggedMeal,
  ISODate,
} from "../lib/types"
import MealLoggerModal from "../components/MealLoggerModal"
import WeekNavigator from "../components/WeekNavigator"
import PlannerMobileView from "../components/PlannerMobileView"
import { useAuth } from "../context/AuthContext"
import { demoMeals, demoPlan } from "../lib/demo"

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"]

const TYPE_ACCENT: Record<MealType, string> = {
  Breakfast: "border-l-amber-400",
  Lunch: "border-l-sky-400",
  Dinner: "border-l-violet-400",
  Snack: "border-l-rose-400",
}

const LOG_KEY = "meal-kit-planner-log"
const DAY_OFFSET: Record<DayOfWeek, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

// Logs are keyed `${date}-${meal_type}`. One-time migration re-bases logs
// stored under the old `${day}-${meal_type}` keys onto the current week.
function loadLog(): Record<string, LoggedMeal> {
  try {
    const raw = window.localStorage.getItem(LOG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LoggedMeal>
    let migrated = false
    const out: Record<string, LoggedMeal> = {}
    const weekStart = startOfWeek()
    for (const [key, value] of Object.entries(parsed)) {
      const match = key.match(/^(\w{3})-(\w+)$/)
      if (match) {
        const day = match[1] as DayOfWeek
        if (day in DAY_OFFSET) {
          out[`${dateInWeek(weekStart, DAY_OFFSET[day])}-${match[2]}`] = value
          migrated = true
        } else {
          out[key] = value
        }
      } else {
        out[key] = value
      }
    }
    if (migrated) window.localStorage.setItem(LOG_KEY, JSON.stringify(out))
    return out
  } catch {
    return {}
  }
}

export default function PlannerPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null

  const [searchParams, setSearchParams] = useSearchParams()
  const [meals, setMeals] = useState<Meal[]>([])
  const [plan, setPlan] = useState<MealPlanSlot[]>([])
  const [logged, setLogged] = useState<Record<string, LoggedMeal>>(loadLog)
  const [loggerSlot, setLoggerSlot] = useState<{
    date: ISODate
    type: MealType
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  const weekParam = searchParams.get("week")
  const weekStart: ISODate = isISODate(weekParam) ? weekParam : startOfWeek()

  function changeWeek(next: ISODate) {
    const sp = new URLSearchParams(searchParams)
    sp.set("week", next)
    setSearchParams(sp)
  }

  useEffect(() => {
    if (!userId) {
      setMeals(demoMeals)
      return
    }
    getMeals().then(setMeals)
  }, [userId])

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setPlan(demoPlan)
      return
    }
    getMealPlan(weekStart).then((p) => {
      if (!cancelled) setPlan(p)
    })
    return () => {
      cancelled = true
    }
  }, [weekStart, userId])

  useEffect(() => {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(logged))
  }, [logged])

  function getSlot(date: ISODate, type: MealType): MealPlanSlot | undefined {
    return plan.find((s) => s.date === date && s.meal_type === type)
  }

  const slotKey = (date: ISODate, type: MealType) => `${date}-${type}`

  function removeLog(date: ISODate, type: MealType) {
    const next = { ...logged }
    delete next[slotKey(date, type)]
    setLogged(next)
  }

  async function handleChange(date: ISODate, type: MealType, mealId: string) {
    if (!userId) {
      openAuth()
      return
    }
    const id = mealId || null
    await updatePlanSlot(date, type, id)
    setPlan(
      plan.map((s) =>
        s.date === date && s.meal_type === type ? { ...s, meal_id: id } : s,
      ),
    )
  }

  async function handleGenerateGrocery() {
    if (!userId) {
      openAuth()
      return
    }
    setGenerating(true)
    await generateGroceryList(weekStart)
    setGenerating(false)
    navigate(`/grocery?week=${weekStart}`)
  }

  const weekDates = new Set(
    Array.from({ length: DAYS.length }, (_, i) => dateInWeek(weekStart, i)),
  )
  const weekLogEntries = Object.entries(logged).filter(([key]) =>
    weekDates.has(key.slice(0, 10)),
  )

  const plannedCount = plan.filter((s) => s.meal_id).length
  const loggedCount = weekLogEntries.length
  const totalSlots = DAYS.length * MEAL_TYPES.length

  const loggedCalories = weekLogEntries.reduce(
    (sum, [_, m]) => sum + m.calories,
    0,
  )

  // Summary: total calories planned for the week (including logged meals)
  const totalCalories =
    plan.reduce((sum, slot) => {
      if (!slot.meal_id) return sum
      const meal = meals.find((m) => m.id === slot.meal_id)
      return sum + (meal?.calories || 0)
    }, 0) + loggedCalories

  const columnTotals = MEAL_TYPES.map(
    (type) =>
      plan.reduce((sum, slot) => {
        if (slot.meal_type !== type || !slot.meal_id) return sum
        const meal = meals.find((m) => m.id === slot.meal_id)
        return sum + (meal?.calories || 0)
      }, 0) +
      weekLogEntries.reduce((sum, [key, m]) => {
        return key.endsWith(`-${type}`) ? sum + m.calories : sum
      }, 0),
  )

  return (
    <div className="flex-1 p-4 sm:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl text-[var(--foreground)]">
                Weekly Planner
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {plannedCount}/{totalSlots} slots filled ·{" "}
                {totalCalories.toLocaleString()} kcal planned
                {loggedCount > 0 ? ` · ${loggedCount} logged` : ""}
              </p>
            </div>
            <button
              onClick={handleGenerateGrocery}
              disabled={generating || plannedCount === 0}
              className="flex w-full lg:w-auto items-center justify-center gap-2 px-5 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              {generating ? "Generating..." : "Generate Grocery List"}
            </button>
          </div>
          <WeekNavigator
            weekStart={weekStart}
            onChange={changeWeek}
            onToday={() => changeWeek(startOfWeek())}
          />
        </div>

        {meals.length === 0 && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-[var(--muted-foreground)]">
            <CalendarDays size={16} className="opacity-50 shrink-0" />
            <p className="text-sm">Add some meals in the Meal Library first.</p>
          </div>
        )}

        <>
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 mb-5">
            {MEAL_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-sm border-l-2 ${TYPE_ACCENT[t]} bg-[var(--muted)]`}
                />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {t}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile day-by-day view */}
          <div className="lg:hidden">
            <PlannerMobileView
              weekStart={weekStart}
              meals={meals}
              plan={plan}
              logged={logged}
              onChange={handleChange}
              onLog={(date, type) => setLoggerSlot({ date, type })}
              onRemoveLog={removeLog}
            />
          </div>

          {/* 7-day grid (desktop) */}
          <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                      Day
                    </th>
                    {MEAL_TYPES.map((t) => (
                      <th key={t} className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-sm border-l-2 ${TYPE_ACCENT[t]} bg-[var(--muted)]`}
                          />
                          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                            {t}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                      Daily kcal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, i) => {
                    const date = dateInWeek(weekStart, i)
                    const daySlots = plan.filter(
                      (s) => s.date === date && s.meal_id,
                    )
                    const dayCals =
                      daySlots.reduce((sum, slot) => {
                        const meal = meals.find((m) => m.id === slot.meal_id)
                        return sum + (meal?.calories || 0)
                      }, 0) +
                      MEAL_TYPES.reduce(
                        (sum, type) =>
                          sum + (logged[slotKey(date, type)]?.calories || 0),
                        0,
                      )
                    return (
                      <tr
                        key={date}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <p className="text-xs font-semibold text-[var(--foreground)]">
                            {dayFullLabel(day)}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                            {parseISODate(date).getDate()}{" "}
                            {parseISODate(date).toLocaleDateString(undefined, {
                              month: "short",
                            })}
                          </p>
                        </td>
                        {MEAL_TYPES.map((type) => {
                          const slot = getSlot(date, type)
                          const selectedMeal = slot?.meal_id
                            ? meals.find((m) => m.id === slot.meal_id)
                            : null
                          const log = logged[slotKey(date, type)]

                          return (
                            <td key={type} className="px-4 py-3 align-top">
                              <div className="min-h-[30px] mb-1.5">
                                {selectedMeal ? (
                                  <>
                                    <p className="text-xs font-medium text-[var(--foreground)] leading-tight">
                                      {selectedMeal.name}
                                    </p>
                                    <p className="text-[10px] text-[var(--muted-foreground)]">
                                      {selectedMeal.calories} kcal
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                    Empty
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 items-center">
                                <select
                                  value={slot?.meal_id || ""}
                                  onChange={(e) =>
                                    handleChange(date, type, e.target.value)
                                  }
                                  className="flex-1 min-w-0 px-1.5 py-1 pr-5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[10px] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                                >
                                  <option value="">— none —</option>
                                  {meals.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setLoggerSlot({ date, type })}
                                  title="Log what I ate"
                                  className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--muted)] transition-colors"
                                >
                                  <Camera size={12} />
                                </button>
                              </div>
                              {log && (
                                <div className="mt-1.5 flex items-center justify-between gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-medium text-amber-800 truncate">
                                      {log.food}
                                    </p>
                                    <p className="text-[10px] text-amber-700">
                                      ~{log.calories} kcal
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeLog(date, type)}
                                    className="text-amber-700/60 hover:text-amber-800 transition-colors shrink-0"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {dayCals}
                          </p>
                          <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">
                            kcal
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {plannedCount > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)]">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-widest">
                          Weekly
                        </p>
                      </td>
                      {MEAL_TYPES.map((type, i) => (
                        <td key={type} className="px-4 py-3">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {columnTotals[i].toLocaleString()}
                          </p>
                          <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">
                            kcal
                          </p>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold text-[var(--accent)]">
                          {totalCalories.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">
                          kcal
                        </p>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* AI hint */}
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--secondary)]">
            <Sparkles size={16} className="text-[var(--primary)] shrink-0" />
            <p className="text-xs text-[var(--primary)]">
              <strong>AI Auto-Plan</strong> — The Gemini integration shell is
              ready at{" "}
              <code className="bg-white/60 px-1 rounded text-[10px]">
                src/lib/ai-plan.ts
              </code>
              . Add your API key to auto-fill this entire table based on your
              macro targets.
            </p>
          </div>
        </>
      </div>

      <MealLoggerModal
        open={loggerSlot !== null}
        slotLabel={
          loggerSlot
            ? `${parseISODate(loggerSlot.date).toLocaleDateString(undefined, {
                weekday: "long",
              })} · ${loggerSlot.type}`
            : ""
        }
        onClose={() => setLoggerSlot(null)}
        onSave={(m) => {
          if (!loggerSlot) return
          const key = slotKey(loggerSlot.date, loggerSlot.type)
          setLogged({ ...logged, [key]: m })
        }}
      />
    </div>
  )
}
