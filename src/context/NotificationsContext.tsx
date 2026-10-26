import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "./AuthContext"
import { getIncomingRequestCount } from "../lib/db"

interface NotificationsValue {
  incomingRequests: number
  refreshNotifications: () => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

const POLL_MS = 30_000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [incomingRequests, setIncomingRequests] = useState(0)
  const refreshTimer = useRef<number | null>(null)

  const refreshNotifications = useCallback(() => {
    if (!userId) {
      setIncomingRequests(0)
      return
    }
    getIncomingRequestCount()
      .then(setIncomingRequests)
      .catch(() => setIncomingRequests(0))
  }, [userId])

  useEffect(() => {
    refreshNotifications()
    if (userId) {
      refreshTimer.current = window.setInterval(
        refreshNotifications,
        POLL_MS,
      )
    }
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current)
    }
  }, [userId, refreshNotifications])

  return (
    <NotificationsContext.Provider
      value={{ incomingRequests, refreshNotifications }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationsProvider")
  return ctx
}
