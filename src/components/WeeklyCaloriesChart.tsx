import type { DayCalories } from "../lib/types"

interface WeeklyCaloriesChartProps {
  week: DayCalories[]
  targetKcal: number | null
}

export default function WeeklyCaloriesChart({
  week,
  targetKcal,
}: WeeklyCaloriesChartProps) {
  const max = Math.max(...week.map((d) => d.plannedKcal), targetKcal ?? 0, 1)

  return (
    <div className="flex items-end gap-1.5 sm:gap-3 h-44">
      {week.map((day) => {
        const pct = max ? (day.plannedKcal / max) * 100 : 0
        const over = targetKcal != null && day.plannedKcal > targetKcal
        return (
          <div
            key={day.day}
            className="flex-1 flex flex-col items-center h-full gap-1.5"
          >
            <span className="text-[10px] text-[var(--muted-foreground)] h-3 leading-3">
              {day.plannedKcal > 0 ? day.plannedKcal : ""}
            </span>
            <div className="relative w-full flex-1 flex items-end justify-center">
              {targetKcal != null && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--muted-foreground)] opacity-40"
                  style={{ bottom: `${(targetKcal / max) * 100}%` }}
                />
              )}
              <div
                className={`w-full max-w-[26px] rounded-t-md transition-all ${
                  day.plannedKcal === 0
                    ? "bg-[var(--muted)]"
                    : over
                      ? "bg-amber-400"
                      : "bg-[var(--primary)]"
                }`}
                style={{ height: pct > 0 ? `${Math.max(pct, 4)}%` : "4px" }}
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
              {day.day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
