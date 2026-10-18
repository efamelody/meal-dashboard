import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Activity as ActivityIcon,
  ArrowRight,
  Check,
  ChevronRight,
  Cookie,
  Dumbbell,
  Flame,
  Gauge,
  Moon,
  Package,
  Plus,
  Salad,
  ShoppingBasket,
  Sun,
  Sunrise,
  Trash2,
  Users,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { getHomeData, updateActivity, type HomeData } from "../lib/db"
import { buildDemoHome } from "../lib/demo"
import { toISODate } from "../lib/dates"
import { entriesForDate, totalsForDate, useMealLog } from "../lib/mealLog"
import { ACTIVITY_ICONS, activityDisplayLabel } from "../lib/activityMeta"
import {
  fmtRange,
  fmtSignedRange,
  REFERENCE_WEIGHT_KG,
  sumCompletedBurn,
} from "../lib/calorieEstimate"
import { GOAL_LABELS } from "../lib/nutrition"
import type { Activity, MealType } from "../lib/types"
import { PageContainer, PageHeader } from "../components/PageHeader"
import MealLoggerModal from "../components/MealLoggerModal"
import { useToast } from "../components/Toast"
import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  EmptyState,
  ErrorState,
  ProgressBar,
} from "../components/ui"

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

export default function HomePage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const navigate = useNavigate()
  const { log, logMeal, removeLog } = useMealLog()

  const now = useMemo(() => new Date(), [])
  const today = useMemo(() => toISODate(now), [now])

  const [home, setHome] = useState<HomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggerType, setLoggerType] = useState<MealType | null>(null)

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true)
      setError(null)
      if (!userId) {
        setHome(buildDemoHome(today))
        setLoading(false)
        return
      }
      try {
        setHome(await getHomeData(today))
      } catch (err) {
        console.error("getHomeData:", err)
        setError("Could not load your day. Check your connection and retry.")
      } finally {
        setLoading(false)
      }
    },
    [userId, today],
  )

  useEffect(() => {
    load(true)
  }, [load])

  const greeting = useMemo(() => {
    const hour = now.getHours()
    return hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening"
  }, [now])

  const dateLine = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [now],
  )

  const timeLine = useMemo(
    () =>
      now.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [now],
  )

  const displayName = session?.user.email?.split("@")[0] ?? null

  if (loading && !home) {
    return (
      <PageContainer>
        <PageHeader title={greeting} subtitle={dateLine} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 lg:p-6">
            <CardSkeleton rows={4} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 lg:p-6">
            <CardSkeleton rows={3} />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 lg:p-6">
          <CardSkeleton rows={4} />
        </div>
      </PageContainer>
    )
  }

  if (error || !home) {
    return (
      <PageContainer>
        <PageHeader title={greeting} subtitle={dateLine} />
        <ErrorState
          message={error ?? "Something went wrong loading your day."}
          onRetry={() => load(true)}
        />
      </PageContainer>
    )
  }

  const profile = home.profile
  const logged = totalsForDate(log, today)
  const loggedByType = new Map(
    entriesForDate(log, today).map((e) => [e.type, e.entry]),
  )
  const plannedKcal = home.todaySlots.reduce(
    (sum, slot) => sum + (slot.meal ? slot.meal.calories * slot.servings : 0),
    0,
  )

  const completedMin = home.todayActivities
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.duration_min, 0)
  const plannedMin = home.todayActivities
    .filter((a) => a.status === "planned")
    .reduce((sum, a) => sum + a.duration_min, 0)
  const activityTarget = profile?.daily_activity_min ?? 0

  const groceryBought = home.grocery.total - home.grocery.left

  // ── Estimated burn + energy balance (today) ─────────────────────
  const weightKg = profile?.weight_kg ?? null
  const burn = sumCompletedBurn(home.todayActivities, weightKg)
  const hasBalance = logged.count > 0 && burn.sessions > 0
  const netLow = logged.calories - burn.high
  const netHigh = logged.calories - burn.low
  const netMid = (netLow + netHigh) / 2
  const netLabel = !hasBalance
    ? "Estimated net"
    : netMid > 50
      ? "Estimated surplus"
      : netMid < -50
        ? "Estimated deficit"
        : "Estimated balance"

  function openLogger(type: MealType) {
    setLoggerType(type)
  }

  function openFirstUnlogged() {
    const next =
      MEAL_TYPES.find((t) => !loggedByType.has(t)) ??
      home!.todaySlots[0]?.meal_type ??
      "Breakfast"
    setLoggerType(next)
  }

  async function handleLogSave(entry: {
    food: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }) {
    if (!loggerType) return
    logMeal(today, loggerType, entry)
    toast(`${loggerType} logged — ${entry.calories} kcal`)
  }

  function handleLogRemove(type: MealType) {
    removeLog(today, type)
    toast("Removed from today's log", "info")
  }

  async function handleToggleActivity(activity: Activity) {
    if (!userId) {
      toast("Sign in to track your activity", "info")
      return
    }
    const next = activity.status === "planned" ? "completed" : "planned"
    try {
      await updateActivity(activity.id, { status: next })
      await load(false)
      toast(
        next === "completed"
          ? `${activityDisplayLabel(activity)} complete — ${activity.duration_min} min`
          : "Moved back to planned",
      )
    } catch (err) {
      console.error("updateActivity:", err)
      toast("Could not update activity", "error")
    }
  }

  const macroRows = profile
    ? [
        {
          label: "Protein",
          value: logged.protein_g,
          target: profile.protein_g_target,
          tone: "success" as const,
        },
        {
          label: "Carbs",
          value: logged.carbs_g,
          target: profile.carbs_g_target,
          tone: "blue" as const,
        },
        {
          label: "Fat",
          value: logged.fat_g,
          target: profile.fat_g_target,
          tone: "terracotta" as const,
        },
      ]
    : []

  const overTarget = profile
    ? logged.calories > profile.daily_calorie_target
    : false

  const loggerSlotLabel = loggerType ? `${loggerType} · ${dateLine}` : ""

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting}${displayName ? `, ${displayName}` : ""}`}
        subtitle={`${dateLine} · ${timeLine}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/plan")}>
            Open plan
            <ArrowRight size={14} />
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Nutrition ─────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHead
            title="Today's nutrition"
            icon={<Flame size={16} className="text-terracotta" />}
            action={
              profile && (
                <Badge tone={overTarget ? "warning" : "sage"}>
                  {GOAL_LABELS[profile.goal]}
                </Badge>
              )
            }
          />
          {profile ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] text-muted-foreground">
                    Eaten so far
                  </p>
                  <p className="tabular text-3xl font-semibold leading-tight text-foreground">
                    {logged.calories}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {profile.daily_calorie_target} kcal
                    </span>
                  </p>
                </div>
                <Button size="sm" onClick={openFirstUnlogged}>
                  <Plus size={15} />
                  Log a meal
                </Button>
              </div>
              <ProgressBar
                value={logged.calories}
                max={profile.daily_calorie_target}
                tone={overTarget ? "warning" : "primary"}
                className="mt-3"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {logged.count > 0
                  ? `${logged.count} meal${
                      logged.count === 1 ? "" : "s"
                    } logged`
                  : "Nothing logged yet"}{" "}
                · planned today: {plannedKcal} kcal
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                {macroRows.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between gap-1">
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
                      className="mt-1.5 h-1.5"
                    />
                  </div>
                ))}
              </div>

              {burn.sessions > 0 && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <ActivityIcon size={14} className="text-secondary" />
                      Estimated burn
                    </p>
                    <p className="tabular mt-1 text-xl font-semibold leading-tight text-foreground">
                      <span className="text-muted-foreground">≈ </span>
                      {fmtRange(burn.low, burn.high)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        kcal
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      from {burn.sessions} completed{" "}
                      {burn.sessions === 1 ? "session" : "sessions"}
                      {burn.skipped > 0
                        ? ` · ${burn.skipped} too vague to estimate`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Gauge size={14} className="text-primary" />
                      {netLabel}
                    </p>
                    <p className="tabular mt-1 text-xl font-semibold leading-tight text-foreground">
                      {hasBalance ? (
                        <>
                          <span className="text-muted-foreground">≈ </span>
                          {fmtSignedRange(netLow, netHigh)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            kcal
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hasBalance
                        ? "logged intake minus estimated burn"
                        : "log a meal to compare it"}
                    </p>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
                    Burn is a MET-based estimate (MET × weight × time) for
                    completed activity — an approximation, not a measurement,
                    using{" "}
                    {weightKg
                      ? `your ${Math.round(weightKg)} kg`
                      : `a ${REFERENCE_WEIGHT_KG} kg reference weight`}
                    . Resting metabolism isn&apos;t included.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-[#ead9c4] bg-sand p-4">
              <p className="text-sm font-medium text-[#8a5a38]">
                Set up your fitness profile
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8a5a38]/80">
                Get a personalized calorie and macro target, then log meals
                against it.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate("/profile")}
              >
                Set up profile
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </Card>

        {/* ── Activity ──────────────────────────────────────────── */}
        <Card>
          <CardHead
            title="Activity"
            icon={<Dumbbell size={16} className="text-success" />}
            action={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Log activity"
                onClick={() => navigate("/activity")}
              >
                <Plus size={16} />
              </Button>
            }
          />
          {activityTarget > 0 ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="tabular text-2xl font-semibold text-foreground">
                  {completedMin}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {activityTarget} min
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">
                  {plannedMin} min planned
                </span>
              </div>
              <ProgressBar
                value={completedMin}
                max={activityTarget}
                tone="success"
                className="mt-2.5"
              />
            </div>
          ) : (
            <p className="mb-3 text-[13px] text-muted-foreground">
              Track a daily activity goal alongside your nutrition.
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="ml-1 font-medium text-primary hover:underline"
              >
                Set a goal
              </button>
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {home.todayActivities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type]
              const done = activity.status === "completed"
              return (
                <li
                  key={activity.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      done
                        ? "bg-sage text-secondary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {activityDisplayLabel(activity)}
                    </p>
                    <p className="tabular text-xs text-muted-foreground">
                      {activity.duration_min} min
                      {activity.scheduled_time
                        ? ` · ${activity.scheduled_time}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={done ? "ghost" : "outline"}
                    onClick={() => handleToggleActivity(activity)}
                    aria-label={
                      done
                        ? `Move ${activityDisplayLabel(activity)} back to planned`
                        : `Mark ${activityDisplayLabel(activity)} complete`
                    }
                  >
                    {done ? (
                      <Badge tone="sage">Done</Badge>
                    ) : (
                      <>
                        <Check size={14} />
                        Done
                      </>
                    )}
                  </Button>
                </li>
              )
            })}
            {home.todayActivities.length === 0 && (
              <li>
                <EmptyState
                  compact
                  icon={<Dumbbell size={20} />}
                  title="Nothing logged today"
                  description={
                    activityTarget > 0
                      ? `You have a ${activityTarget} min daily goal — log any activity to get started.`
                      : "Walks, swims, gym sessions — any movement counts."
                  }
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/activity")}
                    >
                      <Plus size={14} />
                      Log activity
                    </Button>
                  }
                />
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* ── Today's meals ───────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHead
          title="Today's meals"
          action={
            <Link
              to="/plan"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open plan
            </Link>
          }
        />
        <ul className="divide-y divide-border -my-1">
          {home.todaySlots.map((slot) => {
            const Icon = MEAL_ICONS[slot.meal_type]
            const loggedEntry = loggedByType.get(slot.meal_type)
            const planned = slot.meal
            const plannedKcalForSlot = planned
              ? planned.calories * slot.servings
              : 0
            return (
              <li key={slot.meal_type} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${MEAL_ACCENT[slot.meal_type]}`}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">
                      {planned ? planned.name : "Nothing planned"}
                    </span>
                    {slot.servings > 1 && (
                      <Badge tone="neutral">×{slot.servings}</Badge>
                    )}
                    {loggedEntry && <Badge tone="sage">Logged</Badge>}
                  </div>
                  <p className="tabular truncate text-xs text-muted-foreground">
                    {slot.meal_type}
                    {planned ? ` · ${plannedKcalForSlot} kcal planned` : ""}
                    {loggedEntry
                      ? ` · logged: ${loggedEntry.food} (${loggedEntry.calories} kcal)`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {loggedEntry ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openLogger(slot.meal_type)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${slot.meal_type} log`}
                        onClick={() => handleLogRemove(slot.meal_type)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  ) : planned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLogger(slot.meal_type)}
                    >
                      Log
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openLogger(slot.meal_type)}
                      >
                        <Plus size={14} />
                        Log
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/plan")}
                      >
                        Plan
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* ── Kitchen + Community ─────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Kitchen"
            icon={<Package size={16} className="text-[#3f5b78]" />}
            action={
              <Link
                to="/kitchen/inventory"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open kitchen
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => navigate("/kitchen/inventory")}
              className="group rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-soft text-[#3f5b78]">
                  <Package size={15} />
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="tabular mt-2.5 text-xl font-semibold text-foreground">
                {home.inventory.inStock}
                <span className="text-xs font-normal text-muted-foreground">
                  /{home.inventory.total}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">in stock</p>
              <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                <span className="tabular">{home.inventory.low} low</span>
                <span className="tabular">{home.inventory.out} out</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/kitchen/grocery")}
              className="group rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand text-[#8a5a38]">
                  <ShoppingBasket size={15} />
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="tabular mt-2.5 text-xl font-semibold text-foreground">
                {home.grocery.left}
              </p>
              <p className="text-xs text-muted-foreground">left to buy</p>
              <ProgressBar
                value={groceryBought}
                max={home.grocery.total}
                tone="success"
                className="mt-2 h-1.5"
              />
            </button>

            <button
              type="button"
              onClick={() => navigate("/kitchen/meals")}
              className="group rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage text-secondary-foreground">
                  <Salad size={15} />
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="tabular mt-2.5 text-xl font-semibold text-foreground">
                {home.savedMeals}
              </p>
              <p className="text-xs text-muted-foreground">saved meals</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                in your library
              </p>
            </button>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Community"
            icon={<Users size={16} className="text-terracotta" />}
          />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            See what friends are cooking and share your own plates. The feed is
            being wired up right now.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/community")}
          >
            Open community
            <ArrowRight size={14} />
          </Button>
        </Card>
      </div>

      <MealLoggerModal
        open={loggerType !== null}
        slotLabel={loggerSlotLabel}
        onClose={() => setLoggerType(null)}
        onSave={handleLogSave}
      />
    </PageContainer>
  )
}
