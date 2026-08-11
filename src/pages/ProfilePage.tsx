import { useState, useEffect } from "react"
import {
  HeartPulse,
  Ruler,
  Scale,
  Target,
  Flame,
  Sparkles,
  Check,
} from "lucide-react"
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

const GOALS = Object.keys(GOAL_LABELS) as Goal[]
const ACTIVITIES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[]

export default function ProfilePage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [result, setResult] = useState<UserProfile | null>(null)

  const [age, setAge] = useState("")
  const [sex, setSex] = useState<Sex>("female")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [goal, setGoal] = useState<Goal>("maintain")
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate")

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
      })
      setProfile(saved)
      setResult(saved)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your profile.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <HeartPulse size={20} />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl text-[var(--foreground)]">
              Fitness Profile
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Your details power your daily calorie recommendation.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">
            Loading your profile...
          </div>
        ) : (
          <>
            {/* Recommendation result */}
            {result && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-4">
                  <Sparkles size={13} className="text-[var(--accent)]" />
                  Your daily recommendation
                  {result.updated_at && (
                    <span className="normal-case font-normal">
                      · updated{" "}
                      {new Date(result.updated_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-end gap-2 mb-1">
                  <span className="text-5xl font-semibold text-[var(--foreground)]">
                    {result.daily_calorie_target}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)] mb-2">
                    kcal / day
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mb-5">
                  {GOAL_LABELS[result.goal]} ·{" "}
                  {ACTIVITY_LABELS[result.activity_level]}
                </p>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    {
                      label: "Protein",
                      value: result.protein_g_target,
                      unit: "g",
                    },
                    { label: "Carbs", value: result.carbs_g_target, unit: "g" },
                    { label: "Fat", value: result.fat_g_target, unit: "g" },
                  ].map(({ label, value, unit }) => (
                    <div
                      key={label}
                      className="px-3 py-2.5 rounded-xl bg-[var(--muted)]"
                    >
                      <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                        {label}
                      </p>
                      <p className="text-base font-semibold text-[var(--foreground)]">
                        {value}
                        <span className="text-xs font-normal text-[var(--muted-foreground)]">
                          {" "}
                          {unit}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted-foreground)] mb-5">
                  <span className="flex items-center gap-1.5">
                    <Flame size={13} className="text-orange-500" />
                    BMR {result.bmr_kcal} kcal
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target size={13} className="text-violet-500" />
                    TDEE {result.tdee_kcal} kcal
                  </span>
                </div>

                {result.ai_notes && (
                  <p className="text-xs text-[var(--primary)] bg-[var(--secondary)] rounded-xl px-4 py-3 leading-relaxed">
                    {result.ai_notes}
                  </p>
                )}
              </div>
            )}

            {/* Profile form */}
            <form
              onSubmit={handleSubmit}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
            >
              <h3 className="text-lg text-[var(--foreground)] mb-5">
                {profile ? "Update your profile" : "Tell us about yourself"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                    Age
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as Sex)}
                    className="w-full px-3 py-2.5 pr-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                    <Ruler size={12} /> Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 165"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                    <Scale size={12} /> Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                  Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as Goal)}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {GOALS.map((g) => (
                    <option key={g} value={g}>
                      {GOAL_LABELS[g]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
                  {GOAL_DESCRIPTIONS[goal]}
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                  Lifestyle
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) =>
                    setActivityLevel(e.target.value as ActivityLevel)
                  }
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {ACTIVITY_LABELS[a]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
                  {ACTIVITY_DESCRIPTIONS[activityLevel]}
                </p>
              </div>

              {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? (
                    <Sparkles size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  {saving
                    ? "Calculating..."
                    : profile
                      ? "Save & Recalculate"
                      : "Save & Get My Recommendation"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
