import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Check, Sparkles } from "lucide-react"
import Brand from "./Brand"

const POINTS = [
  "A week of meals, planned in minutes",
  "A grocery list that builds itself",
  "Nutrition and activity in one calm view",
]

export default function AuthPageLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-accent p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-black/10"
        />

        <Brand tone="light" size={40} className="relative z-10" />

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Meal planning, minus the mental load
          </p>
          <p className="mt-4 font-display text-[2.6rem] leading-[1.08] text-white xl:text-[3rem]">
            A calmer way to plan your week.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            MealKit turns the meals you already love into a plan, a grocery
            list, and nutrition targets that fit your life.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-sm text-white/90"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check size={12} strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          AI suggestions are optional — you always confirm what gets saved.
        </p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:min-h-0 lg:justify-center lg:py-12">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col lg:flex-none">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              Back to home
            </Link>
            <Link
              to="/demo"
              className="text-xs font-medium text-primary hover:underline"
            >
              Try the demo
            </Link>
          </div>

          <div className="my-auto py-10 lg:my-0 lg:py-8">
            <div className="mb-7 flex justify-center lg:hidden">
              <Brand />
            </div>
            <h1 className="sr-only">{title}</h1>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
