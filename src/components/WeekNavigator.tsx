import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react"
import { addDays, startOfWeek, weekRangeLabel } from "../lib/dates"
import type { ISODate } from "../lib/types"

interface WeekNavigatorProps {
  weekStart: ISODate
  onChange: (weekStart: ISODate) => void
  onToday?: () => void
  compact?: boolean
}

export default function WeekNavigator({
  weekStart,
  onChange,
  onToday,
  compact,
}: WeekNavigatorProps) {
  const isCurrentWeek = weekStart === startOfWeek()

  const button =
    "p-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(weekStart, -7))}
        aria-label="Previous week"
        className={button}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--secondary)]">
        <CalendarRange size={14} className="text-[var(--primary)]" />
        <span
          className={`font-medium text-[var(--foreground)] ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {weekRangeLabel(weekStart)}
        </span>
      </div>
      <button
        onClick={() => onChange(addDays(weekStart, 7))}
        aria-label="Next week"
        className={button}
      >
        <ChevronRight size={16} />
      </button>
      {onToday && (
        <button
          onClick={onToday}
          disabled={isCurrentWeek}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Today
        </button>
      )}
    </div>
  )
}
