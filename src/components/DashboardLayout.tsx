import type { ReactNode } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { BookOpen, LogOut } from "lucide-react"
import Sidebar from "./Sidebar"
import BottomNav from "./BottomNav"
import ProfileMenu from "./ProfileMenu"
import AiFooter from "./AiFooter"
import MealLogBanner from "./MealLogBanner"
import Brand from "./Brand"
import { useAuth } from "../context/AuthContext"
import { NotificationsProvider } from "../context/NotificationsContext"
import { supabase } from "../lib/supabase"

function MobileTopBar() {
  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 px-4 h-14 bg-card/95 backdrop-blur border-b border-border">
      <Link
        to="/"
        className="flex items-center gap-2"
        aria-label="MealKit home"
      >
        <Brand size={30} subtitle="Meal Planner" />
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <NavLink
          to="/how-to"
          aria-label="How to use MealKit"
          className={({ isActive }) =>
            `p-2 rounded-lg transition-colors ${
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`
          }
        >
          <BookOpen size={17} />
        </NavLink>
        {session ? (
          <>
            <ProfileMenu compact />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="p-2 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut size={17} />
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-[13px] font-medium text-muted-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-[13px] font-medium text-primary-foreground bg-primary px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

function PreviewBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-8 py-2.5 bg-sand text-[#8a5a38] text-xs border-b border-[#ead9c4]">
      <span>Demo — you&apos;re viewing sample data.</span>
      <div className="flex items-center gap-3">
        <Link to="/" className="font-medium hover:underline whitespace-nowrap">
          Back to home
        </Link>
        <Link
          to="/login"
          className="font-semibold hover:underline whitespace-nowrap"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="font-semibold hover:underline whitespace-nowrap"
        >
          Create account
        </Link>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children?: ReactNode
}) {
  const { session } = useAuth()

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64 flex min-h-screen flex-col">
          <MobileTopBar />
          {!session && <PreviewBanner />}
          <MealLogBanner />
          <main className="flex-1 min-w-0 pb-4">
            {children ?? <Outlet />}
            <AiFooter />
          </main>
        </div>
        <BottomNav />
      </div>
    </NotificationsProvider>
  )
}
