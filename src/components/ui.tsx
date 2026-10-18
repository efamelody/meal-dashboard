import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Loader2, X, Inbox, AlertCircle } from "lucide-react"

/* ── Button ─────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm"

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-accent shadow-sm shadow-primary/10",
  secondary:
    "bg-sage text-secondary-foreground hover:bg-[#dfe8d7] border border-[#dde6d6]",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-error text-white hover:brightness-95",
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-sm rounded-xl gap-2",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-9 w-9 rounded-lg",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  full?: boolean
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  full = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${
        full ? "w-full" : ""
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}

/* ── Card ───────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 lg:p-6 ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHead({
  title,
  icon,
  action,
}: {
  title: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  )
}

/* ── Badge ──────────────────────────────────────────────────────────── */

type BadgeTone = "sage" | "sand" | "blue" | "warning" | "error" | "neutral"

const BADGE_TONES: Record<BadgeTone, string> = {
  sage: "bg-sage text-secondary-foreground",
  sand: "bg-sand text-[#8a5a38]",
  blue: "bg-blue-soft text-[#3f5b78]",
  warning: "bg-[#f6ecdb] text-warning",
  error: "bg-[#f6e3e1] text-error",
  neutral: "bg-muted text-muted-foreground",
}

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/* ── ProgressBar ────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  max,
  tone = "primary",
  className = "",
}: {
  value: number
  max: number
  tone?: "primary" | "terracotta" | "blue" | "success" | "warning" | "error"
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const bar: Record<string, string> = {
    primary: "bg-primary",
    terracotta: "bg-terracotta",
    blue: "bg-[#7a94b0]",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      className={`h-2 w-full rounded-full bg-muted overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${bar[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ── Tabs ───────────────────────────────────────────────────────────── */

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: ReactNode
  count?: number
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1 border-b border-border ${className}`}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative -mb-px inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && (
              <span className="tabular text-[11px] text-muted-foreground">
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Modal / Dialog ─────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
  closeOnBackdrop = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: string
  closeOnBackdrop?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4 animate-fade-in-up"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/10`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-1">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1.5 -mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={17} />
          </button>
        </div>
        <div className="px-5 pb-5 pt-3">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ── Empty / Loading / Error states ─────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-10 px-4" : "py-16 px-6"
      }`}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-muted ${className}`}
    />
  )
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 text-sm text-muted-foreground py-6"
    >
      <Loader2 size={15} className="animate-spin" />
      {label}
    </div>
  )
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-[#ecd8d5] bg-[#faf0ee] px-5 py-6 text-center"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-error">
        <AlertCircle size={16} />
        {message}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function InlineNote({
  icon,
  children,
  tone = "sage",
}: {
  icon?: ReactNode
  children: ReactNode
  tone?: "sage" | "sand" | "blue" | "warning"
}) {
  const tones: Record<string, string> = {
    sage: "bg-sage text-secondary-foreground border-[#dde6d6]",
    sand: "bg-sand text-[#8a5a38] border-[#ead9c4]",
    blue: "bg-blue-soft text-[#3f5b78] border-[#d4e0ed]",
    warning: "bg-[#f8f1e5] text-warning border-[#eee0c9]",
  }
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function EmptyInboxIcon() {
  return <Inbox size={22} />
}
