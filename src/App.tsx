import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { Salad, LogOut } from "lucide-react"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { MealLogProvider } from "./context/MealLogContext"
import { ToastProvider } from "./components/Toast"
import Sidebar from "./components/Sidebar"
import BottomNav from "./components/BottomNav"
import ProfileMenu from "./components/ProfileMenu"
import AiFooter from "./components/AiFooter"
import MealLogBanner from "./components/MealLogBanner"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import MealsPage from "./pages/MealsPage"
import InventoryPage from "./pages/InventoryPage"
import PlannerPage from "./pages/PlannerPage"
import GroceryPage from "./pages/GroceryPage"
import ProfilePage from "./pages/ProfilePage"
import ProgressPage from "./pages/ProgressPage"
import ActivityLogPage from "./pages/ActivityLogPage"
import CommunityPage from "./pages/CommunityPage"
import KitchenLayout from "./pages/KitchenLayout"
import { supabase } from "./lib/supabase"

/** Keeps the query string (e.g. ?week=…) when redirecting legacy URLs. */
function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={{ pathname: to, search: location.search }} replace />
}

function BrandMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Salad size={14} />
    </span>
  )
}

function MobileTopBar() {
  const { session, openAuth } = useAuth()
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 px-4 h-14 bg-card/95 backdrop-blur border-b border-border">
      <a href="/" className="flex items-center gap-2" aria-label="MealKit home">
        <BrandMark />
        <span className="font-display text-[17px] leading-none text-foreground">
          MealKit
        </span>
      </a>
      <div className="ml-auto flex items-center gap-2">
        {session ? (
          <>
            <ProfileMenu compact />
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sign out"
              className="p-2 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut size={17} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={openAuth}
            className="text-[13px] font-medium text-primary px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}

function PreviewBanner() {
  const { openAuth } = useAuth()
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-2.5 bg-sand text-[#8a5a38] text-xs border-b border-[#ead9c4]">
      <span>Preview — you&apos;re viewing sample data.</span>
      <button
        type="button"
        onClick={openAuth}
        className="font-semibold hover:underline whitespace-nowrap"
      >
        Sign in / Create account
      </button>
    </div>
  )
}

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground"
      >
        Loading MealKit…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <div className="lg:pl-64 flex min-h-screen flex-col">
            <MobileTopBar />
            {!session && <PreviewBanner />}
            <MealLogBanner />
            <main className="flex-1 min-w-0 pb-4">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/plan" element={<PlannerPage />} />
                <Route path="/kitchen" element={<KitchenLayout />}>
                  <Route
                    index
                    element={<Navigate to="/kitchen/meals" replace />}
                  />
                  <Route path="meals" element={<MealsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="grocery" element={<GroceryPage />} />
                </Route>
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/activity" element={<ActivityLogPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Legacy routes */}
                <Route
                  path="/planner"
                  element={<RedirectWithSearch to="/plan" />}
                />
                <Route
                  path="/meals"
                  element={<RedirectWithSearch to="/kitchen/meals" />}
                />
                <Route
                  path="/inventory"
                  element={<RedirectWithSearch to="/kitchen/inventory" />}
                />
                <Route
                  path="/grocery"
                  element={<RedirectWithSearch to="/kitchen/grocery" />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <AiFooter />
            </main>
          </div>
          <BottomNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MealLogProvider>
        <AppShell />
      </MealLogProvider>
    </AuthProvider>
  )
}
