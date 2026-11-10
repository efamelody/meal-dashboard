import { useState } from "react"
import { MessageCircle, Sparkles } from "lucide-react"
import { callGeminiJSON } from "../lib/gemini"
import { summarizeHealthForPrompt, type HealthProfile } from "../lib/health"
import type { LoggedMeal, UserProfile } from "../lib/types"
import type { DayLogTotals } from "../lib/mealLog"
import { Badge, Button, Card, CardHead } from "./ui"

interface FoodPlanningAssistantProps {
  profile: HealthProfile
  nutritionProfile: UserProfile | null
  todayTotals: DayLogTotals
  log: Record<string, LoggedMeal>
}

interface FoodAdvice {
  verdict: "green" | "yellow" | "red"
  sugar: "green" | "yellow" | "red" | "unknown"
  summary: string
  reasons: string[]
  portion: string
  pairing: string[]
  alternatives: string[]
  estimated_addition?: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    sugar_g?: number
  }
}

const EXAMPLES = ["Is naan good for me today?", "What should I eat for dinner?"]

const verdictTone = {
  green: "sage",
  yellow: "warning",
  red: "error",
} as const

function contextForPrompt(
  profile: HealthProfile,
  nutritionProfile: UserProfile | null,
  totals: DayLogTotals,
  log: Record<string, LoggedMeal>,
): string {
  const sugar = Object.values(log).reduce(
    (sum, meal) =>
      sum +
      meal.foods.reduce((foodSum, food) => foodSum + (food.sugar_g ?? 0), 0),
    0,
  )
  return `${summarizeHealthForPrompt(profile)}

Today's logged intake:
- Calories: ${totals.calories}${
    nutritionProfile ? ` / ${nutritionProfile.daily_calorie_target} kcal` : ""
  }
- Protein: ${totals.protein_g}${
    nutritionProfile ? ` / ${nutritionProfile.protein_g_target} g` : ""
  }
- Carbohydrates: ${totals.carbs_g}${
    nutritionProfile ? ` / ${nutritionProfile.carbs_g_target} g` : ""
  }
- Fat: ${totals.fat_g}${
    nutritionProfile ? ` / ${nutritionProfile.fat_g_target} g` : ""
  }
- Sugar: ${
    sugar > 0
      ? `${Math.round(sugar)} g tracked`
      : "not tracked yet; do not estimate a daily sugar total"
  }

The user is asking for practical meal-planning guidance, not a diagnosis.`
}

export default function FoodPlanningAssistant({
  profile,
  nutritionProfile,
  todayTotals,
  log,
}: FoodPlanningAssistantProps) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<FoodAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function ask(value = question) {
    const clean = value.trim().slice(0, 500)
    if (!clean || loading) return
    setQuestion(clean)
    setLoading(true)
    setError("")
    try {
      const result = await callGeminiJSON<Partial<FoodAdvice>>(
        `You are a careful nutrition planning assistant. Use the user's context below.
Return JSON only with exactly these keys: verdict, sugar, summary, reasons, portion, pairing, alternatives, estimated_addition.
verdict must be green, yellow, or red. sugar must be green, yellow, red, or unknown.
Use yellow when portion or preparation matters. Use unknown when sugar data is unavailable. Never invent a tracked sugar total. Be practical and concise. Mention uncertainty when the food or portion is unclear.

USER CONTEXT:
${contextForPrompt(profile, nutritionProfile, todayTotals, log)}

QUESTION:
${clean}`,
      )
      const verdict =
        result.verdict === "green" || result.verdict === "red"
          ? result.verdict
          : "yellow"
      const sugar = ["green", "yellow", "red", "unknown"].includes(
        result.sugar ?? "",
      )
        ? result.sugar as FoodAdvice["sugar"]
        : "unknown"
      setAnswer({
        verdict,
        sugar,
        summary:
          typeof result.summary === "string"
            ? result.summary
            : "Review this food by portion and pairing.",
        reasons: Array.isArray(result.reasons)
          ? result.reasons
              .filter((v): v is string => typeof v === "string")
              .slice(0, 4)
          : [],
        portion:
          typeof result.portion === "string"
            ? result.portion
            : "Use a moderate portion.",
        pairing: Array.isArray(result.pairing)
          ? result.pairing
              .filter((v): v is string => typeof v === "string")
              .slice(0, 4)
          : [],
        alternatives: Array.isArray(result.alternatives)
          ? result.alternatives
              .filter((v): v is string => typeof v === "string")
              .slice(0, 4)
          : [],
        estimated_addition: result.estimated_addition,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get meal advice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHead
        title="Plan what to eat"
        icon={<MessageCircle size={16} className="text-primary" />}
        action={<Badge tone="blue">Uses today&apos;s context</Badge>}
      />
      <p className="mb-3 text-sm text-muted-foreground">
        Ask whether a food fits your goals today. Sugar shows as unknown until
        it is tracked by the food estimate.
      </p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => void ask(example)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="food-planning-question">
          Food planning question
        </label>
        <textarea
          id="food-planning-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Is naan good for me today?"
          className="min-h-20 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          className="self-end sm:self-start"
          loading={loading}
          onClick={() => void ask()}
        >
          {!loading && <Sparkles size={15} />}
          Ask my plan
        </Button>
      </div>
      {error && <p className="mt-3 text-xs text-error">{error}</p>}
      {answer && (
        <div className="mt-4 border-t border-border pt-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={verdictTone[answer.verdict]}>
              {answer.verdict.toUpperCase()} overall fit
            </Badge>
            <Badge
              tone={
                answer.sugar === "unknown"
                  ? "neutral"
                  : verdictTone[answer.sugar]
              }
            >
              Sugar: {answer.sugar}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {answer.summary}
          </p>
          {answer.reasons.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {answer.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Portion</p>
              <p className="mt-1 text-foreground">{answer.portion}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Pair with</p>
              <p className="mt-1 text-foreground">
                {answer.pairing.join(", ") || "Protein and vegetables"}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Try instead</p>
              <p className="mt-1 text-foreground">
                {answer.alternatives.join(", ") || "A higher-fiber option"}
              </p>
            </div>
          </div>
          {answer.estimated_addition && (
            <p className="mt-3 tabular text-xs text-muted-foreground">
              Estimated addition: {answer.estimated_addition.calories} kcal · P
              {answer.estimated_addition.protein_g} · C
              {answer.estimated_addition.carbs_g} · F
              {answer.estimated_addition.fat_g}
              {answer.estimated_addition.sugar_g != null &&
                ` · sugar ${answer.estimated_addition.sugar_g} g`}
            </p>
          )}
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        General food-planning support only. Your report scores are treated as
        dated report values, not diagnoses.
      </p>
    </Card>
  )
}
