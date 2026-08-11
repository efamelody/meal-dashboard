import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Salad,
  Package,
  CalendarDays,
  ShoppingCart,
  HeartPulse,
} from "lucide-react"

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/meals", label: "Meals", icon: Salad },
  { to: "/inventory", label: "Stock", icon: Package },
  { to: "/planner", label: "Plan", icon: CalendarDays },
  { to: "/grocery", label: "Groceries", icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: HeartPulse },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--card)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
