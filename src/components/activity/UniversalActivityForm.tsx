import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Button } from "../ui"
import {
  ACTIVITY_ICONS,
  ACTIVITY_SUGGESTIONS,
  DETAIL_PLACEHOLDERS,
  INTENSITIES,
  INTENSITY_LABELS,
  inferActivityCategory,
} from "../../lib/activityMeta"
import type {
  ActivityFormErrors,
  ActivityFormValue,
} from "../../lib/activityForm"

const fieldCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground"

function formatDuration(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 1) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} m`
}

export interface UniversalActivityFormProps {
  value: ActivityFormValue
  errors: ActivityFormErrors
  onChange: (patch: Partial<ActivityFormValue>) => void
  onSubmit: () => void
  saving?: boolean
  submitLabel?: string
  /** Extra block rendered between the fields and the share/save section. */
  footer?: ReactNode
}

export default function UniversalActivityForm({
  value,
  errors,
  onChange,
  onSubmit,
  saving = false,
  submitLabel = "Save activity",
  footer,
}: UniversalActivityFormProps) {
  const category = inferActivityCategory(value.name)
  const Icon = ACTIVITY_ICONS[category]
  const duration = Number(value.durationMin)
  const durationLabel = formatDuration(duration)
  const isFuture =
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    value.date > new Date().toISOString().slice(0, 10)

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      {/* ── Required: activity + duration ─────────────────────────── */}
      <div>
        <label htmlFor="act-name" className={labelCls}>
          Activity{" "}
          <span className="font-normal text-muted-foreground">(required)</span>
        </label>
        <input
          id="act-name"
          list="act-name-suggestions"
          autoComplete="off"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Swimming, evening walk, badminton"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "act-name-error" : "act-name-hint"}
          className={fieldCls}
        />
        <datalist id="act-name-suggestions">
          {ACTIVITY_SUGGESTIONS.map((s) => (
            <option key={s.name} value={s.name} />
          ))}
        </datalist>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ACTIVITY_SUGGESTIONS.map((s) => {
            const active =
              value.name.trim().toLowerCase() === s.name.toLowerCase()
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => onChange({ name: s.name })}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-primary bg-sage text-accent"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </button>
            )
          })}
          <span className="self-center text-[11px] text-muted-foreground">
            or type your own
          </span>
        </div>
        {errors.name ? (
          <p
            id="act-name-error"
            role="alert"
            className="mt-1.5 text-xs text-error"
          >
            {errors.name}
          </p>
        ) : (
          <p
            id="act-name-hint"
            className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Icon size={13} className="shrink-0 text-secondary" />
            Filed under{" "}
            {value.name.trim() ? `“${value.name.trim()}”` : "the activity list"}{" "}
            — any activity is allowed.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="act-duration" className={labelCls}>
            Duration in minutes{" "}
            <span className="font-normal text-muted-foreground">
              (required)
            </span>
          </label>
          <div className="relative">
            <input
              id="act-duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              step={1}
              value={value.durationMin}
              onChange={(e) => onChange({ durationMin: e.target.value })}
              aria-invalid={Boolean(errors.durationMin)}
              aria-describedby={
                errors.durationMin ? "act-duration-error" : "act-duration-hint"
              }
              className={`${fieldCls} tabular pr-16`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              min
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onChange({ durationMin: String(mins) })}
                className={`tabular rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  value.durationMin.trim() === String(mins)
                    ? "border-primary bg-sage text-accent"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {mins >= 60 ? formatDuration(mins) : `${mins}m`}
              </button>
            ))}
          </div>
          {errors.durationMin ? (
            <p
              id="act-duration-error"
              role="alert"
              className="mt-1.5 text-xs text-error"
            >
              {errors.durationMin}
            </p>
          ) : (
            <p
              id="act-duration-hint"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {durationLabel
                ? `About ${durationLabel}`
                : "Sessions of any length are fine"}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <div>
            <label htmlFor="act-date" className={labelCls}>
              Date
            </label>
            <input
              id="act-date"
              type="date"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              aria-invalid={Boolean(errors.date)}
              className={`${fieldCls} tabular`}
            />
            {errors.date && (
              <p role="alert" className="mt-1.5 text-xs text-error">
                {errors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="act-time" className={labelCls}>
              Start time{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              id="act-time"
              type="time"
              value={value.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className={`${fieldCls} tabular`}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isFuture
                ? "A future date is saved as a plan you can complete later."
                : value.time
                  ? `Logged with a ${value.time} start`
                  : "Leave blank if you can't remember"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Intensity ───────────────────────────────────────────────── */}
      <div>
        <span className={labelCls} id="act-intensity-label">
          Effort{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div
          role="radiogroup"
          aria-labelledby="act-intensity-label"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {INTENSITIES.map((level) => {
            const active = value.intensity === level
            return (
              <label
                key={level}
                className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-[13px] font-medium transition-colors ${
                  active
                    ? "border-primary bg-sage text-accent ring-1 ring-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="act-intensity"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ intensity: level })}
                />
                {INTENSITY_LABELS[level]}
              </label>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Optional — leaving it as “Not sure” keeps estimates honest.
        </p>
      </div>

      {/* ── Optional details ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface-sunken/60 p-4">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-muted-foreground" />
          <h3 className="text-[13px] font-semibold text-foreground">
            More details{" "}
            <span className="font-normal text-muted-foreground">
              (all optional)
            </span>
          </h3>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="act-distance" className={labelCls}>
              Distance (km)
            </label>
            <div className="relative">
              <input
                id="act-distance"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={value.distanceKm}
                onChange={(e) => onChange({ distanceKm: e.target.value })}
                placeholder="Leave blank if none"
                aria-invalid={Boolean(errors.distanceKm)}
                className={`${fieldCls} tabular pr-10`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                km
              </span>
            </div>
            {errors.distanceKm && (
              <p role="alert" className="mt-1.5 text-xs text-error">
                {errors.distanceKm}
              </p>
            )}
          </div>
          <p className="self-end pb-1 text-xs leading-relaxed text-muted-foreground">
            Only add distance if you actually covered one — yoga and strength
            sessions don't need it.
          </p>
        </div>

        <div className="mt-3">
          <label htmlFor="act-details" className={labelCls}>
            Activity details
          </label>
          <textarea
            id="act-details"
            rows={2}
            value={value.details}
            onChange={(e) => onChange({ details: e.target.value })}
            placeholder={DETAIL_PLACEHOLDERS[category]}
            className={`${fieldCls} resize-y leading-relaxed`}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Laps, elevation, exercises, sets, reps — whatever fits this
            activity.
          </p>
        </div>

        <div className="mt-3">
          <label htmlFor="act-notes" className={labelCls}>
            Notes
          </label>
          <textarea
            id="act-notes"
            rows={2}
            value={value.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="How it went, who with, conditions — anything you want to remember."
            className={`${fieldCls} resize-y leading-relaxed`}
          />
        </div>
      </div>

      {footer}

      {/* ── Privacy & sharing ───────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-border bg-card p-4">
        <legend className="px-1 text-[13px] font-semibold text-foreground">
          Privacy
        </legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.share}
            onChange={(e) => onChange({ share: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Share this activity with friends
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Off by default. Your transcript, notes, effort and any calorie
              estimate are never published — only the activity name, duration
              and date.
            </span>
          </span>
        </label>

        {value.share && (
          <div className="mt-3">
            <label htmlFor="act-share-note" className={labelCls}>
              Message{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              id="act-share-note"
              type="text"
              maxLength={320}
              value={value.shareNote}
              onChange={(e) => onChange({ shareNote: e.target.value })}
              placeholder="e.g. Morning swim before work"
              className={fieldCls}
            />
            {errors.shareNote ? (
              <p role="alert" className="mt-1.5 text-xs text-error">
                {errors.shareNote}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                You can also share later from the Community page.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <Button type="submit" size="lg" full loading={saving}>
        {submitLabel}
      </Button>
    </form>
  )
}
