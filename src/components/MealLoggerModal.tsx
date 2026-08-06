import { useState, useEffect, useRef } from "react"
import { Camera, Sparkles, X, Check, Trash2, Loader2 } from "lucide-react"
import { estimateMealFromPhoto } from "../lib/gemini"
import type { NutritionInfo } from "../lib/gemini"
import type { LoggedMeal } from "../lib/types"

interface MealLoggerModalProps {
  open: boolean
  slotLabel: string
  onClose: () => void
  onSave: (logged: LoggedMeal) => void
}

export default function MealLoggerModal({
  open,
  slotLabel,
  onClose,
  onSave,
}: MealLoggerModalProps) {
  const [food, setFood] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NutritionInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFood("")
      setImageDataUrl(null)
      setLoading(false)
      setError(null)
      setResult(null)
    }
  }, [open])

  if (!open) return null

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result))
    reader.onerror = () => setError("Could not read the image")
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const canEstimate = Boolean(food.trim() || imageDataUrl)

  async function handleEstimate() {
    if (!canEstimate || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const info = await estimateMealFromPhoto({
        description: food,
        imageDataUrl: imageDataUrl ?? undefined,
      })
      setResult(info)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong estimating",
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!result) return
    onSave({
      food: food.trim() || "Logged meal",
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Log what I ate
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {slotLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <input
          value={food}
          onChange={(e) => setFood(e.target.value)}
          placeholder="e.g. Tomyam from restaurant"
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {imageDataUrl ? (
          <div className="relative mt-3">
            <img
              src={imageDataUrl}
              alt="Food"
              className="w-full h-40 object-cover rounded-lg border border-[var(--border)]"
            />
            <button
              type="button"
              onClick={() => setImageDataUrl(null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] text-sm hover:bg-[var(--muted)] transition-colors"
          >
            <Camera size={16} />
            Take a photo
          </button>
        )}

        <button
          type="button"
          onClick={handleEstimate}
          disabled={!canEstimate || loading}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? "Estimating..." : "Estimate calories with AI"}
        </button>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-3xl font-bold text-[var(--foreground)]">
                {result.calories}
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">
                kcal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Protein", value: `${result.protein_g}g` },
                { label: "Carbs", value: `${result.carbs_g}g` },
                { label: "Fat", value: `${result.fat_g}g` },
              ].map((m) => (
                <div
                  key={m.label}
                  className="text-center rounded-lg bg-[var(--background)] px-2 py-2"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {m.value}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Check size={16} />
              Save to log
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
