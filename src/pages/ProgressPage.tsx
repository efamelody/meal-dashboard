import { useEffect, useMemo, useState } from "react"

import { Link } from "react-router-dom"

import {
  ArrowRight,
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  Plus,
  Scale,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import {
  addWeightLog,
  deleteWeightLog,
  getActivities,
  getHealthProfile,
  getWeeklyCheckins,
  getUserProfile,
  getWeightLogs,
  saveWeeklyCheckin,
  updateWeeklyCheckinNote,
} from "../lib/db"

import {
  addDays,
  DAYS,
  parseISODate,
  startOfWeek,
  toISODate,
} from "../lib/dates"

import { entriesForDate, totalsForDate } from "../lib/mealLog"

import { useMealLog } from "../context/MealLogContext"

import type {
  Activity,
  ActivityType,
  ISODate,
  UserProfile,
  WeeklyCheckin,
  WeeklyProgressReport,
  WeightLogEntry,
} from "../lib/types"

import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  activityDisplayLabel,
} from "../lib/activityMeta"

import {
  buildDemoActivities,
  buildDemoWeightLogs,
  demoProfile,
} from "../lib/demo"

import { sumCompletedBurn } from "../lib/calorieEstimate"

import { analyzeWeeklyProgress } from "../lib/gemini"

import {
  loadHealthProfile,
  summarizeHealthForPrompt,
  type HealthProfile,
} from "../lib/healthProfile"

import { useAuth } from "../context/AuthContext"

import { useToast } from "../components/Toast"

import { PageContainer, PageHeader } from "../components/PageHeader"

import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  FoodFlagBadge,
  InlineNote,
  ProgressBar,
} from "../components/ui"

const TODAY: ISODate = toISODate(new Date())

const PERIOD_START: ISODate = addDays(startOfWeek(new Date()), -21)

const PERIOD_END: ISODate = addDays(PERIOD_START, 27)

const WEEK_START: ISODate = startOfWeek()

interface DayTotals {
  calories: number

  protein_g: number

  carbs_g: number

  fat_g: number
}

/** Icon colours per workout category (chosen to read against green intake). */

const CATEGORY_COLORS: Record<ActivityType, string> = {
  cardio: "#f43f5e",

  strength: "#8b5cf6",

  mobility: "#f59e0b",

  other: "#64748b",
}

/** Fill per intake level (0 = none) for the calorie shade. */

const GREEN_FILL: string[] = [
  "transparent",
  "rgba(5, 150, 105, 0.25)",
  "rgba(5, 150, 105, 0.45)",
  "rgba(5, 150, 105, 0.62)",
  "#047857",
]

/** 0 = nothing logged, 4 = well over target. */

function eatenLevelFor(ratio: number): number {
  if (ratio <= 0.5) return 1

  if (ratio <= 0.85) return 2

  if (ratio <= 1.15) return 3

  return 4
}

/** Rank a day's categories by minutes, most first. */

function orderedCategories(cats: Map<ActivityType, number>): ActivityType[] {
  return [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
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

function RatingDots({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Progress score ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-full ${
            n <= value ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </span>
  )
}

function fmtKgDelta(n: number | null): string {
  if (n == null) return "—"

  const sign = n > 0 ? "+" : ""

  return `${sign}${n.toFixed(1)} kg`
}

export default function ProgressPage() {
  const { session } = useAuth()

  const userId = session?.user?.id ?? null

  const { log, removeFood } = useMealLog()

  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [activities, setActivities] = useState<Activity[]>([])

  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([])

  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])

  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState<ISODate>(TODAY)

  const [weightDate, setWeightDate] = useState<ISODate>(TODAY)

  const [weightValue, setWeightValue] = useState("")

  const [savingWeight, setSavingWeight] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)

  const [analyseError, setAnalyseError] = useState("")

  const [report, setReport] = useState<WeeklyProgressReport | null>(null)

  const [checkinNote, setCheckinNote] = useState("")

  const [savingNote, setSavingNote] = useState(false)

  const isCheckinOpen = TODAY >= addDays(WEEK_START, 4)

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      setProfile(demoProfile)

      setActivities(buildDemoActivities(PERIOD_START, TODAY))

      setWeightLogs(buildDemoWeightLogs())

      setCheckins([])

      setLoading(false)

      return
    }

    setLoading(true)

    Promise.all([
      getUserProfile(),

      getActivities(PERIOD_START, TODAY),

      getWeightLogs(PERIOD_START, TODAY),

      getWeeklyCheckins(),
    ])

      .then(([p, acts, weights, checks]) => {
        if (cancelled) return

        setProfile(p)

        setActivities(acts)

        setWeightLogs(weights)

        setCheckins(checks)

        const saved = checks.find((c) => c.week_start === WEEK_START)

        if (saved) {
          setReport(saved.report)

          setCheckinNote(saved.note ?? "")
        }
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

  // ── Activity heatmap + streak ────────────────────────────────────

  const weightKg = profile?.weight_kg ?? null

  const activityHeat = useMemo(() => {
    const map = new Map<ISODate, {
      cats: Map<ActivityType, number>

      labels: string[]

      minutes: number
    }>()

    for (const a of activities) {
      if (a.status !== "completed") continue

      if (a.date < PERIOD_START || a.date > TODAY) continue

      const cur = map.get(a.date) ?? {
        cats: new Map<ActivityType, number>(),
        labels: [] as string[],
        minutes: 0,
      }

      cur.minutes += a.duration_min

      cur.cats.set(
        a.activity_type,

        (cur.cats.get(a.activity_type) ?? 0) + a.duration_min,
      )

      cur.labels.push(activityDisplayLabel(a))

      map.set(a.date, cur)
    }

    return map
  }, [activities])

  const streak = useMemo(() => {
    let cursor = TODAY

    if (!activityHeat.has(cursor)) {
      if (!activityHeat.has(addDays(TODAY, -1))) return 0

      cursor = addDays(TODAY, -1)
    }

    let count = 0

    while (activityHeat.has(cursor)) {
      count += 1

      cursor = addDays(cursor, -1)
    }

    return count
  }, [activityHeat])

  // ── Selected day entries ────────────────────────────────────────

  const entries = entriesForDate(log, selectedDate)

  const dayTotals = totalsForDate(log, selectedDate)

  const dayActivity = activityHeat.get(selectedDate) ?? null

  // ── Weekly check-in derivations ──────────────────────────────────

  const weekPerDay = useMemo(() => {
    const days: Array<{
      date: ISODate

      calories: number

      protein_g: number

      carbs_g: number

      fat_g: number

      logged: boolean
    }> = []

    for (let i = 0; i < 7; i++) {
      const date = addDays(WEEK_START, i)

      if (date > TODAY) continue

      const t = perDay.get(date)

      days.push({
        date,

        calories: t?.calories ?? 0,

        protein_g: t?.protein_g ?? 0,

        carbs_g: t?.carbs_g ?? 0,

        fat_g: t?.fat_g ?? 0,

        logged: Boolean(t),
      })
    }

    return days
  }, [perDay])

  const weekBurn = useMemo(
    () =>
      sumCompletedBurn(
        activities.filter((a) => a.date >= WEEK_START && a.date <= TODAY),

        weightKg,
      ),

    [activities, weightKg],
  )

  const weekLoggedDays = weekPerDay.filter((d) => d.logged).length

  const weekAvgCal = weekLoggedDays
    ? Math.round(
        weekPerDay.reduce((s, d) => s + d.calories, 0) / weekLoggedDays,
      )
    : 0

  const weekAvgProtein = weekLoggedDays
    ? Math.round(
        weekPerDay.reduce((s, d) => s + d.protein_g, 0) / weekLoggedDays,
      )
    : 0

  const weightDeltaKg = useMemo(() => {
    if (weightLogs.length < 2) return null

    const beforeWeek = weightLogs.filter((w) => w.date < WEEK_START)

    const baseline = beforeWeek.length
      ? beforeWeek[beforeWeek.length - 1].weight_kg
      : null

    const latest = weightLogs[weightLogs.length - 1].weight_kg

    if (baseline == null) return null

    return Math.round((latest - baseline) * 10) / 10
  }, [weightLogs])

  const latestWeightKg = weightLogs.length
    ? weightLogs[weightLogs.length - 1].weight_kg
    : null

  async function handleAddWeight() {
    const kg = parseFloat(weightValue)

    if (!kg || kg <= 0) return

    const rounded = Math.round(kg * 10) / 10

    if (!userId) {
      const entry: WeightLogEntry = {
        id: `local-${Date.now()}`,

        user_id: "",

        date: weightDate,

        weight_kg: rounded,
      }

      setWeightLogs((prev) =>
        [...prev.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      )

      setWeightValue("")

      toast("Weight logged (preview — sign in to save)", "info")

      return
    }

    setSavingWeight(true)

    try {
      const entry = await addWeightLog(weightDate, rounded)

      setWeightLogs((prev) =>
        [...prev.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      )

      setWeightValue("")

      toast("Weight logged", "info")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not log weight",

        "error",
      )
    } finally {
      setSavingWeight(false)
    }
  }

  async function handleDeleteWeight(id: string) {
    if (!userId) {
      setWeightLogs((prev) => prev.filter((w) => w.id !== id))

      return
    }

    try {
      await deleteWeightLog(id)

      setWeightLogs((prev) => prev.filter((w) => w.id !== id))

      toast("Weigh-in removed", "info")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not remove weigh-in",

        "error",
      )
    }
  }

  async function handleAnalyse() {
    if (analyzing) return

    setAnalyzing(true)

    setAnalyseError("")

    try {
      let healthProfile: HealthProfile | null = null

      if (userId) {
        try {
          healthProfile = await getHealthProfile()
        } catch {
          healthProfile = null
        }
      }

      const healthSummary = summarizeHealthForPrompt(
        healthProfile ?? loadHealthProfile(),
      )

      const result = await analyzeWeeklyProgress({
        weekStart: WEEK_START,

        weekEnd: TODAY,

        weighIns: weightLogs,

        weightDeltaKg,

        latestWeightKg,

        perDay: weekPerDay,

        dailyCalorieTarget: target > 0 ? target : null,

        proteinTarget: profile?.protein_g_target ?? null,

        carbsTarget: profile?.carbs_g_target ?? null,

        fatTarget: profile?.fat_g_target ?? null,

        activityMin: thisWeekMinutes,

        burnLow: Math.round(weekBurn.low),

        burnHigh: Math.round(weekBurn.high),

        goal: profile?.goal ?? "maintain",

        healthSummary,
      })

      setReport(result)

      setCheckinNote("")

      if (userId) {
        const saved = await saveWeeklyCheckin({
          week_start: WEEK_START,

          weight_delta_kg: weightDeltaKg,

          avg_calories: weekLoggedDays ? weekAvgCal : null,

          avg_protein_g: weekLoggedDays ? weekAvgProtein : null,

          activity_min: thisWeekMinutes,

          rating: result.rating,

          rating_label: result.rating_label,

          note: null,

          report: result,
        })

        setCheckins((prev) => [
          saved,

          ...prev.filter((c) => c.week_start !== saved.week_start),
        ])
      }
    } catch (err) {
      setAnalyseError(
        err instanceof Error ? err.message : "Could not analyse your week.",
      )
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSaveNote() {
    if (!userId) return

    setSavingNote(true)

    try {
      await updateWeeklyCheckinNote(WEEK_START, checkinNote)

      setCheckins((prev) =>
        prev.map((c) =>
          c.week_start === WEEK_START ? { ...c, note: checkinNote } : c,
        ),
      )

      toast("Note saved", "info")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save note", "error")
    } finally {
      setSavingNote(false)
    }
  }

  const recentCheckins = checkins.filter((c) => c.week_start !== WEEK_START)

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

      {/* Weekly check-in */}
      <Card className="mb-4">
        <CardHead
          title="Weekly check-in"
          icon={<Sparkles size={16} className="text-primary" />}
          action={
            isCheckinOpen ? (
              <Button
                size="sm"
                onClick={handleAnalyse}
                loading={analyzing}
                disabled={analyzing}
              >
                {!analyzing && <Sparkles size={14} />}
                {analyzing ? "Analysing…" : "Analyse weekly progress"}
              </Button>
            ) : (
              <Badge tone="neutral">Opens Friday</Badge>
            )
          }
        />
        {!isCheckinOpen ? (
          <p className="text-sm text-muted-foreground">
            Your weekly check-in opens on Friday — a friendly review of your
            weight, food, and training for the week.
          </p>
        ) : analyzing ? (
          <p className="flex items-center gap-2.5 py-4 text-sm text-muted-foreground">
            <Sparkles size={15} className="animate-pulse text-primary" />
            Your coach is reading the week…
          </p>
        ) : report ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold leading-snug text-foreground">
                  {report.headline}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RatingDots value={report.rating} />
                  {report.rating_label && (
                    <span className="text-xs text-muted-foreground">
                      {report.rating_label}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                tone={
                  report.rating >= 4
                    ? "sage"
                    : report.rating >= 3
                      ? "blue"
                      : "warning"
                }
              >
                {report.rating} / 5
              </Badge>
            </div>

            {report.weight_note && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {report.weight_note}
              </p>
            )}

            {report.highlights.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Highlights
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {report.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.next_steps.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Next week, focus on
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {report.next_steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                htmlFor="weekly-note"
              >
                Your note
              </label>
              <div className="flex items-end gap-2">
                <input
                  id="weekly-note"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="Add a thought to remember this week…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveNote}
                  loading={savingNote}
                  disabled={!userId}
                >
                  Save
                </Button>
              </div>
              {!userId && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Sign in to save your check-in and note.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Review your weight, food, and training for the week with a quick
            check-in from your coach.
          </p>
        )}
        {analyseError && (
          <p className="mt-2 text-xs text-error">{analyseError}</p>
        )}

        {recentCheckins.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Past weeks
            </p>
            <div className="space-y-2">
              {recentCheckins.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-[112px] shrink-0 text-xs text-muted-foreground">
                    {shortDate(c.week_start)} –{" "}
                    {shortDate(addDays(c.week_start, 6))}
                  </span>
                  <RatingDots value={c.rating} />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {c.rating_label}
                  </span>
                  {c.weight_delta_kg != null && (
                    <span className="tabular text-xs text-muted-foreground">
                      {fmtKgDelta(c.weight_delta_kg)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Row 1: eating + activity summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
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
            </>
          )}
        </Card>

        <Card className="min-w-0">
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
                  {recent.map((a) => (
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
                        {a.duration_min}m
                      </span>
                      <Badge tone={a.status === "completed" ? "sage" : "blue"}>
                        {a.status === "completed" ? "Done" : "Planned"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Weight */}
      <Card className="mt-4">
        <CardHead
          title="Weight"
          icon={<Scale size={16} className="text-secondary" />}
          action={
            latestWeightKg != null ? (
              <Badge tone="neutral">
                {latestWeightKg} kg · {fmtKgDelta(weightDeltaKg)} vs before week
              </Badge>
            ) : (
              <Badge tone="neutral">No weigh-ins yet</Badge>
            )
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Log a weigh-in
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={weightDate}
                max={TODAY}
                onChange={(e) => setWeightDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Weigh-in date"
              />
              <input
                type="number"
                step="0.1"
                min="1"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                placeholder="kg"
                className="w-24 rounded-lg border border-border bg-background px-2.5 py-2 text-sm tabular focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Weight in kg"
              />
              <Button
                size="sm"
                onClick={handleAddWeight}
                loading={savingWeight}
                disabled={!weightValue.trim()}
              >
                <Plus size={14} />
                Log
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Weigh in regularly — your weekly check-in compares against the
              last weigh-in before the week.
            </p>
          </div>
          <div className="md:col-span-2">
            {weightLogs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No weigh-ins in the last 4 weeks.
              </p>
            ) : (
              <div className="space-y-1.5">
                {[...weightLogs]

                  .sort((a, b) => b.date.localeCompare(a.date))

                  .slice(0, 8)

                  .map((w) => (
                    <div key={w.id} className="flex items-center gap-3 text-sm">
                      <span className="tabular w-[72px] shrink-0 text-muted-foreground">
                        {shortDate(w.date)}
                      </span>
                      <span className="tabular text-foreground">
                        {w.weight_kg} kg
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${w.weight_kg} kg weigh-in`}
                        className="ml-auto hover:text-error"
                        onClick={() => handleDeleteWeight(w.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Row 2: calendar + day detail */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHead
            title="Activity streak"
            icon={<CalendarDays size={16} className="text-primary" />}
            action={
              streak > 0 ? <Badge tone="sage">{streak}-day streak</Badge> : null
            }
          />
          <div className="flex gap-1.5">
            <div className="mr-1 grid grid-rows-7 gap-1.5">
              {DAYS.map((day) => (
                <span
                  key={day}
                  className="flex h-7 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {day.slice(0, 3)}
                </span>
              ))}
            </div>
            {[0, 1, 2, 3].map((week) => (
              <div key={week} className="grid flex-1 grid-rows-7 gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                  const date = addDays(PERIOD_START, week * 7 + dayIdx)
                  const isFuture = date > TODAY
                  const day = perDay.get(date)
                  const heat = activityHeat.get(date)
                  const cats = heat ? orderedCategories(heat.cats) : []
                  const dominant = cats[0]
                  const Icon = dominant ? ACTIVITY_ICONS[dominant] : null
                  const eatenLevel = !day
                    ? 0
                    : eatenLevelFor(target > 0 ? day.calories / target : 0.75)
                  const isSelected = date === selectedDate
                  const title = heat
                    ? `${longDate(date)} — ${heat.labels.join(", ")} (${heat.minutes} min)`
                    : `${longDate(date)} — no activity`

                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDate(date)}
                      title={title}
                      aria-label={title}
                      style={{ background: GREEN_FILL[eatenLevel] }}
                      className={`flex h-7 w-full items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 ${
                        isSelected
                          ? "border-primary ring-2 ring-inset ring-primary/60"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {dominant && Icon ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/95 shadow-sm">
                          <Icon
                            size={11}
                            strokeWidth={2.5}
                            style={{ color: CATEGORY_COLORS[dominant] }}
                          />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
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
            {([
              "cardio",
              "strength",
              "mobility",
              "other",
            ] as ActivityType[]).map((cat) => {
              const Icon = ACTIVITY_ICONS[cat]
              return (
                <span key={cat} className="flex items-center gap-1">
                  <Icon size={12} style={{ color: CATEGORY_COLORS[cat] }} />
                  {ACTIVITY_LABELS[cat]}
                </span>
              )
            })}
            <span>Tap a day for details</span>
          </div>
        </Card>

        <Card className="min-w-0">
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
                            {food.flag_level && (
                              <div className="mt-1">
                                <FoodFlagBadge
                                  level={food.flag_level}
                                  reason={food.flag_reason}
                                  showReason
                                />
                              </div>
                            )}
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
                    <p className="mt-0.5 flex flex-wrap gap-1.5">
                      {orderedCategories(dayActivity.cats).map((cat) => {
                        const Icon = ACTIVITY_ICONS[cat]

                        return (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <Icon size={11} />
                            {ACTIVITY_LABELS[cat]}
                          </span>
                        )
                      })}
                    </p>
                    <p className="tabular mt-1 text-xs text-muted-foreground">
                      {dayActivity.labels.join(", ")} · {dayActivity.minutes}{" "}
                      min
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
