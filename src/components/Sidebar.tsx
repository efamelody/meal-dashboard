import { NavLink, Link } from "react-router-dom"
import {
  House,
  CalendarDays,
  Refrigerator,
  ChartLine,
  Dumbbell,
  Users,
  BookOpen,
} from "lucide-react"
import Brand from "./Brand"
import ProfileMenu from "./ProfileMenu"
import { useAuth } from "../context/AuthContext"
import { useNotifications } from "../context/NotificationsContext"

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
  const { session } = useAuth()
  const { incomingRequests } = useNotifications()
  const navLinks = links.map((link) =>
    link.label === "Home" ? { ...link, to: session ? "/" : "/demo" } : link,
  )

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background">
      <div className="px-5 pt-7 pb-6">
        <Link to="/" className="inline-flex">
          <Brand />
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 px-3 space-y-1 overflow-y-auto"
      >
        {navLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
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
                <span className="flex-1">{label}</span>
                {label === "Community" && incomingRequests > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-semibold flex items-center justify-center">
                    {incomingRequests}
                  </span>
                )}
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
        <NavLink
          to="/how-to"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-sage text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          <BookOpen size={16} strokeWidth={1.8} />
          How to use MealKit
        </NavLink>
        <ProfileMenu />
      </div>
    </aside>
  )
}
