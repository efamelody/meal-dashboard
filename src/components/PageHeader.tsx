import type { ReactNode } from "react"

export function PageContainer({
  children,
  maxWidth = "max-w-6xl",
  className = "",
}: {
  children: ReactNode
  maxWidth?: "max-w-3xl" | "max-w-4xl" | "max-w-5xl" | "max-w-6xl" | "max-w-7xl"
  className?: string
}) {
  return (
    <div
      className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-6 lg:mb-8">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] lg:text-[32px] leading-[1.15] text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  )
}
