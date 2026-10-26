import { Link } from "react-router-dom"
import Brand from "../Brand"

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
]

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
        <Link to="/" aria-label="MealKit home" className="inline-flex">
          <Brand size={34} />
        </Link>

        <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/demo"
            className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/login"
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-accent px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#43583c] sm:px-4"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
