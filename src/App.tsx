import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { MealLogProvider } from "./context/MealLogContext"
import { ToastProvider } from "./components/Toast"
import DashboardLayout from "./components/DashboardLayout"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import SignUpPage from "./pages/SignUpPage"
import HomePage from "./pages/HomePage"
import MealsPage from "./pages/MealsPage"
import InventoryPage from "./pages/InventoryPage"
import PlannerPage from "./pages/PlannerPage"
import GroceryPage from "./pages/GroceryPage"
import ProfilePage from "./pages/ProfilePage"
import ProgressPage from "./pages/ProgressPage"
import ActivityLogPage from "./pages/ActivityLogPage"
import CommunityPage from "./pages/CommunityPage"
import PlansPage from "./pages/PlansPage"
import HowToPage from "./pages/HowToPage"
import KitchenLayout from "./pages/KitchenLayout"

/** Keeps the query string (e.g. ?week=…) when redirecting legacy URLs. */
function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={{ pathname: to, search: location.search }} replace />
}

function HomeRoute() {
  const { session } = useAuth()
  if (!session) return <LandingPage />
  return (
    <DashboardLayout>
      <HomePage />
    </DashboardLayout>
  )
}

function DemoRoute() {
  const { session } = useAuth()
  if (session) return <Navigate to="/" replace />
  return (
    <DashboardLayout>
      <HomePage />
    </DashboardLayout>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/" element={<HomeRoute />} />
      <Route path="/demo" element={<DemoRoute />} />

      <Route element={<DashboardLayout />}>
        <Route path="/plan" element={<PlannerPage />} />
        <Route path="/kitchen" element={<KitchenLayout />}>
          <Route index element={<Navigate to="/kitchen/meals" replace />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="grocery" element={<GroceryPage />} />
        </Route>
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/activity" element={<ActivityLogPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/how-to" element={<HowToPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Legacy routes */}
        <Route path="/planner" element={<RedirectWithSearch to="/plan" />} />
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppShell() {
  const { loading } = useAuth()

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
        <AppRoutes />
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
