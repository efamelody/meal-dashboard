import { Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChartLine,
  Dumbbell,
  Flame,
  Refrigerator,
  Salad,
  ShoppingBasket,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react"
import { PageContainer, PageHeader } from "../components/PageHeader"
import { Card, CardHead } from "../components/ui"

interface Step {
  n: string
  title: string
  body: string
  icon: typeof Salad
  tone: string
  to: string
  cta: string
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Set your goal",
    body: "Add your height, weight, goal, and activity level. MealKit turns that into a daily calorie target and a protein, carb, and fat split.",
    icon: UserRound,
    tone: "bg-sage text-secondary-foreground",
    to: "/profile",
    cta: "Open profile",
  },
  {
    n: "02",
    title: "Save the meals you cook",
    body: "Add recipes to your library with name, servings, ingredients, and nutrition. AI can suggest ingredients and estimate macros — you confirm before saving.",
    icon: Salad,
    tone: "bg-sand text-[#8a5a38]",
    to: "/kitchen/meals",
    cta: "Open meals",
  },
  {
    n: "03",
    title: "Plan your week",
    body: "Drop saved meals into breakfast, lunch, dinner, and snack slots across seven days. Daily calories and grocery needs update as you plan.",
    icon: CalendarDays,
    tone: "bg-blue-soft text-[#3f5b78]",
    to: "/plan",
    cta: "Open weekly plan",
  },
  {
    n: "04",
    title: "Stock your kitchen",
    body: "Track what is in stock, running low, or out. Your inventory is checked against the grocery list so you only buy what you need.",
    icon: Refrigerator,
    tone: "bg-[#f6ecdb] text-warning",
    to: "/kitchen/inventory",
    cta: "Open inventory",
  },
  {
    n: "05",
    title: "Build the grocery list",
    body: "Generate a shopping list from the week's plan. Amounts scale with servings, and anything already in your kitchen is pre-checked.",
    icon: ShoppingBasket,
    tone: "bg-sage text-secondary-foreground",
    to: "/kitchen/grocery",
    cta: "Open groceries",
  },
  {
    n: "06",
    title: "Log what you eat",
    body: "Log meals as you go so your day reflects what you actually ate. Logged food never changes the plan — it sits alongside it.",
    icon: Flame,
    tone: "bg-[#f6e3e1] text-error",
    to: "/demo",
    cta: "Go to today",
  },
  {
    n: "07",
    title: "Log your activity",
    body: "Describe a workout in your own words or fill in the form. MealKit estimates calories burned using MET values and your weight.",
    icon: Dumbbell,
    tone: "bg-blue-soft text-[#3f5b78]",
    to: "/activity",
    cta: "Open activity",
  },
  {
    n: "08",
    title: "Watch your progress",
    body: "See intake, burn, and net balance over time. Trends are easier to spot when meals, activity, and your goal all live in one place.",
    icon: ChartLine,
    tone: "bg-[#f6ecdb] text-warning",
    to: "/progress",
    cta: "Open progress",
  },
]

const AI_POINTS = [
  "AI suggestions are optional — every ingredient and nutrition estimate is editable.",
  "You always confirm what gets saved; nothing is added to your library silently.",
  "Estimates are approximations, not medical or dietary advice.",
  "Slow or failed responses usually mean the free Gemini tier is busy — try a lighter model from the footer.",
]

export default function HowToPage() {
  return (
    <PageContainer maxWidth="max-w-4xl">
      <PageHeader
        title="How to use MealKit"
        subtitle="A quick tour — from saving a recipe to seeing your whole week come together."
        actions={
          <Link
            to="/demo"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft size={14} />
            Back to today
          </Link>
        }
      />

      <div className="mb-5 rounded-2xl border border-[#ead9c4] bg-sand p-5 text-[#8a5a38]">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={15} />
          New here? Start with steps 1–3.
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#8a5a38]/80">
          Set a goal, save a few meals, and fill your week. Everything else —
          groceries, logging, progress — builds on that. You can explore the
          demo without an account.
        </p>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => {
          const Icon = step.icon
          return (
            <li key={step.n}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.tone}`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="tabular text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Step {step.n}
                    </p>
                    <h2 className="mt-0.5 text-[15px] font-semibold leading-snug text-foreground">
                      {step.title}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                <Link
                  to={step.to}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-accent"
                >
                  {step.cta}
                  <ArrowRight size={13} />
                </Link>
              </Card>
            </li>
          )
        })}

        <li>
          <Card className="flex h-full flex-col">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-secondary-foreground">
                <Users size={18} />
              </span>
              <div className="min-w-0">
                <p className="tabular text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Step 09
                </p>
                <h2 className="mt-0.5 text-[15px] font-semibold leading-snug text-foreground">
                  Share with friends
                </h2>
              </div>
            </div>
            <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
              Post meals, recipes, and completed activity to your friends&apos;
              feed. Plan activities together from the Plans button at the top of
              Community, then track who is coming.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Link
                to="/community"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-accent"
              >
                Open community
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/plans"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                Open plans
                <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        </li>
      </ol>

      <Card className="mt-5">
        <CardHead
          title="Plan or Plans?"
          icon={<CalendarDays size={16} className="text-primary" />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm font-semibold text-foreground">
              Plan — your week of meals
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              The weekly meal planner. This stays in the main menu because it is
              part of your everyday routine.
            </p>
            <Link
              to="/plan"
              className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-accent"
            >
              Open weekly plan
              <ArrowRight size={13} />
            </Link>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm font-semibold text-foreground">
              Plans — activities with friends
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Runs, games, and gym sessions. Invite friends and track RSVPs.
              Find it from the Plans button in Community.
            </p>
            <Link
              to="/plans"
              className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-accent"
            >
              Open plans
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHead
          title="A note on AI"
          icon={<Sparkles size={16} className="text-terracotta" />}
        />
        <ul className="space-y-2">
          {AI_POINTS.map((point) => (
            <li
              key={point}
              className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {point}
            </li>
          ))}
        </ul>
      </Card>
    </PageContainer>
  )
}
