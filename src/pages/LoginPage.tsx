import { Salad } from "lucide-react"
import AuthForm from "../components/AuthForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <Salad size={20} className="text-[var(--primary-foreground)]" />
          </div>
          <div>
            <h1
              className="text-2xl text-[var(--foreground)] leading-none"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              MealKit
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest mt-1">
              Planner
            </p>
          </div>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
