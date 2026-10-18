import { useState, useEffect } from "react"
import { Check, Flame, HeartPulse, Sparkles, Target } from "lucide-react"
import { getUserProfile, saveUserProfile } from "../lib/db"
import { recommendNutrition } from "../lib/gemini"
import {
  recommendationFromFormula,
  GOAL_LABELS,
  GOAL_DESCRIPTIONS,
  ACTIVITY_LABELS,
  ACTIVITY_DESCRIPTIONS,
} from "../lib/nutrition"
import type { UserProfile, Sex, Goal, ActivityLevel } from "../lib/types"
import { useAuth } from "../context/AuthContext"
import { demoProfile } from "../lib/demo"
import { useToast } from "../components/Toast"
import { PageContainer, PageHeader } from "../components/PageHeader"
import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  InlineNote,
} from "../components/ui"

const GOALS = Object.keys(GOAL_LABELS) as Goal[]
const ACTIVITIES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[]

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

const labelCls =
  "block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5"

export default function ProfilePage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [result, setResult] = useState<UserProfile | null>(null)

  const [age, setAge] = useState("")
  const [sex, setSex] = useState<Sex>("female")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [goal, setGoal] = useState<Goal>("maintain")
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate")
  const [activityMin, setActivityMin] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function applyProfile(p: UserProfile) {
    setProfile(p)
    setResult(p)
    setAge(String(p.age))
    setSex(p.sex)
    setHeightCm(String(p.height_cm))
    setWeightKg(String(p.weight_kg))
    setGoal(p.goal)
    setActivityLevel(p.activity_level)
    setActivityMin(String(p.daily_activity_min ?? 0))
  }

  useEffect(() => {
    if (!userId) {
      applyProfile(demoProfile)
      setLoading(false)
      return
    }
    getUserProfile()
      .then((p) => {
        if (!p) return
        applyProfile(p)
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      openAuth()
      return
    }
    const ageNum = parseInt(age, 10)
    const height = parseFloat(heightCm)
    const weight = parseFloat(weightKg)
    const activityMinutes = Math.min(
      300,
      Math.max(0, parseInt(activityMin, 10) || 0),
    )
    if (!ageNum || !height || !weight) {
      setError("Please enter a valid age, height, and weight.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const formula = recommendationFromFormula({
        sex,
        weight_kg: weight,
        height_cm: height,
        age: ageNum,
        goal,
        activity_level: activityLevel,
      })
      let recommendation
      try {
        recommendation = await recommendNutrition({
          age: ageNum,
          sex,
          height_cm: height,
          weight_kg: weight,
          goal,
          activity_level: activityLevel,
          formula,
        })
      } catch {
        recommendation = {
          daily_calorie_target: formula.daily_calorie_target,
          protein_g_target: formula.protein_g_target,
          carbs_g_target: formula.carbs_g_target,
          fat_g_target: formula.fat_g_target,
          reasoning: "AI unavailable — used the standard formula baseline.",
        }
      }
      const saved = await saveUserProfile({
        age: ageNum,
        sex,
        height_cm: height,
        weight_kg: weight,
        goal,
        activity_level: activityLevel,
        bmr_kcal: formula.bmr_kcal,
        tdee_kcal: formula.tdee_kcal,
        daily_calorie_target: recommendation.daily_calorie_target,
        protein_g_target: recommendation.protein_g_target,
        carbs_g_target: recommendation.carbs_g_target,
        fat_g_target: recommendation.fat_g_target,
        ai_notes: recommendation.reasoning,
        daily_activity_min: activityMinutes,
      })
      setProfile(saved)
      setResult(saved)
      toast("Profile saved — targets recalculated")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your profile.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Profile"
        subtitle="Your details power your daily calorie and activity targets."
      />

      {!userId && (
        <div className="mb-4">
          <InlineNote tone="blue">
            You&apos;re previewing with sample data — sign in to save your own
            profile.
          </InlineNote>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── Recommendation ──────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHead
            title="Daily recommendation"
            icon={<Sparkles size={16} className="text-primary" />}
            action={
              result ? (
                <Badge tone="sage">{GOAL_LABELS[result.goal]}</Badge>
              ) : null
            }
          />
          {loading ? (
            <CardSkeleton rows={3} />
          ) : result ? (
            <>
              <div className="flex items-end gap-2">
                <span className="tabular text-5xl font-semibold leading-none text-foreground">
                  {result.daily_calorie_target}
                </span>
                <span className="mb-1 text-sm text-muted-foreground">
                  kcal / day
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ACTIVITY_LABELS[result.activity_level]}
                {result.updated_at &&
                  ` · updated ${new Date(result.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Protein",
                    value: result.protein_g_target,
                  },
                  {
                    label: "Carbs",
                    value: result.carbs_g_target,
                  },
                  {
                    label: "Fat",
                    value: result.fat_g_target,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-muted px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className="tabular text-base font-semibold text-foreground">
                      {value}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        g
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="tabular flex items-center gap-1.5">
                  <Flame size={13} className="text-terracotta" />
                  BMR {result.bmr_kcal} kcal
                </span>
                <span className="tabular flex items-center gap-1.5">
                  <Target size={13} className="text-secondary" />
                  TDEE {result.tdee_kcal} kcal
                </span>
                <span className="tabular flex items-center gap-1.5">
                  <HeartPulse size={13} className="text-error" />
                  Activity goal {result.daily_activity_min} min/day
                </span>
              </div>

              {result.ai_notes && (
                <div className="mt-4">
                  <InlineNote tone="sage" icon={<Sparkles size={14} />}>
                    {result.ai_notes}
                  </InlineNote>
                </div>
              )}
            </>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              Fill in your details and save to get a calorie and macro
              recommendation.
            </p>
          )}
        </Card>

        {/* ── Form ────────────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHead
            title={profile ? "Update your profile" : "Tell us about yourself"}
            icon={<HeartPulse size={16} className="text-error" />}
          />
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="pf-age">
                  Age
                </label>
                <input
                  id="pf-age"
                  type="number"
                  min="10"
                  max="120"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 25"
                  className={`${field} tabular`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="pf-sex">
                  Sex
                </label>
                <select
                  id="pf-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className={field}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="pf-height">
                  Height (cm)
                </label>
                <input
                  id="pf-height"
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 165"
                  className={`${field} tabular`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="pf-weight">
                  Weight (kg)
                </label>
                <input
                  id="pf-weight"
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 60"
                  className={`${field} tabular`}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls} htmlFor="pf-goal">
                Goal
              </label>
              <select
                id="pf-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className={field}
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {GOAL_DESCRIPTIONS[goal]}
              </p>
            </div>

            <div className="mt-4">
              <label className={labelCls} htmlFor="pf-activity">
                Lifestyle
              </label>
              <select
                id="pf-activity"
                value={activityLevel}
                onChange={(e) =>
                  setActivityLevel(e.target.value as ActivityLevel)
                }
                className={field}
              >
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {ACTIVITY_DESCRIPTIONS[activityLevel]}
              </p>
            </div>

            <div className="mt-4">
              <label className={labelCls} htmlFor="pf-activity-min">
                Daily activity goal (minutes)
              </label>
              <input
                id="pf-activity-min"
                type="number"
                min="0"
                max="300"
                value={activityMin}
                onChange={(e) => setActivityMin(e.target.value)}
                placeholder="e.g. 30"
                className={`${field} tabular max-w-[180px]`}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Walks, workouts, sport — the Progress page tracks your week
                against this.
              </p>
            </div>

            {error && <p className="mt-4 text-xs text-error">{error}</p>}

            <div className="mt-6 flex justify-end">
              <Button type="submit" loading={saving}>
                {!saving && <Check size={15} />}
                {saving
                  ? "Calculating…"
                  : profile
                    ? "Save & Recalculate"
                    : "Save & Get My Recommendation"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  )
}
