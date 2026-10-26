import type { ReactNode } from "react"
import { Calculator, Info, X } from "lucide-react"
import { Button, InlineNote } from "../ui"
import {
  REFERENCE_WEIGHT_KG,
  type CalorieEstimateResult,
} from "../../lib/calorieEstimate"

export interface CalorieEstimateCardProps {
  open: boolean
  onToggle: () => void
  result: CalorieEstimateResult | null
  /** What the user actually told us (shown as provenance). */
  provided: string[]
  /** What we inferred, with the reason (shown as provenance). */
  inferred: string[]
  weightKg: string
  onWeightChange: (value: string) => void
  profileWeightKg?: number | null
}

type DataRowProps = {
  label: string
  children: ReactNode
}

function DataRow({ label, children }: DataRowProps) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="w-[76px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">
        {children}
      </span>
    </div>
  )
}

export default function CalorieEstimateCard({
  open,
  onToggle,
  result,
  provided,
  inferred,
  weightKg,
  onWeightChange,
  profileWeightKg,
}: CalorieEstimateCardProps) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-soft text-[#3f5b78]">
            <Calculator size={15} />
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">
              Estimated calories burned
            </span>
            <span className="block text-xs text-muted-foreground">
              Optional — a broad range, never a measurement
            </span>
          </span>
        </span>
        <span className="text-[13px] font-medium text-primary">Show</span>
      </button>
    )
  }

  const insufficient = result?.status === "insufficient"
  const weightNote = weightKg.trim()
    ? `Uses the ${Math.round(Number(weightKg))} kg you entered`
    : `Using a ${REFERENCE_WEIGHT_KG} kg reference until you add yours`

  return (
    <section
      aria-label="Estimated calories burned"
      className={`rounded-2xl border p-4 ${
        insufficient
          ? "border-[#eee0c9] bg-[#f8f1e5]"
          : "border-[#d4e0ed] bg-blue-soft/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">
            Estimated energy expenditure
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Approximate estimate · Not a measurement
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Hide calorie estimate"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>

      {insufficient && result?.status === "insufficient" ? (
        <div className="mt-3">
          <InlineNote tone="warning" icon={<Info size={14} />}>
            <span className="font-medium">Not enough detail yet. </span>
            {result.question}
          </InlineNote>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Saving the activity works fine without an estimate — this stays
            optional.
          </p>
        </div>
      ) : result?.status === "ok" ? (
        <>
          <p className="tabular mt-3 text-3xl font-semibold leading-tight text-foreground">
            {result.lowKcal}–{result.highKcal}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              kcal
            </span>
          </p>

          <p className="mt-3 text-xs leading-relaxed text-foreground/90">
            “This is a broad estimate based on the activity and duration
            provided. Actual energy expenditure varies by individual and
            exercise intensity.”
          </p>

          <div className="mt-3 divide-y divide-black/5 rounded-xl bg-card/70 px-3 py-1.5">
            <DataRow label="You said">
              {provided.length ? provided.join(" · ") : "Nothing yet"}
            </DataRow>
            <DataRow label="Basis">
              {inferred.length ? (
                inferred.join(" · ")
              ) : (
                <span className="text-muted-foreground">
                  Nothing was guessed
                </span>
              )}
            </DataRow>
            <DataRow label="Calculated">
              MET method: {result.lowKcal}–{result.highKcal} kcal from{" "}
              {result.metLow}–{result.metHigh} MET × {result.weightKg} kg ×{" "}
              {result.intensityUsed === "unknown"
                ? "the full effort range"
                : `${result.intensityUsed} effort`}
            </DataRow>
          </div>

          <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            {result.assumptions.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span aria-hidden="true">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-black/5 pt-3">
            <div>
              <label
                htmlFor="act-weight"
                className="mb-1 block text-[11px] font-medium text-foreground"
              >
                Body weight (kg) — optional
              </label>
              <input
                id="act-weight"
                type="number"
                inputMode="decimal"
                min={20}
                max={400}
                step="0.1"
                value={weightKg}
                onChange={(e) => onWeightChange(e.target.value)}
                placeholder={String(REFERENCE_WEIGHT_KG)}
                className="tabular w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {profileWeightKg ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onWeightChange(String(profileWeightKg))}
                disabled={weightKg.trim() === String(profileWeightKg)}
              >
                Use saved ({profileWeightKg} kg)
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {weightNote}. Weight is only used for this calculation on this
            screen — it is optional and never required to log exercise.
          </p>
        </>
      ) : null}
    </section>
  )
}
