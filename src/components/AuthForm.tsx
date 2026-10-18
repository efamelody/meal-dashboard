import { useEffect, useState } from "react"
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import { supabase } from "../lib/supabase"

const COOLDOWN_SECONDS = 60

function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    if ((err as { status?: unknown }).status === 429) return true
  }
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return message.includes("rate limit") || message.includes("too many requests")
}

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get("error_description") || params.get("error")
    if (oauthError) {
      setError(
        `Google sign-in failed: ${oauthError}. Try again, or use email instead.`,
      )
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  function switchMode(next: "signin" | "signup") {
    setMode(next)
    setError("")
    setNotice("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cooldown > 0 || loading) return
    setError("")
    setNotice("")
    setLoading(true)
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (!data.session) {
          setNotice("Check your inbox to confirm your email, then sign in.")
          switchMode("signin")
        }
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        setCooldown(COOLDOWN_SECONDS)
        setError("Too many attempts. Please wait a moment before trying again.")
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again.",
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (oauthLoading) return
    setError("")
    setNotice("")
    setOauthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(false)
    }
  }

  const inputClass =
    "w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl text-[var(--foreground)] mb-1">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h2>
      <p className="text-xs text-[var(--muted-foreground)] mb-6">
        {mode === "signin"
          ? "Sign in to access your meals, planner, and groceries."
          : "Sign up to start your own meal dashboard."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
            Email
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <input
              type="password"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signin" ? "Your password" : "At least 6 characters"
              }
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 leading-relaxed">{error}</p>
        )}
        {notice && (
          <p className="text-xs text-[var(--primary)] bg-[var(--secondary)] rounded-lg px-3 py-2 leading-relaxed">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ArrowRight size={15} />
          )}
          {cooldown > 0
            ? `Try again in ${cooldown}s`
            : loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)]">or</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={oauthLoading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
      >
        {oauthLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29a7.15 7.15 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center">
        <p className="text-xs text-[var(--muted-foreground)]">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  )
}
