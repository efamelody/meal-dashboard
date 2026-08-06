import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Salad, Package, CalendarDays, ShoppingCart, ArrowRight } from "lucide-react";
import { getMeals, getInventory, getMealPlan, getGroceryList } from "../lib/db";

export default function DashboardPage() {
  const [counts, setCounts] = useState({ meals: 0, inventory: 0, planned: 0, grocery: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getMeals(), getInventory(), getMealPlan(), getGroceryList()]).then(
      ([meals, inv, plan, grocery]) => {
        setCounts({
          meals: meals.length,
          inventory: inv.filter((i) => i.is_in_stock).length,
          planned: plan.filter((p) => p.meal_id).length,
          grocery: grocery.filter((g) => !g.is_bought).length,
        });
      }
    );
  }, []);

  const cards = [
    { label: "Saved Meals", value: counts.meals, sub: "in your library", icon: Salad, to: "/meals", color: "bg-emerald-50 text-emerald-700" },
    { label: "In Stock", value: counts.inventory, sub: "inventory items", icon: Package, to: "/inventory", color: "bg-sky-50 text-sky-700" },
    { label: "Slots Planned", value: counts.planned, sub: "of 21 this week", icon: CalendarDays, to: "/planner", color: "bg-violet-50 text-violet-700" },
    { label: "Left to Buy", value: counts.grocery, sub: "grocery items", icon: ShoppingCart, to: "/grocery", color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h2 className="text-4xl text-[var(--foreground)] mb-2">Good morning</h2>
          <p className="text-[var(--muted-foreground)]">Here is your weekly meal planning overview.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {cards.map(({ label, value, sub, icon: Icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={16} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <p className="text-3xl font-semibold text-[var(--foreground)] mb-1">{value}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>
            </button>
          ))}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-xl text-[var(--foreground)] mb-4">Quick Start</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Add your meals and recipes in the Meal Library", to: "/meals" },
              { step: "2", text: "Log what you already have in Kitchen Inventory", to: "/inventory" },
              { step: "3", text: "Fill the Weekly Planner and generate your grocery list", to: "/planner" },
            ].map(({ step, text, to }) => (
              <button key={step} onClick={() => navigate(to)} className="group w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors text-left">
                <span className="w-7 h-7 rounded-full bg-[var(--secondary)] text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                <span className="text-sm text-[var(--foreground)] flex-1">{text}</span>
                <ArrowRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
