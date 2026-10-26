export function BrandMark({
  size = 36,
  className = "",
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground ${className}`}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.52)}
        height={Math.round(size * 0.52)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 21h10" />
        <path d="M12 21a8 8 0 0 0 8-8c0-3-2-5-2-5s-1 2-3 2-3-3-3-3-2 3-5 3c0 0-2 1-2 1a8 8 0 0 0 7 10Z" />
      </svg>
    </span>
  )
}

export default function Brand({
  compact = false,
  tone = "default",
  size = 36,
  subtitle = "Meal Planner",
  className = "",
}: {
  compact?: boolean
  tone?: "default" | "light"
  size?: number
  subtitle?: string
  className?: string
}) {
  const light = tone === "light"
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark
        size={size}
        className={light ? "bg-white/15 text-white ring-1 ring-white/20" : ""}
      />
      {!compact && (
        <span className="min-w-0">
          <span
            className={`font-display block text-[19px] leading-none ${
              light ? "text-white" : "text-foreground"
            }`}
          >
            MealKit
          </span>
          <span
            className={`mt-1 block text-[9px] font-medium uppercase tracking-[0.16em] ${
              light ? "text-white/60" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </span>
        </span>
      )}
    </span>
  )
}
