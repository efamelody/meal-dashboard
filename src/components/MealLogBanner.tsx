import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { useMealLog } from "../context/MealLogContext"

const MIGRATION_FILES: Record<string, string> = {
  "008": "008_meal_log_multi_food.sql",
  "009": "009_meal_log_ai_reasoning.sql",
}

/**
 * Warns when the meal log cannot be trusted — either the remote database is
 * missing a migration, or a write failed. Without this the log would silently
 * render empty, which looks exactly like lost data.
 */
export default function MealLogBanner() {
  const { pendingMigrations, syncError } = useMealLog()
  const [dismissed, setDismissed] = useState<string | null>(null)

  if (!pendingMigrations.length && !syncError) return null

  const message = pendingMigrations.length
    ? `Meal log needs a database update. Run ${pendingMigrations
        .map(
          (id) =>
            `migration ${id} (supabase/migrations/${MIGRATION_FILES[id] ?? id})`,
        )
        .join(
          " and ",
        )} in the Supabase SQL Editor — until then some of your meals cannot be stored.`
    : `Could not save your meal log to the cloud: ${syncError}`

  const key = pendingMigrations.length
    ? `migration:${pendingMigrations.join(",")}`
    : `error:${syncError}`
  if (dismissed === key) return null

  return (
    <div className="flex items-start gap-2.5 px-4 sm:px-8 py-2.5 bg-sand text-[#8a5a38] text-xs border-b border-[#ead9c4]">
      <AlertTriangle size={15} className="shrink-0 mt-px" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        aria-label="Dismiss warning"
        onClick={() => setDismissed(key)}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
