import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Salad, LogOut } from "lucide-react"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Sidebar from "./components/Sidebar"
import BottomNav from "./components/BottomNav"
import AiFooter from "./components/AiFooter"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import MealsPage from "./pages/MealsPage"
import InventoryPage from "./pages/InventoryPage"
import PlannerPage from "./pages/PlannerPage"
import GroceryPage from "./pages/GroceryPage"
import ProfilePage from "./pages/ProfilePage"
import { supabase } from "./lib/supabase"

function AppShell() {
  const { session, loading, openAuth } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-sm text-[var(--muted-foreground)]">
        Loading…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Mobile slim header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center px-4 py-3 bg-[var(--card)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <Salad size={14} className="text-[var(--primary-foreground)]" />
            </div>
            <span
              className="text-[15px] font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              MealKit
            </span>
          </div>
          {session ? (
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sign out"
              className="ml-auto p-2 -mr-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={openAuth}
              className="ml-auto text-sm font-medium text-[var(--primary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--secondary)] transition-colors"
            >
              Sign in
            </button>
          )}
        </header>

        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto min-w-0 pb-24 lg:pb-0">
            {!session && (
              <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-2.5 bg-[var(--secondary)] text-[var(--primary)] text-xs">
                <span>Preview — you&apos;re viewing sample data.</span>
                <button
                  type="button"
                  onClick={openAuth}
                  className="font-medium hover:underline whitespace-nowrap"
                >
                  Sign in / Create account
                </button>
              </div>
            )}
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/meals" element={<MealsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/grocery" element={<GroceryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AiFooter />
          </main>
        </div>

        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
