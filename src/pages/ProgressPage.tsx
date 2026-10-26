import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity as ActivityIcon,
  ArrowRight,
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  X,
} from "lucide-react"
import { getActivities, getUserProfile } from "../lib/db"
import {
  addDays,
  DAYS,
  parseISODate,
  startOfWeek,
  toISODate,
} from "../lib/dates"
import { entriesForDate, totalsForDate } from "../lib/mealLog"
import { useMealLog } from "../context/MealLogContext"
import type { Activity, ActivityType, ISODate, UserProfile } from "../lib/types"
import { ACTIVITY_ICONS, activityDisplayLabel } from "../lib/activityMeta"
import { buildDemoActivities, demoProfile } from "../lib/demo"
import {
  estimateForActivity,
  fmtRange,
  fmtSignedRange,
  REFERENCE_WEIGHT_KG,
  sumCompletedBurn,
} from "../lib/calorieEstimate"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import { PageContainer, PageHeader } from "../components/PageHeader"
import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  InlineNote,
  ProgressBar,
} from "../components/ui"

const TODAY: ISODate = toISODate(new Date())
const PERIOD_START: ISODate = addDays(startOfWeek(new Date()), -21)
const PERIOD_END: ISODate = addDays(PERIOD_START, 27)
const WEEK_START: ISODate = startOfWeek()
const CELLS: ISODate[] = Array.from({ length: 28 }, (_, i) =>
  addDays(PERIOD_START, i),
)

interface DayTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

/** Fill per level (0 = none) for the bottom-left intake anchor. */
const GREEN_FILL: string[] = [
  "transparent",
  "rgba(5, 150, 105, 0.25)",
  "rgba(5, 150, 105, 0.45)",
  "rgba(5, 150, 105, 0.62)",
  "#047857",
]
/** Fill per level (0 = none) for the top-right burn anchor. */
const VIOLET_FILL: string[] = [
  "transparent",
  "rgba(139, 92, 246, 0.25)",
  "rgba(139, 92, 246, 0.45)",
  "rgba(139, 92, 246, 0.62)",
  "#7c3aed",
]
/** Translucent stone canvas so quiet days stay quiet. */
const STONE_BASE = "rgba(120, 113, 108, 0.1)"

/** 0 = nothing logged, 4 = well over target. */
function eatenLevelFor(ratio: number): number {
  if (ratio <= 0.5) return 1
  if (ratio <= 0.85) return 2
  if (ratio <= 1.15) return 3
  return 4
}

/** 0 = no completed activity, 4 = a big session. */
function burnedLevelFor(midKcal: number): number {
  if (midKcal >= 500) return 4
  if (midKcal >= 300) return 3
  if (midKcal >= 150) return 2
  return 1
}

/**
 * Vertical split that still blends: emerald anchored on the left for
 * intake, violet on the right for burn, with the two mixing through the
 * middle 40–60% band (indigo/magenta tones on balanced days). The stone
 * base runs underneath the whole cell so the blend never shows white.
 */
function cellBackground(eaten: number, burned: number): string {
  const green = eaten > 0 ? GREEN_FILL[eaten] : "transparent"
  const violet = burned > 0 ? VIOLET_FILL[burned] : "transparent"
  return `linear-gradient(to right, ${green} 40%, ${violet} 60%), ${STONE_BASE}`
}

function compactKcal(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n))
}

function shortDate(date: ISODate): string {
  return parseISODate(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

function longDate(date: ISODate): string {
  return parseISODate(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export default function ProgressPage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const { log, removeFood } = useMealLog()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<ISODate>(TODAY)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setProfile(demoProfile)
      setActivities(buildDemoActivities(PERIOD_START, TODAY))
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([getUserProfile(), getActivities(PERIOD_START, TODAY)])
      .then(([p, acts]) => {
        if (cancelled) return
        setProfile(p)
        setActivities(acts)
      })
      .catch((err) => {
        console.error("progress load:", err)
        toast("Could not load your progress", "error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, toast])

  // ── Logged totals for the period ────────────────────────────────
  const perDay = useMemo(() => {
    const map = new Map<ISODate, DayTotals>()
    for (const [key, entry] of Object.entries(log)) {
      const date = key.slice(0, 10)
      if (date < PERIOD_START || date > TODAY) continue
      const cur = map.get(date) ?? {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      }
      cur.calories += entry.calories
      cur.protein_g += entry.protein_g
      cur.carbs_g += entry.carbs_g
      cur.fat_g += entry.fat_g
      map.set(date, cur)
    }
    return map
  }, [log])

  const loggedDays = perDay.size
  let sumCal = 0
  let sumProtein = 0
  let sumCarbs = 0
  let sumFat = 0
  perDay.forEach((d) => {
    sumCal += d.calories
    sumProtein += d.protein_g
    sumCarbs += d.carbs_g
    sumFat += d.fat_g
  })
  const perLoggedDay = (sum: number) =>
    loggedDays > 0 ? Math.round(sum / loggedDays) : 0
  const avgCal = perLoggedDay(sumCal)
  const avgProtein = perLoggedDay(sumProtein)
  const avgCarbs = perLoggedDay(sumCarbs)
  const avgFat = perLoggedDay(sumFat)

  const target = profile?.daily_calorie_target ?? 0
  const macroRows = profile
    ? [
        {
          label: "Protein",
          value: avgProtein,
          target: profile.protein_g_target,
          tone: "success" as const,
        },
        {
          label: "Carbs",
          value: avgCarbs,
          target: profile.carbs_g_target,
          tone: "primary" as const,
        },
        {
          label: "Fat",
          value: avgFat,
          target: profile.fat_g_target,
          tone: "warning" as const,
        },
      ]
    : []

  // ── Activity derivations ────────────────────────────────────────
  const completedMinutes = activities
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + a.duration_min, 0)
  const plannedMinutes = activities
    .filter((a) => a.status === "planned")
    .reduce((s, a) => s + a.duration_min, 0)
  const thisWeekMinutes = activities
    .filter(
      (a) =>
        a.status === "completed" && a.date >= WEEK_START && a.date <= TODAY,
    )
    .reduce((s, a) => s + a.duration_min, 0)

  const minutesByActivity = new Map<string, {
    label: string
    type: ActivityType
    minutes: number
  }>()
  for (const a of activities) {
    if (a.status !== "completed") continue
    const label = activityDisplayLabel(a)
    const key = label.toLowerCase()
    const entry = minutesByActivity.get(key)
    if (entry) {
      entry.minutes += a.duration_min
    } else {
      minutesByActivity.set(key, {
        label,
        type: a.activity_type,
        minutes: a.duration_min,
      })
    }
  }
  const activityBreakdown = [...minutesByActivity.values()].sort(
    (a, b) => b.minutes - a.minutes,
  )

  const recent = [...activities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)

  const goalMin = profile?.daily_activity_min ?? 0
  const weeklyGoal = goalMin * 7

  // ── Estimated burn + energy balance ──────────────────────────────
  const weightKg = profile?.weight_kg ?? null

  const burn = useMemo(
    () => sumCompletedBurn(activities, weightKg),
    [activities, weightKg],
  )

  const activityByDay = useMemo(() => {
    const map = new Map<ISODate, {
      minutes: number
      low: number
      high: number
      hasEstimate: boolean
    }>()
    for (const a of activities) {
      if (a.status !== "completed") continue
      if (a.date < PERIOD_START || a.date > TODAY) continue
      const est = estimateForActivity(a, weightKg)
      const cur = map.get(a.date) ?? {
        minutes: 0,
        low: 0,
        high: 0,
        hasEstimate: false,
      }
      cur.minutes += a.duration_min
      if (est) {
        cur.low += est.lowKcal
        cur.high += est.highKcal
        cur.hasEstimate = true
      }
      map.set(a.date, cur)
    }
    return map
  }, [activities, weightKg])

  const hasBalance = loggedDays > 0 && burn.sessions > 0
  const netLow = sumCal - burn.high
  const netHigh = sumCal - burn.low
  const netMid = (netLow + netHigh) / 2
  const netLabel = !hasBalance
    ? "Estimated net"
    : netMid > 50
      ? "Estimated surplus"
      : netMid < -50
        ? "Estimated deficit"
        : "Estimated balance"

  // ── Selected day entries ────────────────────────────────────────
  const entries = entriesForDate(log, selectedDate)
  const dayTotals = totalsForDate(log, selectedDate)
  const dayActivity = activityByDay.get(selectedDate) ?? null

  return (
    <PageContainer>
      <PageHeader
        title="Progress"
        subtitle={`Logged meals and activity · ${shortDate(PERIOD_START)} – ${shortDate(PERIOD_END)}`}
        actions={
          <Link
            to="/activity"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Log activity
            <ArrowRight size={14} />
          </Link>
        }
      />

      {/* Row 1: eating + activity summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Eating (logged)"
            icon={<Flame size={16} className="text-terracotta" />}
            action={
              <Badge tone="neutral">{loggedDays} of 28 days logged</Badge>
            }
          />
          {loggedDays === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing logged in the last 4 weeks.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meals you log from Home or the Plan page show up here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] text-muted-foreground">
                    Average per logged day
                  </p>
                  <p className="tabular text-3xl font-semibold leading-tight text-foreground">
                    {avgCal}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      kcal
                      {target > 0 && ` / ${target} target`}
                    </span>
                  </p>
                </div>
                <p className="tabular text-[13px] text-muted-foreground">
                  total {sumCal.toLocaleString()} kcal
                </p>
              </div>
              {target > 0 && (
                <ProgressBar
                  value={avgCal}
                  max={target}
                  tone={avgCal > target * 1.1 ? "warning" : "primary"}
                  className="mt-3"
                />
              )}

              {profile ? (
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                  {macroRows.map((m) => (
                    <div key={m.label}>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[13px] font-medium text-foreground">
                          {m.label}
                        </span>
                        <span className="tabular text-[11px] text-muted-foreground">
                          {m.value} / {m.target} g
                        </span>
                      </div>
                      <ProgressBar
                        value={m.value}
                        max={m.target}
                        tone={m.tone}
                        className="mt-1.5"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border-t border-border pt-4">
                  <InlineNote tone="sand">
                    Set your calorie and macro targets in{" "}
                    <Link
                      to="/profile"
                      className="font-medium underline underline-offset-2"
                    >
                      Profile
                    </Link>{" "}
                    to compare logged intake against them.
                  </InlineNote>
                </div>
              )}

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
          )}
        </Card>

        <Card>
          <CardHead
            title="Activity"
            icon={<Dumbbell size={16} className="text-secondary" />}
            action={
              activities.length > 0 ? (
                <Badge tone="neutral">{activities.length}</Badge>
              ) : null
            }
          />
          {loading ? (
            <CardSkeleton rows={3} />
          ) : activities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No activity in this period.
              </p>
              <Link
                to="/activity"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Log an activity →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] text-muted-foreground">Completed</p>
                  <p className="tabular text-3xl font-semibold leading-tight text-foreground">
                    {completedMinutes}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      min
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-muted-foreground">Planned</p>
                  <p className="tabular text-lg font-semibold text-foreground">
                    {plannedMinutes} min
                  </p>
                </div>
              </div>

              {weeklyGoal > 0 ? (
                <>
                  <ProgressBar
                    value={thisWeekMinutes}
                    max={weeklyGoal}
                    tone={thisWeekMinutes >= weeklyGoal ? "success" : "primary"}
                    className="mt-3"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    This week: {thisWeekMinutes} min · goal {weeklyGoal} min (
                    {goalMin} min/day)
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  This week: {thisWeekMinutes} min. Set a daily activity goal in
                  Profile.
                </p>
              )}

              {activityBreakdown.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {activityBreakdown.map(({ label, type, minutes }) => {
                    const Icon = ACTIVITY_ICONS[type]
                    return (
                      <div
                        key={`${type}:${label.toLowerCase()}`}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <Icon size={15} className="shrink-0 text-secondary" />
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {label}
                        </span>
                        <span className="tabular text-xs text-muted-foreground">
                          {minutes} min
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent
                </p>
                <div className="space-y-2">
                  {recent.map((a) => {
                    const est = estimateForActivity(a, weightKg)
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <span className="tabular w-[64px] shrink-0 text-muted-foreground">
                          {shortDate(a.date)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {activityDisplayLabel(a)}
                        </span>
                        <span className="tabular text-right text-muted-foreground">
                          <span className="block">{a.duration_min}m</span>
                          {est && (
                            <span className="block text-[11px]">
                              ≈ {est.lowKcal}–{est.highKcal} kcal
                            </span>
                          )}
                        </span>
                        <Badge
                          tone={a.status === "completed" ? "sage" : "blue"}
                        >
                          {a.status === "completed" ? "Done" : "Planned"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Row 2: calendar + day detail */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Log calendar"
            icon={<CalendarDays size={16} className="text-primary" />}
            action={
              target > 0 ? (
                <Badge tone="neutral">target {target} kcal</Badge>
              ) : null
            }
          />
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {day.slice(0, 3)}
              </div>
            ))}
            {CELLS.map((date) => {
              const isFuture = date > TODAY
              const day = perDay.get(date)
              const act = activityByDay.get(date)
              const eatenLevel = !day
                ? 0
                : eatenLevelFor(target > 0 ? day.calories / target : 0.75)
              const actMid = act ? (act.low + act.high) / 2 : 0
              const burnedLevel = !act
                ? 0
                : act.hasEstimate
                  ? burnedLevelFor(actMid)
                  : 2
              const highIntensity = Math.max(eatenLevel, burnedLevel) >= 4
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${longDate(date)}${
                    day ? `, ${day.calories} kcal logged` : ""
                  }${
                    act
                      ? `, ${act.minutes} min activity ≈ ${Math.round(actMid)} kcal`
                      : ""
                  }${!day && !act ? ", nothing logged" : ""}`}
                  style={{
                    background: cellBackground(eatenLevel, burnedLevel),
                  }}
                  className={`rounded-lg border px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
                    isSelected
                      ? "border-2 border-[#059669] ring-2 ring-[#059669]/40"
                      : "border-border hover:border-[#059669]/50"
                  } ${highIntensity ? "text-white" : "text-foreground"}`}
                >
                  <span className="block text-[11px] font-medium leading-none">
                    {Number(date.slice(8, 10))}
                  </span>
                  <span className="tabular mt-1 block text-[10px] leading-none opacity-85">
                    {day
                      ? compactKcal(day.calories)
                      : act
                        ? compactKcal(actMid)
                        : ""}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              intake: less
              {[1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  className="inline-block h-3 w-3 rounded-sm border border-border/60"
                  style={{ background: GREEN_FILL[lvl] }}
                />
              ))}
              more
            </span>
            <span className="flex items-center gap-1">
              burn: less
              {[1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  className="inline-block h-3 w-3 rounded-sm border border-border/60"
                  style={{ background: VIOLET_FILL[lvl] }}
                />
              ))}
              more
            </span>
            <span>
              Green = intake (left) · purple = burn (right) · they blend in the
              middle on balanced days.
            </span>
            <span>Tap a day for details</span>
          </div>
        </Card>

        <Card>
          <CardHead
            title={longDate(selectedDate)}
            icon={<Clock size={16} className="text-muted-foreground" />}
            action={
              dayTotals.count > 0 ? (
                <Badge tone="sage">{dayTotals.count}</Badge>
              ) : null
            }
          />
          {entries.length === 0 && !dayActivity ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing logged on this day.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Logged days show their meals and totals here.
              </p>
            </div>
          ) : (
            <>
              {entries.length === 0 && dayActivity && (
                <p className="text-sm text-muted-foreground">
                  No meals logged on this day.
                </p>
              )}
              <div className="space-y-3">
                {entries.map(({ type, entry }) => (
                  <div key={type}>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{type}</Badge>
                      <span className="tabular text-xs text-muted-foreground">
                        {entry.calories} kcal
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {entry.foods.map((food) => (
                        <div key={food.id} className="flex items-start gap-2.5">
                          <div className="min-w-0 flex-1 pl-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {food.food}
                            </p>
                            <p className="tabular text-xs text-muted-foreground">
                              {food.calories} kcal · P{food.protein_g} C
                              {food.carbs_g} F{food.fat_g}
                            </p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Remove ${food.food}`}
                            className="hover:text-error"
                            onClick={() => {
                              removeFood(selectedDate, type, food.id)
                              toast(`${food.food} removed`, "info")
                            }}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {entries.length > 0 && (
                <>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium text-foreground">
                      Total
                    </span>
                    <span className="tabular text-sm font-semibold text-foreground">
                      {dayTotals.calories} kcal
                    </span>
                  </div>
                  <div className="tabular mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>P {dayTotals.protein_g} g</span>
                    <span>C {dayTotals.carbs_g} g</span>
                    <span>F {dayTotals.fat_g} g</span>
                  </div>
                </>
              )}
              {dayActivity && (
                <div
                  className={`flex items-start justify-between gap-3 ${
                    entries.length > 0
                      ? "mt-4 border-t border-border pt-3"
                      : "mt-1"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Dumbbell size={14} className="text-secondary" />
                      Activity
                    </p>
                    <p className="tabular mt-0.5 text-xs text-muted-foreground">
                      {dayActivity.minutes} min
                      {dayActivity.hasEstimate
                        ? ` · ≈ ${dayActivity.low.toLocaleString()}–${dayActivity.high.toLocaleString()} kcal burn`
                        : " · too vague to estimate"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
