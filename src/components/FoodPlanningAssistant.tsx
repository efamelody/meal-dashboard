import { useEffect, useRef, useState } from "react"
import { SendHorizontal } from "lucide-react"
import { callGeminiJSON } from "../lib/gemini"
import { summarizeHealthForPrompt, type HealthProfile } from "../lib/health"
import type { LoggedMeal, UserProfile } from "../lib/types"
import type { DayLogTotals } from "../lib/mealLog"
import { Badge } from "./ui"

interface FoodPlanningAssistantProps {
  profile: HealthProfile
  nutritionProfile: UserProfile | null
  todayTotals: DayLogTotals
  log: Record<string, LoggedMeal>
}

export interface FoodAdvice {
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

interface ChatMessage {
  role: "user" | "assistant"
  text: string
  advice?: FoodAdvice
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

function historyForPrompt(messages: ChatMessage[]): string {
  return messages
    .slice(-6)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n")
}

function normalizeAdvice(result: Partial<FoodAdvice>): FoodAdvice {
  const verdict =
    result.verdict === "green" || result.verdict === "red"
      ? result.verdict
      : "yellow"
  const sugar = ["green", "yellow", "red", "unknown"].includes(
    result.sugar ?? "",
  )
    ? (result.sugar as FoodAdvice["sugar"])
    : "unknown"
  return {
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
  }
}

function TypingBubble() {
  return (
    <div
      className="flex gap-1.5 self-start rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3"
      aria-label="Assistant is thinking"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const advice = message.advice
  return (
    <div className="w-full max-w-full self-start rounded-2xl rounded-bl-md border border-border bg-background px-3.5 py-3">
      {advice && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={verdictTone[advice.verdict]}>
            {advice.verdict.toUpperCase()} overall fit
          </Badge>
          <Badge
            tone={
              advice.sugar === "unknown" ? "neutral" : verdictTone[advice.sugar]
            }
          >
            Sugar: {advice.sugar}
          </Badge>
        </div>
      )}
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">
        {message.text}
      </p>
      {advice && advice.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
          {advice.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {advice && (
        <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-3">
          <div className="rounded-lg bg-muted p-2.5">
            <p className="text-[11px] text-muted-foreground">Portion</p>
            <p className="mt-1 text-foreground">{advice.portion}</p>
          </div>
          <div className="rounded-lg bg-muted p-2.5">
            <p className="text-[11px] text-muted-foreground">Pair with</p>
            <p className="mt-1 text-foreground">
              {advice.pairing.join(", ") || "Protein and vegetables"}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-2.5">
            <p className="text-[11px] text-muted-foreground">Try instead</p>
            <p className="mt-1 text-foreground">
              {advice.alternatives.join(", ") || "A higher-fiber option"}
            </p>
          </div>
        </div>
      )}
      {advice?.estimated_addition && (
        <p className="mt-2.5 text-xs tabular text-muted-foreground">
          Estimated addition: {advice.estimated_addition.calories} kcal · P
          {advice.estimated_addition.protein_g} · C
          {advice.estimated_addition.carbs_g} · F
          {advice.estimated_addition.fat_g}
          {advice.estimated_addition.sugar_g != null &&
            ` · sugar ${advice.estimated_addition.sugar_g} g`}
        </p>
      )}
    </div>
  )
}

export default function FoodPlanningAssistant({
  profile,
  nutritionProfile,
  todayTotals,
  log,
}: FoodPlanningAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, error])

  async function ask(value: string) {
    const clean = value.trim().slice(0, 500)
    if (!clean || loading) return
    setDraft("")
    setError("")
    const history = messages
    setMessages([...history, { role: "user", text: clean }])
    setLoading(true)
    try {
      const result = await callGeminiJSON<Partial<FoodAdvice>>(
        `You are a careful nutrition planning assistant. Use the user's context below.
Return JSON only with exactly these keys: verdict, sugar, summary, reasons, portion, pairing, alternatives, estimated_addition.
verdict must be green, yellow, or red. sugar must be green, yellow, red, or unknown.
Use yellow when portion or preparation matters. Use unknown when sugar data is unavailable. Never invent a tracked sugar total. Be practical and concise. Mention uncertainty when the food or portion is unclear. Keep the summary to 1-3 sentences so it reads well in a chat.

USER CONTEXT:
${contextForPrompt(profile, nutritionProfile, todayTotals, log)}

EARLIER IN THIS CONVERSATION:
${history.length ? historyForPrompt(history) : "(this is the first message)"}

LATEST QUESTION:
${clean}`,
      )
      const advice = normalizeAdvice(result)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: advice.summary, advice },
      ])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not get meal advice",
      )
    } finally {
      setLoading(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex h-[min(68vh,540px)] flex-col">
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {empty && !loading && (
          <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
            Ask whether a food fits your goals today, what to eat next, or how
            to adjust a meal. Sugar shows as unknown until it is tracked by the
            food estimate.
          </div>
        )}
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div
              key={index}
              className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground"
            >
              {message.text}
            </div>
          ) : (
            <AssistantMessage key={index} message={message} />
          ),
        )}
        {loading && <TypingBubble />}
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
      {empty && (
        <div className="mt-3 flex flex-wrap gap-2">
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
      )}
      <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
        <label className="sr-only" htmlFor="food-planning-question">
          Food planning question
        </label>
        <textarea
          id="food-planning-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              void ask(draft)
            }
          }}
          maxLength={500}
          rows={2}
          placeholder="e.g. Is naan good for me today?"
          className="min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => void ask(draft)}
          disabled={!draft.trim() || loading}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        General food-planning support only. Your report scores are treated as
        dated report values, not diagnoses.
      </p>
    </div>
  )
}
