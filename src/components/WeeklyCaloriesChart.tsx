import type { DayCalories, DayOfWeek } from "../lib/types"

interface WeeklyCaloriesChartProps {
  week: DayCalories[]
  targetKcal: number | null
  /** Eaten (logged) kcal per day, keyed by day name ("Mon"…"Sun"). */
  loggedKcal?: Record<DayOfWeek, number>
}

export default function WeeklyCaloriesChart({
  week,
  targetKcal,
  loggedKcal,
}: WeeklyCaloriesChartProps) {
  const max = Math.max(
    ...week.map((d) => d.plannedKcal),
    ...Object.values(loggedKcal ?? {}),
    targetKcal ?? 0,
    1,
  )

  return (
    <div className="flex items-end gap-1.5 sm:gap-3 h-44">
      {week.map((day) => {
        const eaten = loggedKcal?.[day.day] ?? 0
        const pct = max ? (day.plannedKcal / max) * 100 : 0
        const eatenPct = max ? (eaten / max) * 100 : 0
        const over = targetKcal != null && day.plannedKcal > targetKcal
        const label =
          day.plannedKcal > 0
            ? day.plannedKcal
            : eaten > 0
              ? eaten
              : ""
        return (
          <div
            key={day.day}
            className="flex-1 flex flex-col items-center h-full gap-1.5"
          >
            <span className="text-[10px] text-[var(--muted-foreground)] h-3 leading-3">
              {label}
            </span>
            <div className="relative w-full flex-1 flex items-end justify-center">
              {targetKcal != null && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--muted-foreground)] opacity-40"
                  style={{ bottom: `${(targetKcal / max) * 100}%` }}
                />
              )}
              <div className="relative flex items-end justify-center gap-[2px] w-full max-w-[30px] h-full">
                {eaten > 0 && (
                  <div
                    title={`${eaten} kcal eaten`}
                    className="w-1/2 max-w-[11px] rounded-t-sm bg-[var(--terracotta)]/70 transition-all"
                    style={{
                      height: eatenPct > 0 ? `${Math.max(eatenPct, 4)}%` : "4px",
                    }}
                  />
                )}
                <div
                  title={`${day.plannedKcal} kcal planned`}
                  className={`w-1/2 max-w-[11px] rounded-t-md transition-all ${
                    day.plannedKcal === 0
                      ? "bg-[var(--muted)]"
                      : over
                        ? "bg-amber-400"
                        : "bg-[var(--primary)]"
                  }`}
                  style={{ height: pct > 0 ? `${Math.max(pct, 4)}%` : "4px" }}
                />
              </div>
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
