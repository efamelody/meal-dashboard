import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  Camera,
  ChartLine,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react"
import {
  generateGroceryList,
  getDashboardSummary,
  getMealPlan,
  getMeals,
  updatePlanSlot,
} from "../lib/db"
import {
  DAYS,
  dateInWeek,
  dayFullLabel,
  isISODate,
  parseISODate,
  startOfWeek,
  toISODate,
} from "../lib/dates"
import { slotKey, useMealLog } from "../lib/mealLog"
import type {
  DashboardSummary,
  Meal,
  MealPlanSlot,
  MealType,
  ISODate,
} from "../lib/types"
import { useAuth } from "../context/AuthContext"
import { buildDemoSummary, demoMeals, demoPlan } from "../lib/demo"
import MealLoggerModal from "../components/MealLoggerModal"
import PlannerMobileView from "../components/PlannerMobileView"
import WeekNavigator from "../components/WeekNavigator"
import WeeklyCaloriesChart from "../components/WeeklyCaloriesChart"
import { PageContainer, PageHeader } from "../components/PageHeader"
import { useToast } from "../components/Toast"
import {
  Button,
  Card,
  CardHead,
  CardSkeleton,
  EmptyState,
  ErrorState,
  InlineNote,
  ProgressBar,
} from "../components/ui"

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]
const FILL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"]
const MAX_SERVINGS = 12

const TYPE_ACCENT: Record<MealType, string> = {
  Breakfast: "border-l-amber-400",
  Lunch: "border-l-emerald-400",
  Dinner: "border-l-sky-400",
  Snack: "border-l-rose-400",
}

function verdictLine(summary: DashboardSummary): string {
  const { weekAvgKcal, targetKcal, plannedSlots } = summary
  if (targetKcal == null)
    return "Set a calorie target in your profile to compare this plan with your goal."
  if (plannedSlots === 0)
    return "Nothing planned yet — fill the week to see how it lines up."
  const diff = weekAvgKcal - targetKcal
  if (diff > 0)
    return `Averaging ${weekAvgKcal} kcal/day — ${diff} over your ${targetKcal} kcal target.`
  if (diff < 0)
    return `Averaging ${weekAvgKcal} kcal/day — ${-diff} under your ${targetKcal} kcal target.`
  return `Averaging ${weekAvgKcal} kcal/day — right on your ${targetKcal} kcal target.`
}

export default function PlannerPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [meals, setMeals] = useState<Meal[]>([])
  const [plan, setPlan] = useState<MealPlanSlot[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loggerSlot, setLoggerSlot] = useState<{
    date: ISODate
    type: MealType
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const { log, logMeal, removeLog } = useMealLog()

  const weekParam = searchParams.get("week")
  const weekStart: ISODate = isISODate(weekParam) ? weekParam : startOfWeek()
  const today = toISODate(new Date())

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
    let cancelled = false
    getMeals()
      .then((m) => {
        if (!cancelled) setMeals(m)
      })
      .catch((err) => {
        console.error("getMeals:", err)
        toast("Could not load your meals", "error")
      })
    return () => {
      cancelled = true
    }
  }, [userId, toast])

  const loadWeek = useCallback(
    async (showSkeleton: boolean) => {
      if (showSkeleton) {
        setSummary(null)
        setError(null)
      }
      if (!userId) {
        setPlan(demoPlan)
        setSummary(buildDemoSummary())
        return
      }
      try {
        const [p, s] = await Promise.all([
          getMealPlan(weekStart),
          getDashboardSummary(weekStart),
        ])
        setPlan(p)
        setSummary(s)
        setError(null)
      } catch (err) {
        console.error("loadWeek:", err)
        setError("Could not load your plan for this week.")
      }
    },
    [userId, weekStart],
  )

  useEffect(() => {
    loadWeek(true)
  }, [loadWeek])

  async function refreshSummary() {
    if (!userId) {
      setSummary(buildDemoSummary())
      return
    }
    try {
      setSummary(await getDashboardSummary(weekStart))
    } catch (err) {
      console.error("refreshSummary:", err)
    }
  }

  function getSlot(date: ISODate, type: MealType): MealPlanSlot | undefined {
    return plan.find((s) => s.date === date && s.meal_type === type)
  }

  async function applySlot(
    date: ISODate,
    type: MealType,
    mealId: string | null,
    servings: number,
  ): Promise<void> {
    if (!userId) {
      openAuth()
      return
    }
    try {
      await updatePlanSlot(date, type, mealId, servings)
      setPlan((prev) =>
        prev.map((s) =>
          s.date === date && s.meal_type === type
            ? { ...s, meal_id: mealId, servings: mealId ? servings : 1 }
            : s,
        ),
      )
      void refreshSummary()
    } catch (err) {
      console.error("updatePlanSlot:", err)
      toast("Could not save that slot", "error")
    }
  }

  function handleChange(date: ISODate, type: MealType, mealId: string) {
    const id = mealId || null
    const current = getSlot(date, type)
    const servings = id ? current?.servings || 1 : 1
    void applySlot(date, type, id, servings)
  }

  function handleServings(date: ISODate, type: MealType, next: number) {
    const current = getSlot(date, type)
    if (!current?.meal_id) return
    const servings = Math.min(MAX_SERVINGS, Math.max(1, next))
    if (servings === (current.servings || 1)) return
    void applySlot(date, type, current.meal_id, servings)
  }

  async function handleAutoFill() {
    if (!userId) {
      openAuth()
      return
    }
    if (!meals.length) {
      toast("Add meals to your library first", "info")
      return
    }
    const empties: Array<{
      date: ISODate
      meal_type: MealType
    }> = []
    for (let i = 0; i < DAYS.length; i++) {
      const date = dateInWeek(weekStart, i)
      for (const type of FILL_TYPES) {
        if (!getSlot(date, type)?.meal_id)
          empties.push({ date, meal_type: type })
      }
    }
    if (!empties.length) {
      toast("Every meal slot is already filled", "info")
      return
    }
    setAutoFilling(true)
    try {
      const pick = () => meals[Math.floor(Math.random() * meals.length)].id
      await Promise.all(
        empties.map((e) => updatePlanSlot(e.date, e.meal_type, pick(), 1)),
      )
      setPlan(await getMealPlan(weekStart))
      await refreshSummary()
      toast(
        `${empties.length} empty slot${
          empties.length === 1 ? "" : "s"
        } filled from your saved meals`,
      )
    } catch (err) {
      console.error("autoFill:", err)
      toast("Could not fill the empty slots", "error")
    } finally {
      setAutoFilling(false)
    }
  }

  async function handleGenerateGrocery() {
    if (!userId) {
      openAuth()
      return
    }
    setGenerating(true)
    try {
      await generateGroceryList(weekStart)
      toast("Grocery list updated from this week's plan")
      navigate(`/kitchen/grocery?week=${weekStart}`)
    } catch (err) {
      console.error("generateGroceryList:", err)
      toast("Could not generate the grocery list", "error")
    } finally {
      setGenerating(false)
    }
  }

  const mealById = new Map(meals.map((m) => [m.id, m]))
  const plannedCount = plan.filter((s) => s.meal_id).length
  const totalSlots = DAYS.length * MEAL_TYPES.length
  const totalPlannedKcal = plan.reduce((sum, slot) => {
    if (!slot.meal_id) return sum
    const meal = mealById.get(slot.meal_id)
    return sum + (meal?.calories ?? 0) * (slot.servings || 1)
  }, 0)
  const columnTotals = MEAL_TYPES.map((type) =>
    plan.reduce((sum, slot) => {
      if (slot.meal_type !== type || !slot.meal_id) return sum
      const meal = mealById.get(slot.meal_id)
      return sum + (meal?.calories ?? 0) * (slot.servings || 1)
    }, 0),
  )

  const weekDates = new Set(
    Array.from({ length: DAYS.length }, (_, i) => dateInWeek(weekStart, i)),
  )
  const weekLogEntries = Object.entries(log).filter(([key]) =>
    weekDates.has(key.slice(0, 10)),
  )
  const loggedCount = weekLogEntries.length
  const loggedCalories = weekLogEntries.reduce(
    (sum, [, entry]) => sum + entry.calories,
    0,
  )

  const macroRows =
    summary?.weekMacros && summary.dailyMacroTarget
      ? [
          {
            label: "Protein",
            value: summary.weekMacros.protein_g,
            target: summary.dailyMacroTarget.protein_g * 7,
            tone: "success" as const,
          },
          {
            label: "Carbs",
            value: summary.weekMacros.carbs_g,
            target: summary.dailyMacroTarget.carbs_g * 7,
            tone: "blue" as const,
          },
          {
            label: "Fat",
            value: summary.weekMacros.fat_g,
            target: summary.dailyMacroTarget.fat_g * 7,
            tone: "terracotta" as const,
          },
        ]
      : []

  return (
    <PageContainer maxWidth="max-w-6xl">
      <PageHeader
        title="Weekly Plan"
        subtitle={`${plannedCount}/${totalSlots} slots filled · ${totalPlannedKcal.toLocaleString()} kcal planned${
          loggedCount > 0
            ? ` · ${loggedCount} logged (${loggedCalories.toLocaleString()} kcal eaten)`
            : ""
        }`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              loading={autoFilling}
            >
              <Sparkles size={14} />
              Fill empty slots
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateGrocery}
              loading={generating}
              disabled={generating || plannedCount === 0}
            >
              <ShoppingCart size={14} />
              Generate grocery list
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekNavigator
            weekStart={weekStart}
            onChange={changeWeek}
            onToday={() => changeWeek(startOfWeek())}
          />
          <div className="hidden lg:flex items-center gap-4">
            {MEAL_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-sm border-l-2 ${TYPE_ACCENT[t]} bg-muted`}
                />
                <span className="text-xs text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* Week at a glance */}
      <Card>
        <CardHead
          title="Week at a glance"
          icon={<ChartLine size={16} className="text-primary" />}
          action={
            summary?.targetKcal != null && (
              <span className="tabular text-sm text-muted-foreground">
                target {summary.targetKcal} kcal/day
              </span>
            )
          }
        />
        {error ? (
          <ErrorState message={error} onRetry={() => loadWeek(true)} />
        ) : !summary ? (
          <CardSkeleton rows={4} />
        ) : summary.plannedSlots === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={20} />}
            title="Nothing planned this week"
            description="Pick meals slot by slot below, or fill the empty breakfast, lunch and dinner slots from your saved meals."
            action={
              <Button size="sm" onClick={handleAutoFill} loading={autoFilling}>
                <Sparkles size={14} />
                Fill empty slots
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 min-w-0">
              <WeeklyCaloriesChart
                week={summary.week}
                targetKcal={summary.targetKcal}
              />
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border pt-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {verdictLine(summary)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {summary.plannedSlots} of {totalSlots} slots planned · bars
                    above the dashed line are over target
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {macroRows.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-foreground mb-2.5">
                    Weekly macros (planned)
                  </p>
                  <div className="space-y-3">
                    {macroRows.map((m) => (
                      <div key={m.label}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium text-foreground">
                            {m.label}
                          </span>
                          <span className="tabular text-[11px] text-muted-foreground">
                            {m.value}/{m.target}g
                          </span>
                        </div>
                        <ProgressBar
                          value={m.value}
                          max={m.target}
                          tone={m.tone}
                          className="mt-1 h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[13px] font-semibold text-foreground mb-2.5">
                  Grocery list
                </p>
                {summary.groceryTotal === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    Generate it once the week is filled — bought items are kept
                    on every regeneration.
                  </p>
                ) : (
                  <>
                    <ProgressBar
                      value={summary.groceryBought}
                      max={summary.groceryTotal}
                      tone="success"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="tabular text-[13px] text-foreground">
                        {summary.groceryBought} of {summary.groceryTotal} bought
                      </span>
                      <Link
                        to={`/kitchen/grocery?week=${weekStart}`}
                        className="text-[13px] font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {meals.length === 0 && (
        <div className="mt-4">
          <InlineNote icon={<CalendarDays size={15} />}>
            Your meal library is empty —{" "}
            <Link
              to="/kitchen/meals"
              className="font-medium underline underline-offset-2"
            >
              add a few meals
            </Link>{" "}
            and they&apos;ll show up in every slot below.
          </InlineNote>
        </div>
      )}

      {/* Mobile day-by-day view */}
      <div className="lg:hidden mt-4">
        <PlannerMobileView
          weekStart={weekStart}
          meals={meals}
          plan={plan}
          logged={log}
          onChange={handleChange}
          onServings={handleServings}
          onLog={(date, type) => setLoggerSlot({ date, type })}
          onRemoveLog={removeLog}
        />
      </div>

      {/* 7-day grid (desktop) */}
      <Card className="mt-4 hidden lg:block">
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Day
                </th>
                {MEAL_TYPES.map((t) => (
                  <th key={t} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-sm border-l-2 ${TYPE_ACCENT[t]} bg-muted`}
                      />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        {t}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Planned kcal
                </th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => {
                const date = dateInWeek(weekStart, i)
                const dayPlanned = plan
                  .filter((s) => s.date === date && s.meal_id)
                  .reduce((sum, slot) => {
                    const meal = mealById.get(slot.meal_id!)
                    return sum + (meal?.calories ?? 0) * (slot.servings || 1)
                  }, 0)
                const isToday = date === today
                return (
                  <tr
                    key={date}
                    className={`border-t border-border ${
                      isToday ? "bg-sage/40" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                      <p className="text-xs font-semibold text-foreground">
                        {dayFullLabel(day)}
                        {isToday && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-secondary-foreground">
                            today
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {parseISODate(date).getDate()}{" "}
                        {parseISODate(date).toLocaleDateString(undefined, {
                          month: "short",
                        })}
                      </p>
                    </td>
                    {MEAL_TYPES.map((type) => {
                      const slot = getSlot(date, type)
                      const selectedMeal = slot?.meal_id
                        ? (mealById.get(slot.meal_id) ?? null)
                        : null
                      const servings = slot?.servings || 1
                      const logEntry = log[slotKey(date, type)]

                      return (
                        <td key={type} className="px-3 py-2.5 align-top">
                          <div className="min-h-[34px] mb-1.5">
                            {selectedMeal ? (
                              <>
                                <p className="text-xs font-medium text-foreground leading-tight">
                                  {selectedMeal.name}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-1.5">
                                  <span className="tabular text-[10px] text-muted-foreground">
                                    {selectedMeal.calories * servings} kcal
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-0.5 py-0.5">
                                    <button
                                      type="button"
                                      aria-label={`Decrease ${type} servings`}
                                      disabled={servings <= 1}
                                      onClick={() =>
                                        handleServings(date, type, servings - 1)
                                      }
                                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span className="tabular w-5 text-center text-[10px] font-medium text-foreground">
                                      {servings}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Increase ${type} servings`}
                                      disabled={servings >= MAX_SERVINGS}
                                      onClick={() =>
                                        handleServings(date, type, servings + 1)
                                      }
                                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic">
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
                              aria-label={`${type} meal on ${dayFullLabel(day)}`}
                              className="flex-1 min-w-0 px-1.5 py-1 pr-5 rounded-md border border-border bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">— none —</option>
                              {meals.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setLoggerSlot({ date, type })}
                              title="Log what I ate"
                              className="p-1 rounded-md text-muted-foreground hover:text-terracotta hover:bg-muted transition-colors"
                            >
                              <Camera size={12} />
                            </button>
                          </div>
                          {logEntry && (
                            <div className="mt-1.5 flex items-center justify-between gap-1 px-2 py-1 rounded-md bg-sage border border-[#dde6d6]">
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-secondary-foreground truncate">
                                  {logEntry.food}
                                </p>
                                <p className="tabular text-[10px] text-secondary-foreground/70">
                                  ~{logEntry.calories} kcal
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label="Remove log"
                                onClick={() => removeLog(date, type)}
                                className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors shrink-0"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
                      <p className="tabular text-sm font-semibold text-foreground">
                        {dayPlanned.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        kcal
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {plannedCount > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-widest">
                      Weekly
                    </p>
                  </td>
                  {columnTotals.map((total, i) => (
                    <td key={MEAL_TYPES[i]} className="px-3 py-2.5">
                      <p className="tabular text-sm font-semibold text-foreground">
                        {total.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        kcal
                      </p>
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right">
                    <p className="tabular text-sm font-semibold text-primary">
                      {totalPlannedKcal.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      kcal
                    </p>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Servings scale ingredient amounts when you regenerate the grocery list.
        Logged meals are what you ate — they never change the plan.
      </p>

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
          logMeal(loggerSlot.date, loggerSlot.type, m)
          toast(`${loggerSlot.type} logged — ${m.calories} kcal`)
        }}
      />
    </PageContainer>
  )
}
