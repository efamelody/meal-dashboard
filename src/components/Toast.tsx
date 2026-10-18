import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type ToastVariant = "success" | "error" | "info"

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-success shrink-0" />,
  error: <AlertCircle size={16} className="text-error shrink-0" />,
  info: <Info size={16} className="text-[#5b7794] shrink-0" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId.current++
      setItems((prev) => [...prev.slice(-2), { id, message, variant }])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[70] inset-x-0 bottom-20 lg:inset-x-auto lg:right-6 lg:bottom-6 flex flex-col items-center lg:items-end gap-2 px-4 pointer-events-none"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg shadow-black/10 max-w-sm animate-fade-in-up"
          >
            {ICONS[t.variant]}
            <span className="min-w-0">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
