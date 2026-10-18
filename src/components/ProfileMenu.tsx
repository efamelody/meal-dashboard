import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, LogOut, LogIn, UserRound, Settings } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

export function Avatar({
  name,
  size = 36,
  className = "",
}: {
  name: string
  size?: number
  className?: string
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase()
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sage text-accent font-semibold select-none ${className}`}
    >
      {initial}
    </span>
  )
}

export function useProfileName(): string {
  const { session } = useAuth()
  const email = session?.user.email
  if (!email) return "Guest"
  return email.split("@")[0]
}

export default function ProfileMenu({
  compact = false,
}: {
  compact?: boolean
}) {
  const { session, openAuth } = useAuth()
  const name = useProfileName()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!session) {
    return (
      <button
        type="button"
        onClick={openAuth}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 h-9 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
      >
        <LogIn size={14} />
        Sign in
      </button>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted transition-colors"
      >
        <Avatar name={name} size={compact ? 32 : 36} />
        {!compact && (
          <>
            <span className="hidden xl:block max-w-[110px] truncate text-[13px] font-medium text-foreground">
              {name}
            </span>
            <ChevronDown
              size={14}
              className={`hidden xl:block text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 animate-fade-in-up ${
            compact ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-sm font-medium text-foreground truncate">
              {name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <UserRound size={15} className="text-muted-foreground" />
            Profile &amp; goals
          </Link>
          <Link
            to="/profile?section=settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings size={15} className="text-muted-foreground" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              supabase.auth.signOut()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error hover:bg-[#faf0ee] transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
