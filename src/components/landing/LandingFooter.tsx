import { Link } from "react-router-dom"
import { Sparkles } from "lucide-react"
import Brand from "../Brand"

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { to: "/demo", label: "Demo" },
  { to: "/login", label: "Sign in" },
  { to: "/signup", label: "Create account" },
]

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Brand />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Plan meals, build your grocery list, and keep your nutrition and
              activity in one calm place.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end"
          >
            {LINKS.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} MealKit — made for real kitchens.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="text-accent" />
            AI suggestions stay optional — you confirm what gets saved.
          </p>
        </div>
      </div>
    </footer>
  )
}
