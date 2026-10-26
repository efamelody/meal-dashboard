import type { AppProfile } from "../lib/types"

const AVATAR_TONES = [
  "bg-sage text-secondary-foreground",
  "bg-sand text-[#8a5a38]",
  "bg-blue-soft text-[#3f5b78]",
  "bg-muted text-muted-foreground",
]

export function Avatar({
  profile,
  size = "md",
}: {
  profile: AppProfile
  size?: "sm" | "md" | "lg"
}) {
  const label = (profile.display_name.trim() || profile.handle).trim()
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
  const tone =
    AVATAR_TONES[(profile.handle.charCodeAt(0) || 0) % AVATAR_TONES.length]
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  }
  return (
    <span
      className={`flex ${sizes[size]} shrink-0 items-center justify-center rounded-full font-semibold ${tone}`}
    >
      {initials || "?"}
    </span>
  )
}
