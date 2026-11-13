import type { ReactNode } from "react"
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  EFFORT_LEVELS,
  FEELS,
  FEEL_META,
  INTENSITY_LABELS,
  WORKOUT_KINDS,
} from "../../lib/activityMeta"
import type {
  ActivityFormErrors,
  ActivityFormValue,
} from "../../lib/activityForm"
import { Button } from "../ui"

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
  /** Show the share-to-community option. Defaults to true. */
  showShare?: boolean
}

export default function UniversalActivityForm({
  value,
  errors,
  onChange,
  onSubmit,
  saving = false,
  submitLabel = "Save activity",
  footer,
  showShare = true,
}: UniversalActivityFormProps) {
  const kinds = value.category === "other" ? [] : WORKOUT_KINDS[value.category]
  const isFuture =
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    value.date > new Date().toISOString().slice(0, 10)

  function pickCategory(category: ActivityFormValue["category"]) {
    if (category === value.category) return
    onChange({ category, name: "" })
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      {/* ── Category ─────────────────────────────────────────────── */}
      <div>
        <span className={labelCls}>What kind of workout?</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIVITY_TYPES.map((category) => {
            const Icon = ACTIVITY_ICONS[category]
            const active = value.category === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => pickCategory(category)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors ${
                  active
                    ? "border-primary bg-sage text-accent ring-1 ring-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                <span className="text-[13px] font-medium">
                  {ACTIVITY_LABELS[category]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Type ─────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="act-name" className={labelCls}>
          Type{" "}
          <span className="font-normal text-muted-foreground">(required)</span>
        </label>

        {value.category === "other" ? (
          <>
            <input
              id="act-name"
              autoComplete="off"
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Rock climbing, Boxing, a game of futsal"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "act-name-error" : "act-name-hint"
              }
              className={fieldCls}
            />
            <p
              id="act-name-hint"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              Anything that doesn&apos;t fit the other buckets.
            </p>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((kind) => {
              const KindIcon = kind.icon
              const active =
                value.name.trim().toLowerCase() === kind.label.toLowerCase()
              return (
                <button
                  key={kind.label}
                  type="button"
                  onClick={() => onChange({ name: kind.label })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-sage text-accent"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KindIcon size={14} />
                  {kind.label}
                </button>
              )
            })}
          </div>
        )}

        {errors.name ? (
          <p
            id="act-name-error"
            role="alert"
            className="mt-1.5 text-xs text-error"
          >
            {errors.name}
          </p>
        ) : null}
      </div>

      {/* ── Duration + date/time ─────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="act-duration" className={labelCls}>
            How long{" "}
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
          {errors.durationMin && (
            <p
              id="act-duration-error"
              role="alert"
              className="mt-1.5 text-xs text-error"
            >
              {errors.durationMin}
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
                : "Leave blank if you can't remember"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Effort ───────────────────────────────────────────────── */}
      <div>
        <span className={labelCls} id="act-effort-label">
          Effort
        </span>
        <div
          role="radiogroup"
          aria-labelledby="act-effort-label"
          className="grid grid-cols-3 gap-2"
        >
          {EFFORT_LEVELS.map((level) => {
            const active = value.effort === level
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
                  name="act-effort"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ effort: level })}
                />
                {INTENSITY_LABELS[level]}
              </label>
            )
          })}
        </div>
      </div>

      {/* ── How you feel ─────────────────────────────────────────── */}
      <div>
        <span className={labelCls} id="act-feel-label">
          How do you feel?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div
          role="radiogroup"
          aria-labelledby="act-feel-label"
          className="grid grid-cols-5 gap-2"
        >
          {FEELS.map((feel) => {
            const meta = FEEL_META[feel]
            const active = value.feel === feel
            return (
              <label
                key={feel}
                className={`cursor-pointer rounded-xl border px-1 py-2 text-center transition-colors ${
                  active
                    ? "border-primary bg-sage ring-1 ring-primary"
                    : "border-border bg-background hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="act-feel"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ feel })}
                />
                <span aria-hidden="true" className="block text-lg leading-none">
                  {meta.emoji}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-foreground">
                  {meta.label}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* ── Description ──────────────────────────────────────────── */}
      <div>
        <label htmlFor="act-notes" className={labelCls}>
          Description{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="act-notes"
          rows={2}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="How it went, who with — anything you want to remember."
          className={`${fieldCls} resize-y leading-relaxed`}
        />
      </div>

      {footer}

      {/* ── Privacy & sharing ─────────────────────────────────────── */}
      {showShare && (
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
                Off by default. Only the activity name, duration and date are
                published.
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
      )}

      <Button type="submit" size="lg" full loading={saving}>
        {submitLabel}
      </Button>
    </form>
  )
}
