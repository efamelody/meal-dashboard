import { NavLink } from "react-router-dom"
import {
  House,
  CalendarDays,
  Refrigerator,
  Dumbbell,
  ChartLine,
  Users,
} from "lucide-react"

const links = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/plan", label: "Plan", icon: CalendarDays, end: false },
  { to: "/kitchen", label: "Kitchen", icon: Refrigerator, end: false },
  { to: "/activity", label: "Activity", icon: Dumbbell, end: false },
  { to: "/progress", label: "Progress", icon: ChartLine, end: false },
  { to: "/community", label: "Community", icon: Users, end: false },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-6">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 pt-1.5 pb-1 text-[10.5px] font-medium transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-sage" : ""
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
