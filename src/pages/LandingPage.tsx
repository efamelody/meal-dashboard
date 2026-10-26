import { Link } from "react-router-dom"
import {
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Refrigerator,
  Salad,
  ShoppingBasket,
  Sparkles,
  Users,
} from "lucide-react"
import LandingFooter from "../components/landing/LandingFooter"
import LandingHeader from "../components/landing/LandingHeader"
import MealKitStory from "../components/landing/MealKitStory"

const HERO_POINTS = [
  "Plan a full week of meals in minutes",
  "Your grocery list builds itself from the plan",
  "Calories, macros, and activity in one place",
]

const FEATURES = [
  {
    icon: Salad,
    title: "Meal library",
    body: "Save the meals you actually cook. AI can suggest ingredients and estimate calories, protein, carbs, and fat.",
    tone: "bg-sage text-secondary-foreground",
  },
  {
    icon: CalendarDays,
    title: "Weekly planner",
    body: "Map breakfast, lunch, dinner, and snacks across seven days. Daily calorie totals update as you plan.",
    tone: "bg-blue-soft text-[#3f5b78]",
  },
  {
    icon: ShoppingBasket,
    title: "Smart grocery list",
    body: "Generate a per-week shopping list from your plan. Items already in your kitchen are pre-checked.",
    tone: "bg-sand text-[#8a5a38]",
  },
  {
    icon: Refrigerator,
    title: "Kitchen inventory",
    body: "See what is in stock, what is running low, and what is out before you head to the shop.",
    tone: "bg-[#f6ecdb] text-warning",
  },
  {
    icon: Flame,
    title: "Nutrition & goals",
    body: "Set your goal and get a daily calorie target with a protein, carb, and fat split that fits it.",
    tone: "bg-sage text-secondary-foreground",
  },
  {
    icon: Dumbbell,
    title: "Activity & progress",
    body: "Log movement, estimate calories burned, and see how your intake and activity balance out over time.",
    tone: "bg-blue-soft text-[#3f5b78]",
  },
]

const STEPS = [
  {
    n: "01",
    icon: Salad,
    title: "Save your meals",
    body: "Add the recipes you already make. AI can fill in the ingredients and estimate nutrition for you.",
  },
  {
    n: "02",
    icon: CalendarDays,
    title: "Plan the week",
    body: "Drop meals into the seven-day grid. Your daily calories, macros, and grocery needs update with it.",
  },
  {
    n: "03",
    icon: ShoppingBasket,
    title: "Shop and track",
    body: "Take the auto-built list shopping, then log what you eat and how you move to keep the full picture.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-sage/70 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-sand/60 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-6 lg:py-20">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                <Sparkles size={12} />
                Meal planning, minus the mental load
              </p>

              <h1 className="mt-5 font-display text-[2.75rem] leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
                Eat smarter.
                <br />
                Shop smarter.
                <br />
                <span className="text-accent">Know your numbers.</span>
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                MealKit turns the meals you already love into a week of plans, a
                ready-to-shop grocery list, and a calorie target built around
                your goals.
              </p>

              <ul className="mt-6 space-y-2.5">
                {HERO_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-[13px] text-foreground"
                  >
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sage text-secondary-foreground">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#43583c]"
                >
                  Get started free
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  Try the live demo
                </Link>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Free to start · Email or Google sign-in
              </p>
            </div>

            <div className="relative lg:justify-self-end">
              <MealKitStory />
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-20 border-y border-border bg-card/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                Everything in one kitchen
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-foreground lg:text-4xl">
                The whole week, handled.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                No more juggling a notes app, a calculator, and a half-finished
                shopping list. MealKit keeps the plan, the prep, and the numbers
                together.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body, tone }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/35"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon size={17} />
                  </span>
                  <h3 className="mt-3.5 text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
              <Users size={14} className="mt-0.5 shrink-0 text-terracotta" />
              And when you want company, share plates and progress in the
              community feed.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                A simple rhythm
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-foreground lg:text-4xl">
                From saved recipe to done-for-you week.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                MealKit is designed to take a few minutes, not a whole evening.
              </p>
            </div>

            <div className="relative mt-10 grid gap-3 sm:grid-cols-3">
              <div
                aria-hidden="true"
                className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-border sm:block"
              />
              {STEPS.map(({ n, icon: Icon, title, body }) => (
                <div
                  key={n}
                  className="relative rounded-2xl border border-border bg-card p-5 text-center"
                >
                  <span className="relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white ring-4 ring-background">
                    {n}
                  </span>
                  <Icon size={17} className="mx-auto mt-3 text-accent" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#43583c]"
              >
                Start your first week
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 lg:px-6 lg:pb-20">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-accent px-6 py-10 text-center text-white sm:px-10 lg:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-black/10"
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                Your next week can be easier
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight !text-white lg:text-4xl">
                Stop planning dinner in your head.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                Save your meals once. Let MealKit handle the plan, the list, and
                the numbers.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-white/90 sm:w-auto"
                >
                  Create your free account
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Explore the demo
                </Link>
              </div>
              <p className="mt-3 text-[11px] text-white/50">
                No card required. Your data stays yours.
              </p>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
