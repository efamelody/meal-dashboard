import { useState, useEffect } from "react";
import { ShoppingCart, Sparkles, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMeals, getMealPlan, updatePlanSlot, generateGroceryList } from "../lib/db";
import type { Meal, MealPlanSlot, DayOfWeek, MealType } from "../lib/types";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];
const DAY_FULL: Record<DayOfWeek, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
  Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

const TYPE_ACCENT: Record<MealType, string> = {
  Breakfast: "border-l-amber-400",
  Lunch: "border-l-sky-400",
  Dinner: "border-l-violet-400",
  Snack: "border-l-rose-400",
};

export default function PlannerPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [plan, setPlan] = useState<MealPlanSlot[]>([]);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMeals().then(setMeals);
    getMealPlan().then(setPlan);
  }, []);

  function getSlot(day: DayOfWeek, type: MealType): MealPlanSlot | undefined {
    return plan.find((s) => s.day_of_week === day && s.meal_type === type);
  }

  async function handleChange(day: DayOfWeek, type: MealType, mealId: string) {
    const id = mealId || null;
    await updatePlanSlot(day, type, id);
    setPlan(plan.map((s) =>
      s.day_of_week === day && s.meal_type === type ? { ...s, meal_id: id } : s
    ));
  }

  async function handleGenerateGrocery() {
    setGenerating(true);
    await generateGroceryList();
    setGenerating(false);
    navigate("/grocery");
  }

  const plannedCount = plan.filter((s) => s.meal_id).length;
  const totalSlots = DAYS.length * MEAL_TYPES.length;

  // Summary: total calories planned for the week
  const totalCalories = plan.reduce((sum, slot) => {
    if (!slot.meal_id) return sum;
    const meal = meals.find((m) => m.id === slot.meal_id);
    return sum + (meal?.calories || 0);
  }, 0);

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl text-[var(--foreground)]">Weekly Planner</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {plannedCount}/{totalSlots} slots filled · {totalCalories.toLocaleString()} kcal planned
            </p>
          </div>
          <button
            onClick={handleGenerateGrocery}
            disabled={generating || plannedCount === 0}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            {generating ? "Generating..." : "Generate Grocery List"}
          </button>
        </div>

        {meals.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add some meals in the Meal Library first.</p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-5">
              {MEAL_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm border-l-2 ${TYPE_ACCENT[t]} bg-[var(--muted)]`} />
                  <span className="text-xs text-[var(--muted-foreground)]">{t}</span>
                </div>
              ))}
            </div>

            {/* 7-day grid */}
            <div className="grid grid-cols-7 gap-3">
              {DAYS.map((day) => (
                <div key={day} className="flex flex-col gap-2">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">{day}</p>
                  </div>
                  {MEAL_TYPES.map((type) => {
                    const slot = getSlot(day, type);
                    const selectedMeal = slot?.meal_id ? meals.find((m) => m.id === slot.meal_id) : null;
                    const typeOptions = meals.filter((m) => m.meal_type === type);

                    return (
                      <div
                        key={type}
                        className={`bg-[var(--card)] border border-[var(--border)] border-l-2 ${TYPE_ACCENT[type]} rounded-xl p-2 min-h-[80px] flex flex-col justify-between`}
                      >
                        <p className="text-[9px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">{type}</p>
                        {selectedMeal ? (
                          <div className="flex-1">
                            <p className="text-[11px] font-medium text-[var(--foreground)] leading-tight mb-1">{selectedMeal.name}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{selectedMeal.calories} kcal</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[var(--muted-foreground)] italic flex-1">Empty</p>
                        )}
                        <select
                          value={slot?.meal_id || ""}
                          onChange={(e) => handleChange(day, type, e.target.value)}
                          className="mt-1.5 w-full px-1.5 py-1 pr-5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[10px] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                        >
                          <option value="">— none —</option>
                          {typeOptions.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Weekly summary bar */}
            {plannedCount > 0 && (
              <div className="mt-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <h3 className="text-base font-semibold mb-4">Weekly Summary</h3>
                <div className="grid grid-cols-7 gap-3">
                  {DAYS.map((day) => {
                    const daySlots = plan.filter((s) => s.day_of_week === day && s.meal_id);
                    const dayCals = daySlots.reduce((sum, slot) => {
                      const meal = meals.find((m) => m.id === slot.meal_id);
                      return sum + (meal?.calories || 0);
                    }, 0);
                    return (
                      <div key={day} className="text-center">
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{day}</p>
                        <p className="text-base font-semibold text-[var(--foreground)] mt-1">{dayCals}</p>
                        <p className="text-[9px] text-[var(--muted-foreground)]">kcal</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI hint */}
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--secondary)]">
              <Sparkles size={16} className="text-[var(--primary)] shrink-0" />
              <p className="text-xs text-[var(--primary)]">
                <strong>AI Auto-Plan</strong> — The Gemini integration shell is ready at <code className="bg-white/60 px-1 rounded text-[10px]">src/lib/ai-plan.ts</code>. Add your API key to auto-fill this entire grid based on your macro targets.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
