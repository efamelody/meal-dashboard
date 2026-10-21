import { useEffect, useRef, useState } from "react"
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { estimateMealFromPhoto } from "../lib/gemini"
import type { MealEstimate, MealEstimateItem } from "../lib/gemini"
import { newFoodId } from "../lib/mealLog"
import type { LoggedFoodItem } from "../lib/types"
import { Button, Modal } from "./ui"

interface MealLoggerModalProps {
  open: boolean
  slotLabel: string
  /** Foods already logged in this slot — the modal edits them in place. */
  existing?: LoggedFoodItem[]
  /** Open the composer straight away, ready for another food. */
  startComposing?: boolean
  onClose: () => void
  onSave: (foods: LoggedFoodItem[]) => void
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

const CONFIDENCE_TONE: Record<MealEstimateItem["confidence"], string> = {
  high: "text-secondary",
  medium: "text-muted-foreground",
  low: "text-terracotta",
}

export default function MealLoggerModal({
  open,
  slotLabel,
  existing,
  startComposing = false,
  onClose,
  onSave,
}: MealLoggerModalProps) {
  const [items, setItems] = useState<LoggedFoodItem[]>([])
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [kcal, setKcal] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** What the AI made of the photo, with the reasoning behind every item. */
  const [estimate, setEstimate] = useState<MealEstimate | null>(null)
  /** Indexes of the AI items the user wants to add to the meal. */
  const [picked, setPicked] = useState<number[]>([])
  /** Index of the AI item the composer currently holds. */
  const [linked, setLinked] = useState<number | null>(null)
  const [correction, setCorrection] = useState("")
  const [showCorrection, setShowCorrection] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Read the latest `existing` without making the reset effect depend on it —
  // callers may hand over a fresh array on every render.
  const existingRef = useRef(existing)
  existingRef.current = existing

  useEffect(() => {
    if (!open) return
    setItems(existingRef.current ?? [])
    setComposing(startComposing)
    setEditingId(null)
    setName("")
    setKcal("")
    setProtein("")
    setCarbs("")
    setFat("")
    setImageDataUrl(null)
    setLoading(false)
    setError(null)
    setEstimate(null)
    setPicked([])
    setLinked(null)
    setCorrection("")
    setShowCorrection(false)
  }, [open, startComposing])

  if (!open) return null

  function resetComposer() {
    setEditingId(null)
    setName("")
    setKcal("")
    setProtein("")
    setCarbs("")
    setFat("")
    setImageDataUrl(null)
    setError(null)
    setEstimate(null)
    setPicked([])
    setLinked(null)
    setCorrection("")
    setShowCorrection(false)
  }

  function openComposer() {
    resetComposer()
    setComposing(true)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("That image is too large — pick one under 15 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result))
    reader.onerror = () => setError("Could not read the image")
    reader.readAsDataURL(file)
  }

  async function handleEstimate(note?: string) {
    if (loading) return
    if (!name.trim() && !imageDataUrl) {
      setError("Describe the food or add a photo first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await estimateMealFromPhoto({
        description: name,
        imageDataUrl: imageDataUrl ?? undefined,
        correction: note?.trim() || undefined,
      })
      if (!result.items.length) {
        setError(
          "The AI could not make out this food. Try a clearer photo or a description.",
        )
        return
      }
      setEstimate(result)
      setPicked(result.items.map((_, index) => index))
      const first = result.items[0]
      setLinked(0)
      setKcal(String(first.calories))
      setProtein(String(first.protein_g))
      setCarbs(String(first.carbs_g))
      setFat(String(first.fat_g))
      // The AI names the food, so a photo-only log still gets a real label.
      if (!name.trim()) setName(first.name)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong estimating",
      )
    } finally {
      setLoading(false)
    }
  }

  function togglePicked(index: number) {
    setPicked((prev) =>
      prev.includes(index)
        ? prev.filter((value) => value !== index)
        : [...prev, index],
    )
  }

  function loadItemIntoComposer(index: number) {
    const item = estimate?.items[index]
    if (!item) return
    setLinked(index)
    setName(item.name)
    setKcal(String(item.calories))
    setProtein(String(item.protein_g))
    setCarbs(String(item.carbs_g))
    setFat(String(item.fat_g))
    setPicked((prev) => prev.filter((value) => value !== index))
    setError(null)
  }

  function toFood(item: MealEstimateItem): LoggedFoodItem {
    const note = correction.trim()
    return {
      id: newFoodId(),
      food: item.name,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      ai_dish: item.name,
      ai_portion: item.portion || null,
      ai_justification: item.justification || null,
      ai_confidence: item.confidence,
      user_correction: note || null,
      source: note ? "corrected" : "ai",
    }
  }

  /**
   * Adds foods the AI found to the meal. The composer keeps whatever the user
   * is working on, unless it was holding one of the added items.
   */
  function addEstimateItems(indexes: number[]) {
    if (!estimate) return
    const added = indexes
      .map((index) => {
        const item = estimate.items[index]
        if (!item) return null
        if (index === linked) {
          // The composer holds this item, edits included — keep them.
          const composed = composerFood(newFoodId())
          if (composed) return composed
        }
        return toFood(item)
      })
      .filter((food): food is LoggedFoodItem => food !== null)
    if (!added.length) return
    setItems((prev) => [...prev, ...added])
    setPicked((prev) => prev.filter((value) => !indexes.includes(value)))
    if (linked !== null && indexes.includes(linked)) {
      setLinked(null)
      setName("")
      setKcal("")
      setProtein("")
      setCarbs("")
      setFat("")
    }
  }

  /**
   * The food the composer holds right now, or null when it is not ready yet.
   * `id` is passed in so the same food can be edited in place or added fresh.
   */
  function composerFood(id: string): LoggedFoodItem | null {
    const linkedItem =
      linked !== null ? (estimate?.items[linked] ?? null) : null
    const label = name.trim() || linkedItem?.name.trim() || ""
    if (!label) return null
    const calories = Number(kcal)
    if (!Number.isFinite(calories) || calories < 0) return null
    const note = correction.trim()
    const changed =
      !linkedItem ||
      toNumber(kcal) !== linkedItem.calories ||
      toNumber(protein) !== linkedItem.protein_g ||
      toNumber(carbs) !== linkedItem.carbs_g ||
      toNumber(fat) !== linkedItem.fat_g
    return {
      id,
      food: label,
      calories: Math.round(calories),
      protein_g: toNumber(protein),
      carbs_g: toNumber(carbs),
      fat_g: toNumber(fat),
      ai_dish: linkedItem?.name ?? null,
      ai_portion: linkedItem?.portion || null,
      ai_justification: linkedItem?.justification || null,
      ai_confidence: linkedItem?.confidence ?? null,
      user_correction: note || null,
      source: linkedItem ? (changed || note ? "corrected" : "ai") : "manual",
    }
  }

  function handleAddItem() {
    const linkedItem =
      linked !== null ? (estimate?.items[linked] ?? null) : null
    const label = name.trim() || linkedItem?.name.trim() || ""
    if (!label) {
      setError("Give the food a name")
      return
    }
    if (!Number.isFinite(Number(kcal)) || Number(kcal) < 0) {
      setError("Enter the calories for this food")
      return
    }
    const item = composerFood(editingId ?? newFoodId())
    if (!item) return
    setItems((prev) =>
      editingId
        ? prev.map((food) => (food.id === editingId ? item : food))
        : [...prev, item],
    )
    resetComposer()
    setComposing(false)
  }

  function startEdit(food: LoggedFoodItem) {
    setEditingId(food.id)
    setName(food.food)
    setKcal(String(food.calories))
    setProtein(String(food.protein_g))
    setCarbs(String(food.carbs_g))
    setFat(String(food.fat_g))
    setImageDataUrl(null)
    setError(null)
    setComposing(true)
    setCorrection(food.user_correction ?? "")
    setShowCorrection(Boolean(food.user_correction))
    setPicked([])
    if (food.ai_justification) {
      // Re-open the reasoning the AI gave for this food last time.
      setEstimate({
        summary: "",
        items: [
          {
            name: food.ai_dish ?? food.food,
            portion: food.ai_portion ?? "",
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            justification: food.ai_justification,
            confidence: food.ai_confidence ?? "medium",
          },
        ],
      })
      setLinked(0)
    } else {
      setEstimate(null)
      setLinked(null)
    }
  }

  function handleSave() {
    if (!items.length) return
    onSave(items)
    onClose()
  }

  const totalCalories = items.reduce((sum, food) => sum + food.calories, 0)
  const linkedItem = linked !== null ? (estimate?.items[linked] ?? null) : null
  const isEditing = Boolean(editingId)
  const aiName =
    linkedItem && linkedItem.name.trim() !== name.trim()
      ? linkedItem.name
      : null
  const numbersChanged = Boolean(
    linkedItem &&
      (toNumber(kcal) !== linkedItem.calories ||
        toNumber(protein) !== linkedItem.protein_g ||
        toNumber(carbs) !== linkedItem.carbs_g ||
        toNumber(fat) !== linkedItem.fat_g),
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log what I ate"
      description={slotLabel}
      maxWidth="max-w-lg"
    >
      {/* ── Foods already in this meal ──────────────────────────── */}
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {items.length
              ? `${items.length} food${items.length === 1 ? "" : "s"}`
              : "No food yet"}
          </p>
          {!composing && (
            <button
              type="button"
              onClick={openComposer}
              title="Add food"
              aria-label="Add food"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        {items.length > 0 && (
          <ul className="mt-1.5 space-y-2">
            {items.map((food) => (
              <li
                key={food.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {food.food}
                  </p>
                  <p className="tabular text-xs text-muted-foreground">
                    {food.calories} kcal · P{food.protein_g} C{food.carbs_g} F
                    {food.fat_g}
                  </p>
                </div>
                <button
                  type="button"
                  title="Edit"
                  aria-label={`Edit ${food.food}`}
                  onClick={() => startEdit(food)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${food.food}`}
                  onClick={() =>
                    setItems((prev) =>
                      prev.filter((item) => item.id !== food.id),
                    )
                  }
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-error"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Composer ─────────────────────────────────────────────── */}
      {composing && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isEditing ? "Update food" : "Add food"}
            </p>
            <button
              type="button"
              onClick={() => {
                resetComposer()
                setComposing(false)
              }}
              aria-label="Close food editor"
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bihun singapore"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {aiName && (
            <button
              type="button"
              onClick={() => setName(aiName)}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Sparkles size={11} />
              AI says “{aiName}”
            </button>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          {imageDataUrl ? (
            <div className="relative mt-2">
              <img
                src={imageDataUrl}
                alt="Food"
                className="h-32 w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setImageDataUrl(null)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Camera size={15} />
                Take a photo
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ImagePlus size={15} />
                Upload picture
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleEstimate()}
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {loading ? "Estimating..." : "Estimate calories with AI"}
          </button>

          {/* ── What the AI made of the photo ─────────────────────── */}
          {estimate && estimate.items.length > 0 && (
            <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
              {estimate.summary && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {estimate.summary}
                </p>
              )}

              <ul className="mt-2 space-y-1.5">
                {estimate.items.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="rounded-lg border border-border bg-background p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      {!isEditing && (
                        <input
                          type="checkbox"
                          checked={picked.includes(index)}
                          onChange={() => togglePicked(index)}
                          aria-label={`Add ${item.name} to meal`}
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--primary)]"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <span className="tabular shrink-0 text-xs font-semibold text-foreground">
                            {item.calories} kcal
                          </span>
                        </div>
                        <p className="tabular text-[11px] text-muted-foreground">
                          P{item.protein_g} · C{item.carbs_g} · F{item.fat_g}
                          {item.portion ? ` · ${item.portion}` : ""}
                          <span
                            className={`ml-1 uppercase tracking-wide ${CONFIDENCE_TONE[item.confidence]}`}
                          >
                            {item.confidence}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {item.justification}
                        </p>
                      </div>
                      {!isEditing && (
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            onClick={() => loadItemIntoComposer(index)}
                            title="Edit"
                            aria-label={`Edit ${item.name}`}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addEstimateItems([index])}
                            title="Add to meal"
                            aria-label={`Add ${item.name} to meal`}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {!isEditing && picked.length > 0 && (
                <button
                  type="button"
                  onClick={() => addEstimateItems(picked)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Plus size={14} />
                  Add {picked.length} to meal
                </button>
              )}

              {showCorrection ? (
                <div className="mt-2 border-t border-border pt-2">
                  <label
                    htmlFor="meal-correction"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    What is it really? The AI will estimate again.
                  </label>
                  <textarea
                    id="meal-correction"
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    rows={2}
                    placeholder="No, this is nasi ayam"
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => handleEstimate(correction)}
                    disabled={loading || !correction.trim()}
                    className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    Re-analyze with my note
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCorrection(true)}
                  className="mt-2 text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  That doesn’t look right
                </button>
              )}
            </div>
          )}

          <div className="mt-3">
            <label
              htmlFor="logged-kcal"
              className="text-xs font-medium text-muted-foreground"
            >
              Calories (kcal)
            </label>
            <input
              id="logged-kcal"
              type="number"
              inputMode="decimal"
              min={0}
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              placeholder="0"
              className="tabular mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {numbersChanged && linkedItem && (
              <button
                type="button"
                onClick={() => {
                  setKcal(String(linkedItem.calories))
                  setProtein(String(linkedItem.protein_g))
                  setCarbs(String(linkedItem.carbs_g))
                  setFat(String(linkedItem.fat_g))
                }}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw size={11} />
                Reset to AI values
              </button>
            )}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              { label: "Protein", value: protein, set: setProtein },
              { label: "Carbs", value: carbs, set: setCarbs },
              { label: "Fat", value: fat, set: setFat },
            ] as const).map((macro) => (
              <label key={macro.label} className="block">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {macro.label} (g)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={macro.value}
                  onChange={(e) => macro.set(e.target.value)}
                  placeholder="0"
                  className="tabular mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-error">{error}</p>}

          <button
            type="button"
            onClick={handleAddItem}
            disabled={!name.trim() && !linkedItem}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={15} />
            {isEditing ? "Update food" : "Add to meal"}
          </button>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="tabular text-sm text-muted-foreground">
          {items.length} food{items.length === 1 ? "" : "s"} · {totalCalories}{" "}
          kcal
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!items.length}>
            Save to log
          </Button>
        </div>
      </div>
    </Modal>
  )
}
