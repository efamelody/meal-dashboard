import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import MealsPage from "./pages/MealsPage";
import InventoryPage from "./pages/InventoryPage";
import PlannerPage from "./pages/PlannerPage";
import GroceryPage from "./pages/GroceryPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[var(--background)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/grocery" element={<GroceryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
