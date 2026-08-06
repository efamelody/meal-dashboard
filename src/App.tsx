import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Menu, Salad } from "lucide-react"
import Sidebar from "./components/Sidebar"
import AiFooter from "./components/AiFooter"
import DashboardPage from "./pages/DashboardPage"
import MealsPage from "./pages/MealsPage"
import InventoryPage from "./pages/InventoryPage"
import PlannerPage from "./pages/PlannerPage"
import GroceryPage from "./pages/GroceryPage"
import ProfilePage from "./pages/ProfilePage"

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border)]">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Menu size={20} />
          </button>
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
        </header>

        <div className="flex">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-y-auto min-w-0">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/meals" element={<MealsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/grocery" element={<GroceryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AiFooter />
          </main>
        </div>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-20 bg-black/40"
            aria-hidden="true"
          />
        )}
      </div>
    </BrowserRouter>
  )
}
