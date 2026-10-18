import { NavLink, Link } from "react-router-dom"
import {
  House,
  CalendarDays,
  Refrigerator,
  ChartLine,
  Dumbbell,
  Users,
} from "lucide-react"
import ProfileMenu from "./ProfileMenu"

const links = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/plan", label: "Plan", icon: CalendarDays, end: false },
  { to: "/kitchen", label: "Kitchen", icon: Refrigerator, end: false },
  { to: "/activity", label: "Activity", icon: Dumbbell, end: false },
  { to: "/progress", label: "Progress", icon: ChartLine, end: false },
  { to: "/community", label: "Community", icon: Users, end: false },
]

export { links as NAV_LINKS }

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background">
      <div className="px-5 pt-7 pb-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 21h10" />
              <path d="M12 21a8 8 0 0 0 8-8c0-3-2-5-2-5s-1 2-3 2-3-3-3-3-2 3-5 3c0 0-2 1-2 1a8 8 0 0 0 7 10Z" />
            </svg>
          </span>
          <span>
            <span className="font-display block text-[19px] leading-none text-foreground">
              MealKit
            </span>
            <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Food &amp; Fitness
            </span>
          </span>
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 px-3 space-y-1 overflow-y-auto"
      >
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sage text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-4 border-t border-border mt-4">
        <div className="rounded-xl bg-sand px-3.5 py-3 mb-3">
          <p className="text-[11px] font-semibold text-[#8a5a38] uppercase tracking-wide">
            AI helpers
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[#96684a]">
            Ingredient ideas and nutrition estimates are optional assists — you
            always confirm what gets saved.
          </p>
        </div>
        <ProfileMenu />
      </div>
    </aside>
  )
}
