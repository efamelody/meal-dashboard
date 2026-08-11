import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Salad,
  Package,
  CalendarDays,
  ShoppingCart,
  HeartPulse,
  Dumbbell,
  ArrowRight,
} from "lucide-react"
import { getDashboardSummary } from "../lib/db"
import { GOAL_LABELS } from "../lib/nutrition"
import { startOfWeek } from "../lib/dates"
import type { DashboardSummary, ISODate } from "../lib/types"
import WeeklyCaloriesChart from "../components/WeeklyCaloriesChart"
import WeekNavigator from "../components/WeekNavigator"
import { useAuth } from "../context/AuthContext"
import { buildDemoSummary } from "../lib/demo"

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function verdictLine(summary: DashboardSummary): string {
  const { weekAvgKcal, targetKcal, plannedSlots } = summary
  if (targetKcal == null)
    return "Set up your fitness profile to compare your plan against a calorie target."
  if (plannedSlots === 0)
    return "Nothing planned this week yet — add meals to your planner."
  const diff = weekAvgKcal - targetKcal
  if (diff > 0)
    return `Averaging ${weekAvgKcal} kcal/day — ${diff} over your ${targetKcal} kcal target.`
  if (diff < 0)
    return `Averaging ${weekAvgKcal} kcal/day — ${-diff} under your ${targetKcal} kcal target.`
  return `Averaging ${weekAvgKcal} kcal/day — right on your ${targetKcal} kcal target.`
}

export default function DashboardPage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [weekStart, setWeekStart] = useState<ISODate>(startOfWeek)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!userId) {
      setSummary(buildDemoSummary())
      setLoading(false)
      return
    }
    getDashboardSummary(weekStart).then((data) => {
      if (!cancelled) {
        setSummary(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [weekStart, userId])

  if (!summary) {
    return (
      <div className="flex-1 p-4 sm:p-8 min-h-screen">
        <div className="max-w-3xl mx-auto text-sm text-[var(--muted-foreground)]">
          Loading your progress…
        </div>
      </div>
    )
  }

  const {
    profile,
    meals,
    uniqueIngredients,
    inStock,
    lowStock,
    outOfStock,
    plannedSlots,
    groceryTotal,
    groceryBought,
    groceryLeft,
    week,
    weekAvgKcal,
    targetKcal,
    weekMacros,
    dailyMacroTarget,
  } = summary

  const inventoryTotal = inStock + lowStock + outOfStock

  const cards = [
    {
      label: "Saved Meals",
      value: meals,
      sub: uniqueIngredients
        ? `${uniqueIngredients} ingredients`
        : "in your library",
      icon: Salad,
      to: "/meals",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "In Stock",
      value: inStock,
      sub: inventoryTotal
        ? `of ${inventoryTotal} inventory items`
        : "inventory items",
      icon: Package,
      to: "/inventory",
      color: "bg-sky-50 text-sky-700",
    },
    {
      label: "Slots Planned",
      value: plannedSlots,
      sub: "of 21 this week",
      icon: CalendarDays,
      to: "/planner",
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Left to Buy",
      value: groceryLeft,
      sub: "grocery items",
      icon: ShoppingCart,
      to: "/grocery",
      color: "bg-amber-50 text-amber-700",
    },
  ]

  const macroRows =
    weekMacros && dailyMacroTarget
      ? [
          {
            label: "Protein",
            value: weekMacros.protein_g,
            target: dailyMacroTarget.protein_g * 7,
            color: "bg-emerald-500",
          },
          {
            label: "Carbs",
            value: weekMacros.carbs_g,
            target: dailyMacroTarget.carbs_g * 7,
            color: "bg-sky-500",
          },
          {
            label: "Fat",
            value: weekMacros.fat_g,
            target: dailyMacroTarget.fat_g * 7,
            color: "bg-amber-500",
          },
        ]
      : []

  return (
    <div className="flex-1 p-4 sm:p-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-4xl text-[var(--foreground)] mb-2">
                Your progress
              </h2>
              <p className="text-[var(--muted-foreground)]">
                How this week's plan lines up with your goals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  Loading…
                </span>
              )}
              <WeekNavigator
                weekStart={weekStart}
                onChange={setWeekStart}
                onToday={() => setWeekStart(startOfWeek())}
                compact
              />
            </div>
          </div>
        </div>

        {profile ? (
          <button
            onClick={() => navigate("/profile")}
            className="group w-full flex items-center justify-between gap-4 mb-6 px-6 py-5 rounded-2xl bg-[var(--secondary)] text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
                <HeartPulse size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Daily calorie target · {GOAL_LABELS[profile.goal]}
                </p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">
                  {profile.daily_calorie_target}{" "}
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">
                    kcal / day
                  </span>
                </p>
              </div>
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
          </button>
        ) : (
          <button
            onClick={() => navigate("/profile")}
            className="group w-full flex items-center justify-between gap-4 mb-6 px-6 py-5 rounded-2xl bg-[var(--secondary)] text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
                <HeartPulse size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Set up your fitness profile
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Get a personalized calorie and macro target.
                </p>
              </div>
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--muted-foreground)] shrink-0"
            />
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 mb-10">
          {cards.map(({ label, value, sub, icon: Icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                />
              </div>
              <p className="text-3xl font-semibold text-[var(--foreground)] mb-1">
                {value}
              </p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {label}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {sub}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-10">
          <h3 className="text-xl text-[var(--foreground)] mb-4">
            This week vs. your target
          </h3>
          {plannedSlots === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {profile
                  ? "Plan your week to see how your calories line up with your target."
                  : "Plan your week and set up your profile to see calories vs. target."}
              </p>
              <button
                onClick={() => navigate(`/planner?week=${weekStart}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Fill the weekly planner
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              <WeeklyCaloriesChart week={week} targetKcal={targetKcal} />
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--foreground)] font-medium">
                    {verdictLine(summary)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {plannedSlots} of 21 slots planned · bars above the dashed
                    line are over target
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/planner?week=${weekStart}`)}
                  className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Adjust plan
                </button>
              </div>
            </>
          )}
        </div>

        {macroRows.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-10">
            <h3 className="text-xl text-[var(--foreground)] mb-1">
              Weekly macros
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Planned this week vs. your daily target (x7 days).
            </p>
            <div className="space-y-4">
              {macroRows.map(({ label, value, target, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {label}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {value} g planned · {target} g target
                    </span>
                  </div>
                  <ProgressBar value={value} max={target} color={color} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-[var(--foreground)]">Grocery list</h3>
            <button
              onClick={() => navigate(`/grocery?week=${weekStart}`)}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Open
            </button>
          </div>
          {groceryTotal === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                No grocery list yet — fill the planner and generate one.
              </p>
              <button
                onClick={() => navigate(`/planner?week=${weekStart}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Plan your week
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div>
              <ProgressBar
                value={groceryBought}
                max={groceryTotal}
                color="bg-emerald-500"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-[var(--foreground)] font-medium">
                  {groceryBought} of {groceryTotal} items bought
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {groceryLeft} left to buy
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-[var(--foreground)]">
              Kitchen inventory
            </h3>
            <button
              onClick={() => navigate("/inventory")}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Open
            </button>
          </div>
          {inventoryTotal === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                No inventory yet — log what you already have.
              </p>
              <button
                onClick={() => navigate("/inventory")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add inventory
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex h-2 rounded-full overflow-hidden">
                {inStock > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(inStock / inventoryTotal) * 100}%` }}
                  />
                )}
                {lowStock > 0 && (
                  <div
                    className="bg-amber-400"
                    style={{ width: `${(lowStock / inventoryTotal) * 100}%` }}
                  />
                )}
                {outOfStock > 0 && (
                  <div
                    className="bg-red-400"
                    style={{ width: `${(outOfStock / inventoryTotal) * 100}%` }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "In stock", value: inStock, dot: "bg-emerald-500" },
                  { label: "Low", value: lowStock, dot: "bg-amber-400" },
                  { label: "Out", value: outOfStock, dot: "bg-red-400" },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-[var(--foreground)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl text-[var(--foreground)]">Exercise</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-[var(--secondary)] text-[var(--primary)]">
              Planned
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--primary)] shrink-0">
              <Dumbbell size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Exercise tracking — coming soon
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                Log strength &amp; cardio sessions and see daily calorie-burn
                suggestions to balance your plan.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-xl text-[var(--foreground)] mb-4">Quick Start</h3>
          <div className="space-y-3">
            {[
              {
                step: "1",
                text: "Add your meals and recipes in the Meal Library",
                to: "/meals",
              },
              {
                step: "2",
                text: "Log what you already have in Kitchen Inventory",
                to: "/inventory",
              },
              {
                step: "3",
                text: "Fill the Weekly Planner and generate your grocery list",
                to: "/planner",
              },
            ].map(({ step, text, to }) => (
              <button
                key={step}
                onClick={() => navigate(to)}
                className="group w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors text-left"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--secondary)] text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0">
                  {step}
                </span>
                <span className="text-sm text-[var(--foreground)] flex-1">
                  {text}
                </span>
                <ArrowRight
                  size={14}
                  className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
