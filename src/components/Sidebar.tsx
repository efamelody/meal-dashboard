import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Salad,
  Package,
  CalendarDays,
  ShoppingCart,
  HeartPulse,
  Sparkles,
  LogOut,
  LogIn,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meals", label: "Meals", icon: Salad },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/planner", label: "Weekly Planner", icon: CalendarDays },
  { to: "/grocery", label: "Grocery List", icon: ShoppingCart },
  { to: "/profile", label: "Fitness Profile", icon: HeartPulse },
]

export default function Sidebar() {
  const { session, openAuth } = useAuth()
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-[var(--card)] h-screen sticky top-0">
      <div className="px-6 pt-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Salad size={16} className="text-[var(--primary-foreground)]" />
          </div>
          <div className="flex-1">
            <h1
              className="text-[15px] font-semibold leading-tight text-[var(--foreground)]"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              MealKit
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">
              Planner
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--secondary)] text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

        <div className="px-4 pb-6 space-y-2">
          <div className="rounded-xl bg-[var(--secondary)] p-4 text-[var(--primary)]">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} />
              <span className="text-xs font-semibold">AI Planner</span>
            </div>
            <p className="text-[11px] text-[var(--accent-foreground)] leading-relaxed opacity-75">
              Gemini integration ready. Connect your API key to auto-generate
              weekly plans.
            </p>
          </div>
          {session ? (
            <>
              <div className="px-3 pt-1">
                <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                  {session.user.email ?? "Signed in"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openAuth}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <LogIn size={16} />
              Sign in / Create account
            </button>
          )}
        </div>
    </aside>
  )
}
