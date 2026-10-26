import { useEffect, useState } from "react"
import {
  Check,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShoppingBasket,
  Sparkles,
  Sun,
  Sunrise,
} from "lucide-react"
import { BrandMark } from "../Brand"
import { ProgressBar } from "../ui"

const STEPS = [
  { label: "Log a meal", caption: "Meals logged" },
  { label: "Plan the week", caption: "Week planned" },
  { label: "Shop smarter", caption: "Grocery ready" },
]

const PLAN = [
  { icon: Sunrise, type: "Breakfast", meal: "Oatmeal with banana" },
  { icon: Sun, type: "Lunch", meal: "Chicken rice" },
  { icon: Moon, type: "Dinner", meal: "Nasi lemak" },
]

const GROCERY = [
  { name: "Jasmine rice", bought: true },
  { name: "Chicken", bought: true },
  { name: "Sambal", bought: false },
  { name: "Coconut milk", bought: false },
]

const MACROS = [
  { label: "Protein", value: 78, max: 120, bar: "bg-success" },
  { label: "Carbs", value: 142, max: 220, bar: "bg-[#7a94b0]" },
  { label: "Fat", value: 38, max: 65, bar: "bg-terracotta" },
]

const WEEK = [
  { day: "M", value: 64 },
  { day: "T", value: 82 },
  { day: "W", value: 58 },
  { day: "T", value: 91 },
  { day: "F", value: 73 },
  { day: "S", value: 86 },
  { day: "S", value: 62 },
]

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)"

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches
  )
}

function MealsStep() {
  return (
    <div className="space-y-2.5">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Eaten so far</p>
          <span className="rounded-full bg-sage px-2 py-0.5 text-[9px] font-medium text-secondary-foreground">
            Maintain
          </span>
        </div>
        <p className="tabular mt-1 text-[26px] font-semibold leading-none text-foreground">
          1,240
          <span className="text-[11px] font-normal text-muted-foreground">
            {" "}
            / 2,000 kcal
          </span>
        </p>
        <ProgressBar value={1240} max={2000} className="mt-2.5 h-1.5" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {MACROS.map((macro) => (
            <div key={macro.label}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[9px] font-medium text-foreground">
                  {macro.label}
                </span>
                <span className="tabular text-[8px] text-muted-foreground">
                  {macro.value}/{macro.max}g
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${macro.bar}`}
                  style={{
                    width: `${Math.min(100, (macro.value / macro.max) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand text-[#8a5a38]">
            <Sunrise size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground">
              Breakfast
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Oatmeal with banana
            </p>
          </div>
          <p className="tabular text-[11px] font-semibold text-foreground">
            330 kcal
          </p>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-sage px-2.5 py-1.5 text-[9px] font-medium text-secondary-foreground">
          <Check size={11} strokeWidth={2.5} />
          Logged just now
        </div>
      </section>

      <p className="flex items-start gap-1.5 rounded-xl border border-dashed border-border px-2.5 py-2 text-[9px] leading-relaxed text-muted-foreground">
        <Sparkles size={11} className="mt-0.5 shrink-0 text-accent" />
        AI estimated the nutrition — you can edit it any time.
      </p>
    </div>
  )
}

function PlanStep() {
  return (
    <div className="space-y-2.5">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">This week</p>
          <span className="rounded-full bg-sage px-2 py-0.5 text-[9px] font-medium text-secondary-foreground">
            2,000 kcal target
          </span>
        </div>
        <div className="mt-4 flex h-[105px] items-end gap-1.5">
          {WEEK.map((bar, index) => (
            <div
              key={index}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className={`w-full rounded-t-md ${
                  index === 3 ? "bg-accent" : "bg-primary/30"
                }`}
                style={{ height: `${bar.value}%` }}
              />
              <span
                className={`text-[8px] ${
                  index === 3
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {bar.day}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[9px] text-muted-foreground">
          1,840 kcal average planned
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3">
        <p className="text-[10px] font-semibold text-foreground">Monday</p>
        <ul className="mt-2 space-y-1.5">
          {PLAN.map(({ icon: Icon, type, meal }) => (
            <li key={type} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon size={12} />
              </span>
              <span className="text-[9px] font-medium text-muted-foreground">
                {type}
              </span>
              <span className="truncate text-[9px] text-foreground">
                {meal}
              </span>
              <Check size={10} className="ml-auto shrink-0 text-success" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function GroceryStep() {
  return (
    <div className="space-y-2.5">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">
            Grocery list
          </p>
          <span className="text-[9px] text-muted-foreground">
            {GROCERY.length} items
          </span>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {GROCERY.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                  item.bought
                    ? "bg-primary text-primary-foreground"
                    : "border border-border"
                }`}
              >
                {item.bought && <Check size={10} strokeWidth={3} />}
              </span>
              <span
                className={`truncate text-[10px] ${
                  item.bought
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {item.name}
              </span>
              <span
                className={`ml-auto text-[8px] uppercase tracking-wide ${
                  item.bought ? "text-muted-foreground" : "text-warning"
                }`}
              >
                {item.bought ? "in stock" : "to buy"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-[#ead9c4] bg-sand px-2.5 py-2 text-[9px] leading-relaxed text-[#8a5a38]">
        <ShoppingBasket size={12} className="mt-0.5 shrink-0" />
        Items already in your kitchen were pre-checked — only 2 left to buy.
      </p>
    </div>
  )
}

export default function MealKitStory() {
  const [step, setStep] = useState(() =>
    prefersReducedMotion() ? STEPS.length - 1 : 0,
  )
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setPlaying(false)
        setStep(STEPS.length - 1)
      }
    }
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!playing) return
    if (step >= STEPS.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, STEPS.length - 1))
    }, 3400)
    return () => window.clearTimeout(timer)
  }, [playing, step])

  function togglePlay() {
    if (step >= STEPS.length - 1) {
      setStep(0)
      setPlaying(true)
      return
    }
    setPlaying((current) => !current)
  }

  const atEnd = step >= STEPS.length - 1
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
  })

  return (
    <div className="relative mx-auto w-full max-w-[350px]">
      <div
        aria-hidden="true"
        className="absolute -top-3 right-4 z-10 hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium text-foreground shadow-md shadow-black/5 sm:flex"
      >
        <Sparkles size={12} className="text-accent" />
        AI-assisted, you decide
      </div>

      <div className="rounded-[2rem] border border-[#3a4336] bg-[#2b3329] p-2 shadow-2xl shadow-[#2b3329]/25">
        <div className="overflow-hidden rounded-[1.6rem] bg-background">
          <div className="flex items-center justify-between border-b border-border bg-card px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <BrandMark size={26} />
              <div>
                <p className="text-[10px] font-semibold leading-tight text-foreground">
                  MealKit
                </p>
                <p className="text-[8px] leading-tight text-muted-foreground">
                  Today · {todayLabel}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-sage px-2 py-0.5 text-[8px] font-medium text-secondary-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              On track
            </span>
          </div>

          <div className="flex h-[400px] flex-col">
            <div
              key={step}
              className="animate-fade-in-up flex-1 overflow-hidden p-3.5"
            >
              {step === 0 && <MealsStep />}
              {step === 1 && <PlanStep />}
              {step === 2 && <GroceryStep />}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3.5 py-2.5">
              <div
                className="flex items-center gap-1.5"
                role="group"
                aria-label="Preview steps"
              >
                {STEPS.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setStep(index)
                      setPlaying(index < STEPS.length - 1)
                    }}
                    aria-label={`Show ${item.label}`}
                    aria-current={index === step}
                    className={`h-1.5 rounded-full transition-all ${
                      index === step
                        ? "w-5 bg-primary"
                        : "w-1.5 bg-border hover:bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">
                {STEPS[step].caption}
              </p>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={
                  playing
                    ? "Pause preview"
                    : atEnd
                      ? "Replay preview"
                      : "Play preview"
                }
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {playing ? (
                  <Pause size={13} />
                ) : atEnd ? (
                  <RotateCcw size={13} />
                ) : (
                  <Play size={13} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Sample data — a small look at your day with MealKit.
      </p>
    </div>
  )
}
