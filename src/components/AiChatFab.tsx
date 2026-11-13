import { useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { Sparkles } from "lucide-react"
import { Modal } from "./ui"
import FoodPlanningAssistant from "./FoodPlanningAssistant"
import { getHealthProfile, getUserProfile } from "../lib/db"
import {
  loadHealthProfile,
  saveHealthProfile,
  type HealthProfile,
} from "../lib/healthProfile"
import { totalsForDate } from "../lib/mealLog"
import { toISODate } from "../lib/dates"
import type { UserProfile } from "../lib/types"
import { useMealLog } from "../context/MealLogContext"

const STORAGE_KEY = "meal-kit-ai-fab-pos"
const FAB_SIZE = 56
const MARGIN = 8

interface FabPos {
  right: number
  bottom: number
}

function clampPos(pos: FabPos): FabPos {
  const maxRight = Math.max(0, window.innerWidth - FAB_SIZE - MARGIN)
  const maxBottom = Math.max(0, window.innerHeight - FAB_SIZE - MARGIN)
  return {
    right: Math.min(Math.max(pos.right, 0), maxRight),
    bottom: Math.min(Math.max(pos.bottom, 0), maxBottom),
  }
}

function loadPos(): FabPos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FabPos>
      if (
        typeof parsed.right === "number" &&
        typeof parsed.bottom === "number"
      ) {
        return clampPos({ right: parsed.right, bottom: parsed.bottom })
      }
    }
  } catch {
    // Corrupt or unavailable storage falls back to the default spot.
  }
  return {
    right: 16,
    bottom: window.innerWidth < 640 ? 84 : 24,
  }
}

interface DragState {
  px: number
  py: number
  cur: FabPos
  moved: boolean
}

export default function AiChatFab() {
  const { log } = useMealLog()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<FabPos>(loadPos)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [nutritionProfile, setNutritionProfile] = useState<UserProfile | null>(
    null,
  )

  useEffect(() => {
    const onResize = () => setPos((prev) => clampPos(prev))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadHealth() {
      try {
        const remote = await getHealthProfile()
        if (!cancelled && remote) {
          setProfile(remote)
          saveHealthProfile(remote)
          return
        }
      } catch {
        // Not signed in — fall back to the local copy.
      }
      if (!cancelled) setProfile(loadHealthProfile())
    }
    void loadHealth()
    getUserProfile()
      .then((result) => {
        if (!cancelled) setNutritionProfile(result)
      })
      .catch(() => {
        if (!cancelled) setNutritionProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const today = toISODate(new Date())
  const todayTotals = totalsForDate(log, today)

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    dragRef.current = {
      px: event.clientX,
      py: event.clientY,
      cur: pos,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = drag.px - event.clientX
    const dy = drag.py - event.clientY
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.moved = true
    if (!drag.moved) return
    const next = clampPos({
      right: drag.cur.right + dx,
      bottom: drag.cur.bottom + dy,
    })
    drag.px = event.clientX
    drag.py = event.clientY
    drag.cur = next
    setPos(next)
  }

  function onPointerEnd() {
    const drag = dragRef.current
    dragRef.current = null
    setDragging(false)
    if (!drag) return
    if (drag.moved) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drag.cur))
      } catch {
        // Position persistence is best-effort.
      }
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Ask your health assistant — drag to move, tap to open"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ right: pos.right, bottom: pos.bottom }}
        className={`fixed z-[45] flex h-14 w-14 select-none touch-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/25 transition-opacity hover:opacity-100 ${
          dragging
            ? "cursor-grabbing scale-105 opacity-100"
            : "cursor-grab opacity-90"
        }`}
      >
        <Sparkles size={24} strokeWidth={2} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Your health assistant"
        description="Chat about food, fitness, and training — answers use your health profile and today's log."
        maxWidth="max-w-lg"
      >
        {profile ? (
          <FoodPlanningAssistant
            profile={profile}
            nutritionProfile={nutritionProfile}
            todayTotals={todayTotals}
            log={log}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Loading your health context…
          </p>
        )}
      </Modal>
    </>
  )
}
