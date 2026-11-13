import { Flame } from "lucide-react"
import type { CalorieEstimateResult } from "../../lib/calorieEstimate"

export interface CalorieEstimateCardProps {
  result: CalorieEstimateResult | null
}

/** A single-line, always-visible rough burn hint — never a measurement. */
export default function CalorieEstimateCard({
  result,
}: CalorieEstimateCardProps) {
  if (!result || result.status !== "ok") return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Flame size={14} className="shrink-0 text-secondary" />
      <span>
        Roughly{" "}
        <span className="font-semibold text-foreground">
          {result.lowKcal}–{result.highKcal} kcal
        </span>{" "}
        burned — a broad estimate, not a measurement.
      </span>
    </div>
  )
}
